from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import DeliveryRequest, DeliveryStatus, Payment, User, UserRole
from ..pricing import get_price
from ..schemas import DeliveryCreate, DeliveryOut, DeliveryStats
from ..security import get_current_user

router = APIRouter(prefix="/deliveries", tags=["deliveries"])


def to_out(delivery: DeliveryRequest, price) -> DeliveryOut:
    return DeliveryOut(
        id=delivery.id,
        pickup_location=delivery.pickup_location,
        drop_location=delivery.drop_location,
        package_details=delivery.package_details,
        package_size=delivery.package_size,
        status=delivery.status,
        created_at=delivery.created_at,
        price=price,
    )


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

    delivery = DeliveryRequest(
        customer_id=current_user.id,
        pickup_location=data.pickup_location,
        drop_location=data.drop_location,
        package_details=data.package_details,
        package_size=data.package_size,
    )
    db.add(delivery)
    db.flush()

    price = get_price(data.package_size)
    db.add(Payment(delivery_request_id=delivery.id, amount=price))

    db.commit()
    db.refresh(delivery)
    return to_out(delivery, price)

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