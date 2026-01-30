from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid
from sqlmodel import select, text, func, cast, String
from sqlmodel.ext.asyncio.session import AsyncSession

from database.session import get_session
from dependencies import get_current_site
from models.site import Site
from models.user import User
from models.enums import UserRole, UserStatus
from schemas.user import UserResponse, UserUpdate, UserCreate, UserProfile, AdminUserResponse
from schemas.gamification import TokenBalance, TokenTransaction
from schemas.common import PaginationParams, PaginatedResponse
from middleware.auth import get_current_active_user, require_admin, get_password_hash, get_user_by_email

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
    user_data = user_update.dict(exclude_unset=True)
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

@router.get("/me/profile", response_model=UserProfile)
async def get_user_profile(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    # Check if profile exists (Raw SQL for now or text)
    query = text("SELECT * FROM user_profiles WHERE user_id = :user_id")
    result = await session.exec(query, params={"user_id": current_user.id})
    profile = result.first()
    
    if not profile:
        # Create empty profile
        create_query = text("INSERT INTO user_profiles (user_id) VALUES (:user_id)") # RETURNING * not supported in all drivers simply?
        # Let's simple insert then select
        await session.exec(create_query, params={"user_id": current_user.id})
        await session.commit()
        
        result = await session.exec(query, params={"user_id": current_user.id})
        profile = result.first()
    
    return UserProfile(**dict(profile))

@router.put("/me/profile", response_model=UserProfile)
async def update_user_profile(
    profile_update: UserProfile,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    # Check if profile exists
    query = text("SELECT * FROM user_profiles WHERE user_id = :user_id")
    result = await session.exec(query, params={"user_id": current_user.id})
    existing_profile = result.first()
    
    update_data = profile_update.dict(exclude_unset=True)
    
    if existing_profile:
        if update_data:
             # Construct dynamic UPDATE
             fields = ", ".join([f"{k} = :{k}" for k in update_data.keys()])
             update_query = text(f"UPDATE user_profiles SET {fields}, updated_at = NOW() WHERE user_id = :user_id")
             params = {**update_data, "user_id": current_user.id}
             await session.exec(update_query, params=params)
             await session.commit()
    else:
         # Create
         create_fields = ["user_id"] + list(update_data.keys())
         create_placeholders = [":user_id"] + [f":{k}" for k in update_data.keys()]
         insert_query = text(f"INSERT INTO user_profiles ({', '.join(create_fields)}) VALUES ({', '.join(create_placeholders)})")
         params = {**update_data, "user_id": current_user.id}
         await session.exec(insert_query, params=params)
         await session.commit()
         
    # Fetch updated
    result = await session.exec(query, params={"user_id": current_user.id})
    updated_profile = result.first()
    return UserProfile(**dict(updated_profile))

@router.get("/me/tokens", response_model=TokenBalance)
async def get_token_balance(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    query = text("SELECT * FROM l_tokens WHERE user_id = :user_id")
    result = await session.exec(query, params={"user_id": current_user.id})
    balance = result.first()
    
    if not balance:
        await session.exec(text("INSERT INTO l_tokens (user_id, balance, total_earned, total_spent) VALUES (:user_id, 0, 0, 0)"), params={"user_id": current_user.id})
        await session.commit()
        result = await session.exec(query, params={"user_id": current_user.id})
        balance = result.first()
        
    return TokenBalance(**dict(balance))

@router.get("/me/tokens/transactions", response_model=List[TokenTransaction])
async def get_token_transactions(
    current_user: User = Depends(get_current_active_user),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session)
):
    offset = (page - 1) * size
    query = text("SELECT * FROM token_transactions WHERE user_id = :user_id ORDER BY created_at DESC LIMIT :size OFFSET :offset")
    result = await session.exec(query, params={"user_id": current_user.id, "size": size, "offset": offset})
    transactions = result.all()
    
    return [TokenTransaction(**dict(t)) for t in transactions]

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

    # Get users with aggregations
    # Aggregations for AdminUserResponse: total_enrollments, completed_courses, token_balance
    # This involves complex join which might be hard in pure SQLModel select(...)
    # We can use text() for the complex query but inject site_id parameter.
    
    offset = (pagination.page - 1) * pagination.size
    
    # Construct base where clause
    where_parts = ["u.site_id = :site_id"]
    params = {"site_id": current_site.id, "limit": pagination.size, "offset": offset}
    
    if role:
        where_parts.append("u.role = :role")
        params["role"] = role
    if status:
        where_parts.append("u.status = :status")
        params["status"] = status
    if search:
        where_parts.append("(u.first_name ILIKE :search OR u.last_name ILIKE :search OR u.email ILIKE :search OR u.username ILIKE :search)")
        params["search"] = f"%{search}%"
        
    where_sql = " AND ".join(where_parts)
    
    query_sql = f"""
        SELECT 
            u.*, 
            COALESCE(COUNT(e.id), 0) AS total_enrollments,
            COALESCE(SUM(CASE WHEN e.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_courses,
            COALESCE(t.balance, 0) AS token_balance
        FROM users u
        LEFT JOIN course_enrollments e ON e.user_id = u.id
        LEFT JOIN l_tokens t ON t.user_id = u.id
        WHERE {where_sql}
        GROUP BY u.id, t.balance
        ORDER BY u.created_at DESC
        LIMIT :limit OFFSET :offset
    """
    
    result = await session.exec(text(query_sql), params=params)
    users = result.all() # returns Row objects or mappings
    
    return PaginatedResponse(
        items=[AdminUserResponse(**dict(user)) for user in users],
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
    
    # Audit log (raw sql)
    log_query = text("INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, description) VALUES (:uid, :action, 'user', :tid, :desc)")
    await session.exec(log_query, params={
        "uid": current_user.id, 
        "action": f"user_{status_in}", 
        "tid": user.id, 
        "desc": f"Changed user status to {status_in}"
    })
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
    
    # Audit log (raw sql)
    log_query = text("INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, description) VALUES (:uid, 'user_deleted', 'user', :tid, 'User account deactivated')")
    await session.exec(log_query, params={
        "uid": current_user.id, 
        "tid": user.id
    })
    await session.commit()
    
    return {"message": "User deleted successfully"}
