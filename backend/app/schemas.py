from datetime import datetime
from decimal import Decimal
from typing import Literal, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from .models import AccountStatus, DeliveryStatus, UserRole

class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: Literal["customer", "rider"] = "customer"
    phone: str | None = Field(default=None, pattern=r"^[0-9+()\- ]{7,20}$")
    vehicle_type: Literal["bike", "scooter", "car"] | None = None
    area: str | None = Field(default=None, max_length=200)

    @field_validator("phone", "area", mode="before")
    @classmethod
    def blank_to_none(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @model_validator(mode="after")
    def rider_fields_required(self) -> Self:
        if self.role == "rider":
            missing = [
                name
                for name in ("phone", "vehicle_type", "area")
                if not getattr(self, name)
            ]
            if missing:
                raise ValueError(f"Riders must provide: {', '.join(missing)}")
        return self
    
class UserLogin(BaseModel):
    email: str
    
    password: str
    
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    phone: str | None
    role: UserRole
    account_status: AccountStatus
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class DeliveryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    pickup_location: str = Field(min_length=3, max_length=500)
    drop_location: str = Field(min_length=3, max_length=500)
    package_details: str = Field(min_length=3, max_length=1000)
    package_size: Literal["small", "medium", "large"] = "small"


class DeliveryOut(BaseModel):
    id: int
    pickup_location: str
    drop_location: str
    package_details: str
    package_size: str
    status: DeliveryStatus
    created_at: datetime
    price: Decimal

class DeliveryStats(BaseModel):
    posted: int
    on_the_way: int
    delivered: int
    total_spend: Decimal