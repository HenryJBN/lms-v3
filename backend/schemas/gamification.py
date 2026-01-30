from typing import Optional, Dict, Any
from datetime import datetime
import uuid
from schemas.common import BaseSchema

class TokenBalance(BaseSchema):
    balance: float
    total_earned: float
    total_spent: float

class TokenTransaction(BaseSchema):
    id: uuid.UUID
    type: str
    amount: float
    balance_after: float
    description: str
    reference_type: Optional[str] = None
    reference_id: Optional[uuid.UUID] = None
    metadata: Optional[Dict[str, Any]] = None
    transaction_hash: Optional[str] = None
    created_at: datetime
