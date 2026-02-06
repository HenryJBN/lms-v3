from sqlmodel import SQLModel, Field
import uuid

class MultiTenantMixin(SQLModel):
    site_id: uuid.UUID = Field(foreign_key="site.id", index=True)
