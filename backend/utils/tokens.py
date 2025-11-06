import uuid
from typing import Optional
from datetime import datetime

from database.connection import database

async def award_tokens(
    user_id: uuid.UUID,
    amount: float,
    description: str,
    reference_type: Optional[str] = None,
    reference_id: Optional[uuid.UUID] = None,
    metadata: Optional[dict] = None
) -> dict:
    """Award tokens to a user and create transaction record"""
    
    try:
        # Get current balance
        balance_query = "SELECT balance FROM l_tokens WHERE user_id = :user_id"
        current_balance = await database.fetch_one(balance_query, values={"user_id": user_id})
        
        if not current_balance:
            # Create initial balance record
            create_balance_query = """
                INSERT INTO l_tokens (user_id, balance, total_earned, total_spent)
                VALUES (:user_id, 0, 0, 0)
            """
            await database.execute(create_balance_query, values={"user_id": user_id})
            current_balance_amount = 0.0
        else:
            current_balance_amount = float(current_balance.balance)
        
        new_balance = current_balance_amount + amount
        
        # Update balance
        update_balance_query = """
            UPDATE l_tokens 
            SET balance = :new_balance, 
                total_earned = total_earned + :amount,
                updated_at = NOW()
            WHERE user_id = :user_id
        """
        
        await database.execute(update_balance_query, values={
            "new_balance": new_balance,
            "amount": amount,
            "user_id": user_id
        })
        
        # Create transaction record
        transaction_id = uuid.uuid4()
        transaction_query = """
            INSERT INTO token_transactions (
                id, user_id, type, amount, balance_after, description,
                reference_type, reference_id, metadata
            )
            VALUES (
                :id, :user_id, 'earned', :amount, :balance_after, :description,
                :reference_type, :reference_id, :metadata
            )
            RETURNING *
        """
        
        transaction = await database.fetch_one(transaction_query, values={
            "id": transaction_id,
            "user_id": user_id,
            "amount": amount,
            "balance_after": new_balance,
            "description": description,
            "reference_type": reference_type,
            "reference_id": reference_id,
            "metadata": metadata
        })
        
        return {
            "success": True,
            "transaction_id": transaction_id,
            "amount": amount,
            "new_balance": new_balance,
            "description": description
        }
        
    except Exception as e:
        print(f"Token award failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }

async def spend_tokens(
    user_id: uuid.UUID,
    amount: float,
    description: str,
    reference_type: Optional[str] = None,
    reference_id: Optional[uuid.UUID] = None,
    metadata: Optional[dict] = None
) -> dict:
    """Spend tokens from user balance"""
    
    try:
        # Get current balance
        balance_query = "SELECT balance FROM l_tokens WHERE user_id = :user_id"
        current_balance = await database.fetch_one(balance_query, values={"user_id": user_id})
        
        if not current_balance:
            return {
                "success": False,
                "error": "No token balance found"
            }
        
        current_balance_amount = float(current_balance.balance)
        
        if current_balance_amount < amount:
            return {
                "success": False,
                "error": "Insufficient token balance"
            }
        
        new_balance = current_balance_amount - amount
        
        # Update balance
        update_balance_query = """
            UPDATE l_tokens 
            SET balance = :new_balance, 
                total_spent = total_spent + :amount,
                updated_at = NOW()
            WHERE user_id = :user_id
        """
        
        await database.execute(update_balance_query, values={
            "new_balance": new_balance,
            "amount": amount,
            "user_id": user_id
        })
        
        # Create transaction record
        transaction_id = uuid.uuid4()
        transaction_query = """
            INSERT INTO token_transactions (
                id, user_id, type, amount, balance_after, description,
                reference_type, reference_id, metadata
            )
            VALUES (
                :id, :user_id, 'spent', :amount, :balance_after, :description,
                :reference_type, :reference_id, :metadata
            )
            RETURNING *
        """
        
        transaction = await database.fetch_one(transaction_query, values={
            "id": transaction_id,
            "user_id": user_id,
            "amount": -amount,  # Negative for spending
            "balance_after": new_balance,
            "description": description,
            "reference_type": reference_type,
            "reference_id": reference_id,
            "metadata": metadata
        })
        
        return {
            "success": True,
            "transaction_id": transaction_id,
            "amount": amount,
            "new_balance": new_balance,
            "description": description
        }
        
    except Exception as e:
        print(f"Token spending failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }

async def get_token_balance(user_id: uuid.UUID) -> dict:
    """Get user's current token balance"""
    
    try:
        balance_query = """
            SELECT balance, total_earned, total_spent, updated_at
            FROM l_tokens 
            WHERE user_id = :user_id
        """
        
        balance = await database.fetch_one(balance_query, values={"user_id": user_id})
        
        if not balance:
            # Create initial balance
            create_query = """
                INSERT INTO l_tokens (user_id, balance, total_earned, total_spent)
                VALUES (:user_id, 0, 0, 0)
                RETURNING *
            """
            balance = await database.fetch_one(create_query, values={"user_id": user_id})
        
        return {
            "balance": float(balance.balance),
            "total_earned": float(balance.total_earned),
            "total_spent": float(balance.total_spent),
            "last_updated": balance.updated_at
        }
        
    except Exception as e:
        print(f"Failed to get token balance: {e}")
        return {
            "balance": 0.0,
            "total_earned": 0.0,
            "total_spent": 0.0,
            "last_updated": None
        }

async def transfer_tokens(
    from_user_id: uuid.UUID,
    to_user_id: uuid.UUID,
    amount: float,
    description: str
) -> dict:
    """Transfer tokens between users"""
    
    try:
        # Check sender balance
        sender_balance = await get_token_balance(from_user_id)
        
        if sender_balance["balance"] < amount:
            return {
                "success": False,
                "error": "Insufficient balance for transfer"
            }
        
        # Spend from sender
        spend_result = await spend_tokens(
            user_id=from_user_id,
            amount=amount,
            description=f"Transfer to user: {description}",
            reference_type="transfer_out",
            reference_id=to_user_id
        )
        
        if not spend_result["success"]:
            return spend_result
        
        # Award to recipient
        award_result = await award_tokens(
            user_id=to_user_id,
            amount=amount,
            description=f"Transfer from user: {description}",
            reference_type="transfer_in",
            reference_id=from_user_id
        )
        
        if not award_result["success"]:
            # Rollback sender transaction if recipient fails
            await award_tokens(
                user_id=from_user_id,
                amount=amount,
                description=f"Rollback failed transfer: {description}",
                reference_type="transfer_rollback"
            )
            return award_result
        
        return {
            "success": True,
            "amount": amount,
            "from_user": from_user_id,
            "to_user": to_user_id,
            "description": description
        }
        
    except Exception as e:
        print(f"Token transfer failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }
