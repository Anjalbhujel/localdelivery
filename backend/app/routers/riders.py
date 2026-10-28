from datetime import timedelta
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, case, func, select, update
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    DeliveryRequest,
    DeliveryStatus,
    Payment,
    PaymentStatus,
    RiderApprovalStatus,
    RiderProfile,
    User,
    UserRole,
)
from ..schemas import (
    BoardCard,
    RiderDeliveryOut,
    RiderProfileOut,
    RiderStats,
)
from ..security import get_current_user

router = APIRouter(prefix="/rider", tags=["rider"])

URGENT_AFTER_MINUTES = 30


def require_rider(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.rider:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only riders can use this")
    return current_user


def require_approved_rider(
    db: Session = Depends(get_db),
    rider: User = Depends(require_rider),
) -> User:
    profile = db.get(RiderProfile, rider.id)
    if profile is None or profile.approval_status != RiderApprovalStatus.approved:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Your rider account is waiting for approval"
        )
    return rider


def to_rider_delivery(d: DeliveryRequest, customer: User) -> RiderDeliveryOut:
    return RiderDeliveryOut(
        id=d.id,
        status=d.status,
        pickup_location=d.pickup_location,
        pickup_contact_name=d.pickup_contact_name,
        drop_location=d.drop_location,
        drop_contact_name=d.drop_contact_name,
        package_details=d.package_details,
        package_size=d.package_size,
        package_weight_kg=d.package_weight_kg,
        payout=d.rider_payout,
        customer_name=customer.full_name,
        customer_phone=customer.phone,
        created_at=d.created_at,
        accepted_at=d.accepted_at,
        picked_up_at=d.picked_up_at,
        delivered_at=d.delivered_at,
    )


@router.get("/me", response_model=RiderProfileOut)
def rider_me(
    db: Session = Depends(get_db),
    rider: User = Depends(require_rider),
):
    profile = db.get(RiderProfile, rider.id)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Rider profile not found")
    return profile


@router.get("/stats", response_model=RiderStats)
def rider_stats(
    db: Session = Depends(get_db),
    rider: User = Depends(require_rider),
):
    delivered = DeliveryRequest.status == DeliveryStatus.delivered
    delivered_today = and_(delivered, DeliveryRequest.delivered_at >= func.current_date())
    active = [DeliveryStatus.accepted, DeliveryStatus.picked_up]

    row = db.execute(
        select(
            func.sum(case((delivered, DeliveryRequest.rider_payout))),
            func.sum(case((delivered_today, DeliveryRequest.rider_payout))),
            func.count(case((delivered, 1))),
            func.count(case((DeliveryRequest.status.in_(active), 1))),
        )
        .select_from(DeliveryRequest)
        .where(DeliveryRequest.rider_id == rider.id)
    ).one()

    return RiderStats(
        total_earned=row[0] or Decimal("0.00"),
        earned_today=row[1] or Decimal("0.00"),
        completed=row[2],
        active=row[3],
    )


@router.get("/board", response_model=list[BoardCard])
def order_board(
    db: Session = Depends(get_db),
    rider: User = Depends(require_approved_rider),
):
    urgent = (
        DeliveryRequest.created_at
        < func.now() - timedelta(minutes=URGENT_AFTER_MINUTES)
    ).label("urgent")

    rows = db.execute(
        select(DeliveryRequest, urgent)
        .where(
            DeliveryRequest.status == DeliveryStatus.pending,
            DeliveryRequest.rider_id.is_(None),
            DeliveryRequest.rider_payout.is_not(None),
        )
        .order_by(
            DeliveryRequest.rider_payout.desc(),
            DeliveryRequest.created_at.desc(),
        )
    ).all()

    return [
        BoardCard(
            id=d.id,
            pickup_location=d.pickup_location,
            drop_location=d.drop_location,
            package_details=d.package_details,
            package_size=d.package_size,
            package_weight_kg=d.package_weight_kg,
            payout=d.rider_payout,
            urgent=is_urgent,
            created_at=d.created_at,
        )
        for d, is_urgent in rows
    ]


