from decimal import Decimal

PRICES = {
    "small": Decimal("3.00"),
    "medium": Decimal("5.00"),
    "large": Decimal("8.00"),
}


def get_price(size: str) -> Decimal:
    return PRICES[size]