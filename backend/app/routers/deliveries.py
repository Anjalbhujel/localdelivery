from dataclasses import asdict
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, func, select, update
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import DeliveryRequest, DeliveryStatus, Payment, User, UserRole
from ..pricing import get_quote
from ..schemas import DeliveryCreate, DeliveryOut, DeliveryStats, QuoteOut
from ..security import get_current_user

router = APIRouter(prefix="/deliveries", tags=["deliveries"])


def to_out(delivery: DeliveryRequest, price: Decimal) -> DeliveryOut:
    return DeliveryOut(
        id=delivery.id,
        pickup_location=delivery.pickup_location,
        pickup_contact_name=delivery.pickup_contact_name,
        drop_location=delivery.drop_location,
        drop_contact_name=delivery.drop_contact_name,
        package_details=delivery.package_details,
        package_size=delivery.package_size,
        package_weight_kg=delivery.package_weight_kg,
        status=delivery.status,
        created_at=delivery.created_at,
        price=price,
    )


@router.get("/quote", response_model=QuoteOut)
def quote(
    size: Literal["small", "medium", "large"] = "small",
    current_user: User = Depends(get_current_user),
):
    return QuoteOut(**asdict(get_quote(size)))


@router.post("", response_model=DeliveryOut, status_code=status.HTTP_201_CREATED)
def create_delivery(
    data: DeliveryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.customer:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only customers can post deliveries"
        )

    if data.customer_phone:
        current_user.phone = data.customer_phone
    elif not current_user.phone:
        raise HTTPException(422, "Add a phone number so the rider can reach you")

    price = get_quote(data.package_size)

    delivery = DeliveryRequest(
        customer_id=current_user.id,
        pickup_location=data.pickup_location,
        pickup_contact_name=data.pickup_contact_name,
        drop_location=data.drop_location,
        drop_contact_name=data.drop_contact_name,
        package_details=data.package_details,
        package_size=data.package_size,
        package_weight_kg=data.package_weight_kg,
        rider_payout=price.rider_payout,
    )
    db.add(delivery)
    db.flush()

    db.add(Payment(delivery_request_id=delivery.id, amount=price.total))

    db.commit()
    db.refresh(delivery)
    return to_out(delivery, price.total)


@router.get("/stats", response_model=DeliveryStats)
def delivery_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    on_the_way = [DeliveryStatus.accepted, DeliveryStatus.picked_up]
    delivered = DeliveryRequest.status == DeliveryStatus.delivered

    row = db.execute(
        select(
            func.count(DeliveryRequest.id),
            func.count(case((DeliveryRequest.status.in_(on_the_way), 1))),
            func.count(case((delivered, 1))),
            func.sum(case((delivered, Payment.amount))),
        )
        .select_from(DeliveryRequest)
        .join(Payment, Payment.delivery_request_id == DeliveryRequest.id)
        .where(DeliveryRequest.customer_id == current_user.id)
    ).one()

    return DeliveryStats(
        posted=row[0],
        on_the_way=row[1],
        delivered=row[2],
        total_spend=row[3] or Decimal("0.00"),
    )


@router.get("", response_model=list[DeliveryOut])
def list_deliveries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = db.execute(
        select(DeliveryRequest, Payment.amount)
        .join(Payment, Payment.delivery_request_id == DeliveryRequest.id)
        .where(DeliveryRequest.customer_id == current_user.id)
        .order_by(DeliveryRequest.created_at.desc())
    ).all()

    return [to_out(delivery, amount) for delivery, amount in rows]

@router.post("/{delivery_id}/cancel", response_model=DeliveryOut)
def cancel_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = db.execute(
        update(DeliveryRequest)
        .where(
            DeliveryRequest.id == delivery_id,
            DeliveryRequest.customer_id == current_user.id,
            DeliveryRequest.status == DeliveryStatus.pending,
        )
        .values(status=DeliveryStatus.cancelled)
    )
    db.commit()

    row = db.execute(
        select(DeliveryRequest, Payment.amount)
        .join(Payment, Payment.delivery_request_id == DeliveryRequest.id)
        .where(
            DeliveryRequest.id == delivery_id,
            DeliveryRequest.customer_id == current_user.id,
        )
    ).first()

    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Delivery not found")
    if result.rowcount == 0:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Only requests that are still waiting for a rider can be cancelled",
        )

    delivery, amount = row
    return to_out(delivery, amount)