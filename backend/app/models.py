import enum 
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func
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

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", create_type=False),
        default=UserRole.customer,
    )
    account_status: Mapped[AccountStatus] = mapped_column(
        Enum(AccountStatus, name="account_status", create_type=False),
        default=AccountStatus.active,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