@router.get("/deliveries", response_model=list[RiderDeliveryOut])
def my_deliveries(
    scope: Literal["active", "history"] = "active",
    db: Session = Depends(get_db),
    rider: User = Depends(require_rider),
):
    if scope == "active":
        statuses = [DeliveryStatus.accepted, DeliveryStatus.picked_up]
        newest_first = DeliveryRequest.accepted_at.desc().nulls_last()
    else:
        statuses = [DeliveryStatus.delivered]
        newest_first = DeliveryRequest.delivered_at.desc().nulls_last()

    rows = db.execute(
        select(DeliveryRequest, User)
        .join(User, User.id == DeliveryRequest.customer_id)
        .where(
            DeliveryRequest.rider_id == rider.id,
            DeliveryRequest.status.in_(statuses),
        )
        .order_by(newest_first)
    ).all()

    return [to_rider_delivery(d, customer) for d, customer in rows]


@router.post("/deliveries/{delivery_id}/accept", response_model=RiderDeliveryOut)
def accept_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),
    rider: User = Depends(require_approved_rider),
):
    result = db.execute(
        update(DeliveryRequest)
        .where(
            DeliveryRequest.id == delivery_id,
            DeliveryRequest.status == DeliveryStatus.pending,
            DeliveryRequest.rider_id.is_(None),
            DeliveryRequest.rider_payout.is_not(None),
        )
        .values(
            rider_id=rider.id,
            status=DeliveryStatus.accepted,
            accepted_at=func.now(),
        )
    )
    db.commit()

    if result.rowcount == 0:
        exists = db.scalar(
            select(DeliveryRequest.id).where(DeliveryRequest.id == delivery_id)
        )
        if exists is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Delivery not found")
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This delivery is no longer available"
        )

    delivery, customer = db.execute(
        select(DeliveryRequest, User)
        .join(User, User.id == DeliveryRequest.customer_id)
        .where(DeliveryRequest.id == delivery_id)
    ).one()
    return to_rider_delivery(delivery, customer)

def load_rider_delivery(db: Session, delivery_id: int) -> RiderDeliveryOut:
    delivery, customer = db.execute(
        select(DeliveryRequest, User)
        .join(User, User.id == DeliveryRequest.customer_id)
        .where(DeliveryRequest.id == delivery_id)
    ).one()
    return to_rider_delivery(delivery, customer)


def move_stage(
    db: Session,
    delivery_id: int,
    rider_id: int,
    expected: DeliveryStatus,
    new: DeliveryStatus,
    stamp: str,
) -> None:
    result = db.execute(
        update(DeliveryRequest)
        .where(
            DeliveryRequest.id == delivery_id,
            DeliveryRequest.rider_id == rider_id,
            DeliveryRequest.status == expected,
        )
        .values(status=new, **{stamp: func.now()})
    )

    if result.rowcount == 0:
        db.rollback()
        mine = db.scalar(
            select(DeliveryRequest.id).where(
                DeliveryRequest.id == delivery_id,
                DeliveryRequest.rider_id == rider_id,
            )
        )
        if mine is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Delivery not found")
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This delivery is not at the right stage for that action",
        )


@router.post("/deliveries/{delivery_id}/pickup", response_model=RiderDeliveryOut)
def mark_picked_up(
    delivery_id: int,
    db: Session = Depends(get_db),
    rider: User = Depends(require_approved_rider),
):
    move_stage(
        db,
        delivery_id,
        rider.id,
        expected=DeliveryStatus.accepted,
        new=DeliveryStatus.picked_up,
        stamp="picked_up_at",
    )
    db.commit()
    return load_rider_delivery(db, delivery_id)


@router.post("/deliveries/{delivery_id}/deliver", response_model=RiderDeliveryOut)
def mark_delivered(
    delivery_id: int,
    db: Session = Depends(get_db),
    rider: User = Depends(require_approved_rider),
):
    move_stage(
        db,
        delivery_id,
        rider.id,
        expected=DeliveryStatus.picked_up,
        new=DeliveryStatus.delivered,
        stamp="delivered_at",
    )
    db.execute(
        update(Payment)
        .where(Payment.delivery_request_id == delivery_id)
        .values(status=PaymentStatus.paid, paid_at=func.now())
    )
    db.commit()
    return load_rider_delivery(db, delivery_id)