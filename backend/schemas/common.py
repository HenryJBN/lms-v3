from pydantic import BaseModel, validator
from typing import List, Any, Optional, Generic, TypeVar

T = TypeVar("T")

class BaseSchema(BaseModel):
    class Config:
        from_attributes = True

class PaginationParams(BaseSchema):
    page: int = 1
    size: int = 20
    
    @validator('page')
    def validate_page(cls, v):
        if v < 1:
            raise ValueError('Page must be greater than 0')
        return v
    
    @validator('size')
    def validate_size(cls, v):
        if v < 1 or v > 1000:
            raise ValueError('Size must be between 1 and 1000')
        return v

class PaginatedResponse(BaseSchema, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int
