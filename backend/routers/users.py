from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid
from sqlmodel import select, text, func, cast, String
from sqlmodel.ext.asyncio.session import AsyncSession

from database.session import get_session
from dependencies import get_current_site
from models.site import Site
from models.user import User, UserProfile
from models.gamification import TokenBalance, TokenTransaction
from models.enums import UserRole, UserStatus
from schemas.user import UserResponse, UserUpdate, UserCreate, UserProfile as UserProfileSchema, AdminUserResponse
from schemas.gamification import TokenBalance as TokenBalanceSchema, TokenTransaction as TokenTransactionSchema
from schemas.common import PaginationParams, PaginatedResponse
from middleware.auth import get_current_active_user, require_admin, get_password_hash, get_user_by_email
from models.system import AdminAuditLog

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    # Retrieve user again attached to session if needed, or attach current_user
    # current_user is already from session in get_current_user logic (if refactored properly),
    # but to be safe and allow updates, we can fetch or merge.
    # Actually get_current_user returns a User object from session.
    
    # We update fields
    updated = False
    user_data = user_update.model_dump(exclude_unset=True)
    for key, value in user_data.items():
        if value is not None:
             setattr(current_user, key, value)
             updated = True
             
    if not updated:
        return current_user
        
    current_user.updated_at = func.now() # or datetime.utcnow
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    
    return current_user

