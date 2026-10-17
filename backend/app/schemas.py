from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from .models import AccountStatus, UserRole

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=8, max_lenght=72)

class UserLogin(BaseModel):
    email: str
    password: str
    
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role: UserRole
    account_status: AccountStatus
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"