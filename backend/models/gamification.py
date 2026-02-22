from typing import Optional
from datetime import datetime
import uuid
from sqlmodel import SQLModel, Field, JSON
from models.base import MultiTenantMixin
from models.enums import TokenTransactionType

class TokenBalance(MultiTenantMixin, table=True):
    __tablename__ = "token_balances"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, unique=True)
    balance: float = Field(default=0.0)
    
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TokenTransaction(MultiTenantMixin, table=True):
    __tablename__ = "token_transactions"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    
    amount: float = Field(default=0.0)
    # Map transaction_type to 'type' column in DB
    transaction_type: TokenTransactionType = Field(sa_column_kwargs={"name": "type"}) 
    balance_after: float = Field(default=0.0)
    description: str
    
    reference_type: Optional[str] = None # course_completed, lesson_completed, etc.
    reference_id: Optional[uuid.UUID] = None
    
    metadata_json: Optional[dict] = Field(default=None, sa_column_kwargs={"name": "metadata"}, sa_type=JSON)
    transaction_hash: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        arbitrary_types_allowed = True
