from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid

from database.connection import database
from models.schemas import (
    UserResponse, UserUpdate, UserProfile, TokenBalance, 
    TokenTransaction, PaginationParams, PaginatedResponse
)
from middleware.auth import get_current_active_user, require_admin

router = APIRouter()

@router.get("/me")
async def get_current_user_profile(current_user=Depends(get_current_active_user)):
    try:
        if not current_user:
            return {"success": False, "error": "User not found"}

        return {"success": True, "data": current_user}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.put("/me")
async def update_current_user(
    user_update: UserUpdate,
    current_user=Depends(get_current_active_user)
):
    try:
        update_fields = []
        values = {"user_id": current_user.id}

        for field, value in user_update.dict(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field} = :{field}")
                values[field] = value

        if not update_fields:
            # No update requested — just return current user
            return {"success": True, "data": current_user}

        query = f"""
            UPDATE users 
            SET {', '.join(update_fields)}, updated_at = NOW()
            WHERE id = :user_id
            RETURNING *
        """

        updated_user = await database.fetch_one(query, values=values)

        if not updated_user:
            return {"success": False, "error": "User not found"}

        return {"success": True, "data": updated_user}

    except Exception as e:
        # Catch any database or logic errors
        return {"success": False, "error": str(e)}

@router.get("/me/profile", response_model=UserProfile)
async def get_user_profile(current_user = Depends(get_current_active_user)):
    query = "SELECT * FROM user_profiles WHERE user_id = :user_id"
    profile = await database.fetch_one(query, values={"user_id": current_user.id})
    
    if not profile:
        # Create empty profile if it doesn't exist
        create_query = """
            INSERT INTO user_profiles (user_id) VALUES (:user_id) RETURNING *
        """
        profile = await database.fetch_one(create_query, values={"user_id": current_user.id})
    
    return UserProfile(**profile)

@router.put("/me/profile", response_model=UserProfile)
async def update_user_profile(
    profile_update: UserProfile,
    current_user = Depends(get_current_active_user)
):
    # Check if profile exists
    check_query = "SELECT id FROM user_profiles WHERE user_id = :user_id"
    existing_profile = await database.fetch_one(check_query, values={"user_id": current_user.id})
    
    update_fields = []
    values = {"user_id": current_user.id}
    
    for field, value in profile_update.dict(exclude_unset=True).items():
        if value is not None:
            update_fields.append(f"{field} = :{field}")
            values[field] = value
    
    if existing_profile:
        # Update existing profile
        if update_fields:
            query = f"""
                UPDATE user_profiles 
                SET {', '.join(update_fields)}, updated_at = NOW()
                WHERE user_id = :user_id
                RETURNING *
            """
            updated_profile = await database.fetch_one(query, values=values)
        else:
            query = "SELECT * FROM user_profiles WHERE user_id = :user_id"
            updated_profile = await database.fetch_one(query, values={"user_id": current_user.id})
    else:
        # Create new profile
        create_fields = ["user_id"] + list(profile_update.dict(exclude_unset=True).keys())
        create_values = [":user_id"] + [f":{field}" for field in profile_update.dict(exclude_unset=True).keys()]
        
        query = f"""
            INSERT INTO user_profiles ({', '.join(create_fields)})
            VALUES ({', '.join(create_values)})
            RETURNING *
        """
        updated_profile = await database.fetch_one(query, values=values)
    
    return UserProfile(**updated_profile)

@router.get("/me/tokens", response_model=TokenBalance)
async def get_token_balance(current_user = Depends(get_current_active_user)):
    query = "SELECT * FROM l_tokens WHERE user_id = :user_id"
    balance = await database.fetch_one(query, values={"user_id": current_user.id})
    
    if not balance:
        # Initialize token balance if it doesn't exist
        create_query = """
            INSERT INTO l_tokens (user_id, balance, total_earned, total_spent)
            VALUES (:user_id, 0, 0, 0)
            RETURNING *
        """
        balance = await database.fetch_one(create_query, values={"user_id": current_user.id})
    
    return TokenBalance(**balance)

@router.get("/me/tokens/transactions", response_model=List[TokenTransaction])
async def get_token_transactions(
    current_user = Depends(get_current_active_user),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100)
):
    offset = (page - 1) * size
    
    query = """
        SELECT * FROM token_transactions 
        WHERE user_id = :user_id 
        ORDER BY created_at DESC 
        LIMIT :size OFFSET :offset
    """
    
    transactions = await database.fetch_all(query, values={
        "user_id": current_user.id,
        "size": size,
        "offset": offset
    })
    
    return [TokenTransaction(**transaction) for transaction in transactions]

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    # Users can only view their own profile unless they're admin
    if current_user.role != "admin" and str(current_user.id) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user"
        )
    
    query = "SELECT * FROM users WHERE id = :user_id"
    user = await database.fetch_one(query, values={"user_id": user_id})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(**user)

@router.get("/", response_model=PaginatedResponse)
async def get_users(
    pagination: PaginationParams = Depends(),
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user = Depends(require_admin)
):
    # Build query with filters
    where_conditions = []
    values = {"size": pagination.size, "offset": (pagination.page - 1) * pagination.size}
    
    if role:
        where_conditions.append("role = :role")
        values["role"] = role
    
    if status:
        where_conditions.append("status = :status")
        values["status"] = status
    
    if search:
        where_conditions.append("""
            (first_name ILIKE :search OR last_name ILIKE :search OR 
             email ILIKE :search OR username ILIKE :search)
        """)
        values["search"] = f"%{search}%"
    
    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
    
    # Get total count
    count_query = f"SELECT COUNT(*) as total FROM users {where_clause}"
    total_result = await database.fetch_one(count_query, values=values)
    total = total_result.total
    
    # Get users
    query = f"""
        SELECT * FROM users {where_clause}
        ORDER BY created_at DESC
        LIMIT :size OFFSET :offset
    """
    
    users = await database.fetch_all(query, values=values)
    
    return PaginatedResponse(
        items=[UserResponse(**user) for user in users],
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )

@router.put("/{user_id}/status")
async def update_user_status(
    user_id: uuid.UUID,
    status: str,
    current_user = Depends(require_admin)
):
    if status not in ["active", "inactive", "suspended"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status"
        )
    
    query = """
        UPDATE users SET status = :status, updated_at = NOW()
        WHERE id = :user_id
        RETURNING *
    """
    
    updated_user = await database.fetch_one(query, values={
        "status": status,
        "user_id": user_id
    })
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Log admin action
    log_query = """
        INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, description)
        VALUES (:admin_id, :action, 'user', :target_id, :description)
    """
    
    await database.execute(log_query, values={
        "admin_id": current_user.id,
        "action": f"user_{status}",
        "target_id": user_id,
        "description": f"Changed user status to {status}"
    })
    
    return {"message": f"User status updated to {status}"}

@router.delete("/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    current_user = Depends(require_admin)
):
    # Check if user exists
    check_query = "SELECT id FROM users WHERE id = :user_id"
    user = await database.fetch_one(check_query, values={"user_id": user_id})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Soft delete by updating status
    query = """
        UPDATE users SET status = 'inactive', updated_at = NOW()
        WHERE id = :user_id
    """
    
    await database.execute(query, values={"user_id": user_id})
    
    # Log admin action
    log_query = """
        INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, description)
        VALUES (:admin_id, 'user_deleted', 'user', :target_id, 'User account deactivated')
    """
    
    await database.execute(log_query, values={
        "admin_id": current_user.id,
        "target_id": user_id
    })
    
    return {"message": "User deleted successfully"}
