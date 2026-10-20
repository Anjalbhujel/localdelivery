import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class UserRole(str, enum.Enum):
    customer = "customer"
    rider = "rider"
    admin = "admin"


class AccountStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    disabled = "disabled"


class RiderApprovalStatus(str, enum.Enum):  # new
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(20))  # new
    role: Mapped[UserRole] = mapped_column(
        ENUM(UserRole, name="user_role", create_type=False),
        default=UserRole.customer,
    )
    account_status: Mapped[AccountStatus] = mapped_column(
        ENUM(AccountStatus, name="account_status", create_type=False),
        default=AccountStatus.active,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class RiderProfile(Base):  # new
    __tablename__ = "rider_profiles"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), primary_key=True, autoincrement=False
    )
    address: Mapped[str] = mapped_column(Text)
    vehicle_type: Mapped[str] = mapped_column(String(100))
    license_photo_path: Mapped[str | None] = mapped_column(String(500))
    approval_status: Mapped[RiderApprovalStatus] = mapped_column(
        ENUM(RiderApprovalStatus, name="rider_approval_status", create_type=False),
        default=RiderApprovalStatus.pending,
    )
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime)
    rejection_reason: Mapped[str | None] = mapped_column(Text)

class DeliveryStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    picked_up = "picked_up"
    delivered = "delivered"
    cancelled = "cancelled"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"


class DeliveryRequest(Base):
    __tablename__ = "delivery_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    rider_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    pickup_location: Mapped[str] = mapped_column(Text)
    drop_location: Mapped[str] = mapped_column(Text)
    package_details: Mapped[str] = mapped_column(Text)
    package_size: Mapped[str] = mapped_column(String(10), default="small")
    status: Mapped[DeliveryStatus] = mapped_column(
        ENUM(DeliveryStatus, name="delivery_status", create_type=False),
        default=DeliveryStatus.pending,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    delivery_request_id: Mapped[int] = mapped_column(
        ForeignKey("delivery_requests.id")
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    payment_method: Mapped[str] = mapped_column(String(50), default="cash")
    status: Mapped[PaymentStatus] = mapped_column(
        ENUM(PaymentStatus, name="payment_status", create_type=False),
        default=PaymentStatus.pending,
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime)