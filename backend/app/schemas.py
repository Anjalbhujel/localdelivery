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

from .models import AccountStatus, DeliveryStatus, RiderApprovalStatus, UserRole
from .pricing import MAX_WEIGHT_KG

PHONE_PATTERN = r"^[0-9+()\- ]{7,20}$"

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
    pickup_contact_name: str = Field(min_length=2, max_length=100)
    drop_location: str = Field(min_length=3, max_length=500)
    drop_contact_name: str = Field(min_length=2, max_length=100)
    package_size: Literal["small", "medium", "large"] = "small"
    package_weight_kg: Decimal = Field(gt=0, max_digits=5, decimal_places=2)
    package_details: str = Field(min_length=3, max_length=1000)
    customer_phone: str | None = Field(default=None, pattern=PHONE_PATTERN)

    @field_validator("customer_phone", mode="before")
    @classmethod
    def blank_phone_to_none(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @model_validator(mode="after")
    def weight_fits_size(self) -> Self:
        limit = MAX_WEIGHT_KG[self.package_size]
        if self.package_weight_kg > limit:
            raise ValueError(
                f"A {self.package_size} package can weigh up to {limit} kg"
            )
        return self

class DeliveryOut(BaseModel):
    id: int
    pickup_location: str
    pickup_contact_name: str | None = None
    drop_location: str
    drop_contact_name: str | None = None
    package_details: str
    package_size: str
    package_weight_kg: Decimal | None = None
    status: DeliveryStatus
    created_at: datetime
    price: Decimal

class DeliveryStats(BaseModel):
    posted: int
    on_the_way: int
    delivered: int
    total_spend: Decimal

class QuoteOut(BaseModel):
    base_fare: Decimal
    size_surcharge: Decimal
    service_fee: Decimal
    total: Decimal
    rider_payout: Decimal

class BoardCard(BaseModel):
    id: int
    pickup_location: str
    drop_location: str
    package_details: str
    package_size: str
    package_weight_kg: Decimal | None = None
    payout: Decimal
    urgent: bool
    created_at: datetime

class RiderProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    vehicle_type: str
    address: str
    approval_status: RiderApprovalStatus
    rejection_reason: str | None = None

class RiderStats(BaseModel):
    total_earned: Decimal
    earned_today: Decimal
    completed: int
    active: int

class RiderDeliveryOut(BaseModel):
    id: int
    status: DeliveryStatus
    pickup_location: str
    pickup_contact_name: str | None = None
    drop_location: str
    drop_contact_name: str | None = None
    package_details: str
    package_size: str
    package_weight_kg: Decimal | None = None
    payout: Decimal | None = None
    customer_name: str
    customer_phone: str | None = None
    created_at: datetime
    accepted_at: datetime | None = None
    picked_up_at: datetime | None = None
    delivered_at: datetime | None = None