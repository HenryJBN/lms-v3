import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.gamification import TokenBalance, TokenTransaction
from database.session import engine # Fallback for non-dep calls if needed, but better to pass

async def award_tokens(
    user_id: uuid.UUID,
    amount: float,
    description: str,
    session: AsyncSession,
    site_id: uuid.UUID,
    reference_type: Optional[str] = None,
    reference_id: Optional[uuid.UUID] = None,
    metadata: Optional[dict] = None
) -> dict:
    import logging
    logger = logging.getLogger(__name__)
    """Award tokens to a user and create transaction record"""
    try:
        logger.info(f"AWARDING TOKENS: {amount} to {user_id} site {site_id}")
        # Get or create balance
        query = select(TokenBalance).where(
            TokenBalance.user_id == user_id,
            TokenBalance.site_id == site_id
        )
        result = await session.exec(query)
        balance = result.first()
        
        if not balance:
            balance = TokenBalance(user_id=user_id, balance=0.0, site_id=site_id)
            session.add(balance)
        
        balance.balance += amount
        balance.updated_at = datetime.utcnow()
        session.add(balance)
        
        # Create transaction record
        transaction = TokenTransaction(
            user_id=user_id,
            amount=amount,
            transaction_type="credit",
            balance_after=balance.balance,
            description=description,
            reference_type=reference_type,
            reference_id=reference_id,
            site_id=site_id,
            metadata_json=metadata or {}
        )
        session.add(transaction)
        await session.flush(); logger.info("DEBUG: FLUSH SUCCESS"); await session.commit()
        await session.refresh(transaction)
        logger.info(f"DEBUG: TOKEN OP SUCCESS {balance.balance}")        
        return {
            "success": True,
            "transaction_id": transaction.id,
            "amount": amount,
            "new_balance": balance.balance,
            "description": description
        }
        
    except Exception as e:
        await session.rollback()
        import sys
        logger.error(f"CRITICAL TOKEN AWARD FAILURE: {e}")
        return {
            "success": False,
            "error": str(e)
        }

async def spend_tokens(
    user_id: uuid.UUID,
    amount: float,
    description: str,
    session: AsyncSession,
    site_id: uuid.UUID,
    reference_type: Optional[str] = None,
    reference_id: Optional[uuid.UUID] = None,
    metadata: Optional[dict] = None
) -> dict:
    """Spend tokens from user balance"""
    try:
        # Get balance
        query = select(TokenBalance).where(
            TokenBalance.user_id == user_id,
            TokenBalance.site_id == site_id
        )
        result = await session.exec(query)
        balance = result.first()
        
        if not balance or balance.balance < amount:
            return {
                "success": False,
                "error": "Insufficient token balance"
            }
        
        balance.balance -= amount
        balance.updated_at = datetime.utcnow()
        session.add(balance)
        
        # Create transaction record
        transaction = TokenTransaction(
            user_id=user_id,
            amount=-amount,
            transaction_type="debit",
            balance_after=balance.balance,
            description=description,
            reference_type=reference_type,
            reference_id=reference_id,
            site_id=site_id,
            metadata_json=metadata or {}
        )
        session.add(transaction)
        await session.flush(); logger.info("DEBUG: FLUSH SUCCESS"); await session.commit()
        await session.refresh(transaction)
        logger.info(f"DEBUG: TOKEN OP SUCCESS {balance.balance}")        
        return {
            "success": True,
            "transaction_id": transaction.id,
            "amount": amount,
            "new_balance": balance.balance,
            "description": description
        }
        
    except Exception as e:
        await session.rollback()
        print(f"Token spending failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }

async def get_token_balance(user_id: uuid.UUID, session: AsyncSession, site_id: uuid.UUID) -> dict:
    """Get user's current token balance"""
    try:
        query = select(TokenBalance).where(
            TokenBalance.user_id == user_id,
            TokenBalance.site_id == site_id
        )
        result = await session.exec(query)
        balance = result.first()
        
        if not balance:
            balance = TokenBalance(user_id=user_id, balance=0.0, site_id=site_id)
            session.add(balance)
            await session.flush(); logger.info("DEBUG: FLUSH SUCCESS"); await session.commit()
            await session.refresh(balance)
        
        return {
            "balance": balance.balance,
            "last_updated": balance.updated_at
        }
        
    except Exception as e:
        print(f"Failed to get token balance: {e}")
        return {
            "balance": 0.0,
            "last_updated": None
        }

async def transfer_tokens(
    from_user_id: uuid.UUID,
    to_user_id: uuid.UUID,
    amount: float,
    description: str,
    session: AsyncSession,
    site_id: uuid.UUID
) -> dict:
    """Transfer tokens between users"""
    try:
        # Spend from sender
        spend_result = await spend_tokens(
            user_id=from_user_id,
            amount=amount,
            description=f"Transfer to user: {description}",
            session=session,
            site_id=site_id,
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
            session=session,
            site_id=site_id,
            reference_type="transfer_in",
            reference_id=from_user_id
        )
        
        if not award_result["success"]:
            # Rollback sender transaction (simplified - in production use real rollback)
            await award_tokens(
                user_id=from_user_id,
                amount=amount,
                description=f"Rollback failed transfer: {description}",
                session=session,
                site_id=site_id,
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
