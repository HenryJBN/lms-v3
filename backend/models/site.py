from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Column, JSON, Relationship
import uuid

class Site(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    subdomain: str = Field(index=True, unique=True)
    custom_domain: Optional[str] = Field(default=None, index=True)
    name: str
    logo_url: Optional[str] = None
    theme_config: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    owner_id: uuid.UUID
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships will be added as other models are defined
