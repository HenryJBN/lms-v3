from typing import Optional
from datetime import datetime
import uuid
from sqlmodel import SQLModel, Field

class TokenBalance(SQLModel, table=True):
    __tablename__ = "token_balances"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, unique=True)
    balance: float = Field(default=0.0)
    
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TokenTransaction(SQLModel, table=True):
    __tablename__ = "token_transactions"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    
    amount: float
    transaction_type: str # credit, debit
    description: Optional[str] = None
    
    reference_type: Optional[str] = None # course_completed, lesson_completed, etc.
    reference_id: Optional[uuid.UUID] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
