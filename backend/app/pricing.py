from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

BASE_FARE = Decimal("3.50")
SERVICE_FEE_RATE = Decimal("0.22")

SIZE_SURCHARGE = {
    "small": Decimal("1.50"),
    "medium": Decimal("3.00"),
    "large": Decimal("5.00"),
}

MAX_WEIGHT_KG = {
    "small": Decimal("5"),
    "medium": Decimal("15"),
    "large": Decimal("30"),
}


@dataclass(frozen=True)
class Quote:
    base_fare: Decimal
    size_surcharge: Decimal
    service_fee: Decimal
    total: Decimal
    rider_payout: Decimal


def money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def get_quote(size: str) -> Quote:
    surcharge = SIZE_SURCHARGE[size]
    fare = BASE_FARE + surcharge
    fee = money(fare * SERVICE_FEE_RATE)
    return Quote(
        base_fare=BASE_FARE,
        size_surcharge=surcharge,
        service_fee=fee,
        total=fare + fee,
        rider_payout=fare,
    )


def get_price(size: str) -> Decimal:
    return get_quote(size).total