@router.get("/me/profile", response_model=UserProfileSchema)
async def get_user_profile(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(UserProfile).where(
        UserProfile.user_id == current_user.id,
        UserProfile.site_id == current_site.id
    )
    result = await session.exec(query)
    profile = result.first()
    
    if not profile:
        profile = UserProfile(user_id=current_user.id, site_id=current_site.id)
        session.add(profile)
        await session.commit()
        await session.refresh(profile)
    
    return profile

@router.put("/me/profile", response_model=UserProfileSchema)
async def update_user_profile(
    profile_update: UserProfileSchema,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(UserProfile).where(
        UserProfile.user_id == current_user.id,
        UserProfile.site_id == current_site.id
    )
    result = await session.exec(query)
    profile = result.first()
    
    if not profile:
        profile = UserProfile(user_id=current_user.id, site_id=current_site.id)
    
    update_data = profile_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)
    
    profile.updated_at = datetime.utcnow()
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    
    return profile

@router.get("/me/tokens", response_model=TokenBalanceSchema)
async def get_token_balance(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(TokenBalance).where(
        TokenBalance.user_id == current_user.id,
        TokenBalance.site_id == current_site.id
    )
    result = await session.exec(query)
    balance = result.first()
    
    if not balance:
        balance = TokenBalance(user_id=current_user.id, site_id=current_site.id, balance=0.0)
        session.add(balance)
        await session.commit()
        await session.refresh(balance)
        
    return {
        "balance": balance.balance,
        "total_earned": 0.0, # TODO: Calculate from transactions
        "total_spent": 0.0   # TODO: Calculate from transactions
    }

@router.get("/me/tokens/transactions", response_model=List[TokenTransactionSchema])
async def get_token_transactions(
    current_user: User = Depends(get_current_active_user),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(TokenTransaction).where(
        TokenTransaction.user_id == current_user.id,
        TokenTransaction.site_id == current_site.id
    ).order_by(TokenTransaction.created_at.desc()).offset((page - 1) * size).limit(size)
    
    result = await session.exec(query)
    transactions = result.all()
    
    # Transform to match schema
    return [
        {
            "id": t.id,
            "type": t.transaction_type,
            "amount": t.amount,
            "balance_after": 0.0, # Not tracked in transaction model
            "description": t.description,
            "reference_type": t.reference_type,
            "reference_id": t.reference_id,
            "created_at": t.created_at,
            "metadata": {},
            "transaction_hash": None
        }
        for t in transactions
    ]

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    if current_user.role != UserRole.admin and str(current_user.id) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user"
        )
    
    user = await session.get(User, user_id)
    if not user or user.site_id != current_site.id: # Scoped to site!
        raise HTTPException(status_code=404, detail="User not found")
        
    return user

@router.get("/", response_model=PaginatedResponse)
async def get_users(
    pagination: PaginationParams = Depends(),
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Admin User Listing Scoped to Site
    count_query = select(func.count(User.id)).where(User.site_id == current_site.id)
    if role:
        count_query = count_query.where(User.role == role)
    if status is not None: # status is Enum in model but str in query
        count_query = count_query.where(User.status == status)
    if search:
        search_fmt = f"%{search}%"
        count_query = count_query.where(
            (col(User.first_name).ilike(search_fmt)) |
            (col(User.last_name).ilike(search_fmt)) |
            (col(User.email).ilike(search_fmt)) |
            (col(User.username).ilike(search_fmt))
        )
        
    total_result = await session.exec(count_query)
    total = total_result.one()

    from models.enrollment import Enrollment
    from models.gamification import TokenBalance
    from models.enums import EnrollmentStatus
    from sqlalchemy import func, case, or_

    # Get users with aggregations
    offset = (pagination.page - 1) * pagination.size
    
    query = select(
        User,
        func.count(Enrollment.id).label("total_enrollments"),
        func.sum(case((Enrollment.status == EnrollmentStatus.completed, 1), else_=0)).label("completed_courses"),
        func.coalesce(TokenBalance.balance, 0).label("token_balance")
    ).outerjoin(
        Enrollment, User.id == Enrollment.user_id
    ).outerjoin(
        TokenBalance, User.id == TokenBalance.user_id
    ).where(
        User.site_id == current_site.id
    )

    if role:
        query = query.where(User.role == role)
    if status:
        query = query.where(User.status == status)
    if search:
        search_fmt = f"%{search}%"
        query = query.where(
            or_(
                col(User.first_name).ilike(search_fmt),
                col(User.last_name).ilike(search_fmt),
                col(User.email).ilike(search_fmt),
                col(User.username).ilike(search_fmt)
            )
        )

    query = query.group_by(User.id, TokenBalance.balance).order_by(User.created_at.desc()).limit(pagination.size).offset(offset)
    
    result = await session.exec(query)
    rows = result.all()
    
    user_list = []
    for user, total_enrollments, completed_courses, token_balance in rows:
        user_data = user.model_dump()
        user_data["total_enrollments"] = total_enrollments or 0
        user_data["completed_courses"] = completed_courses or 0
        user_data["token_balance"] = token_balance or 0.0
        user_list.append(AdminUserResponse(**user_data))
    
    return PaginatedResponse(
        items=user_list,
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )

@router.put("/{user_id}/status")
async def update_user_status(
    user_id: uuid.UUID,
    status_in: str,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    if status_in not in ["active", "inactive", "suspended"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    user = await session.get(User, user_id)
    if not user or user.site_id != current_site.id:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.status = status_in # Enum? UserStatus(status_in)
    user.updated_at = func.now()
    session.add(user)
    await session.commit()
    
    # Audit log
    new_log = AdminAuditLog(
        admin_user_id=current_user.id,
        action=f"user_{status_in}",
        target_type="user",
        target_id=user.id,
        description=f"Changed user status to {status_in}",
        site_id=current_site.id
    )
    session.add(new_log)
    await session.commit()
    
    return {"message": f"User status updated to {status_in}"}

@router.delete("/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    user = await session.get(User, user_id)
    if not user or user.site_id != current_site.id:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.status = UserStatus.inactive # Soft delete
    user.updated_at = func.now()
    session.add(user)
    await session.commit()
    
    # Audit log
    new_log = AdminAuditLog(
        admin_user_id=current_user.id,
        action="user_deleted",
        target_type="user",
        target_id=user.id,
        description="User account deactivated",
        site_id=current_site.id
    )
    session.add(new_log)
    await session.commit()
    
    return {"message": "User deleted successfully"}
