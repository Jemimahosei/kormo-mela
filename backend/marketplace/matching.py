"""Braider recommendations for a style + date request.

Score is 0-100, built from transparent components so the frontend can show
*why* a braider was recommended:

- Availability (max 40): the braider is free on the weekday of the
  requested date. A braider with no days set scores 20 (neutral).
- Rating (max 30): average review rating scaled to 30. No reviews yet
  scores 15 (neutral) instead of 0.
- Price (max 20): relative to the cheapest active listing for that style
  among the candidates — cheapest scores 20, others scale down.
- Experience (max 10): 2 points per year of experience, capped at 10.

Only braiders with an active listing for the requested style are ranked.
"""

from datetime import date as date_cls

from .models import WEEKDAYS

AVAILABILITY_WEIGHT = 40
RATING_WEIGHT = 30
PRICE_WEIGHT = 20
EXPERIENCE_WEIGHT = 10


def _weekday_key(d):
    if d is None:
        return None
    if isinstance(d, str):
        d = date_cls.fromisoformat(d)
    return WEEKDAYS[d.weekday()]


def score_braider_for_request(braider, style, requested_date=None, cheapest_price=None):
    """Return (score, breakdown dict, cheapest listing) for one braider."""
    breakdown = {}
    listings = [l for l in braider.listings.filter(style=style, is_active=True)]
    if not listings:
        return None
    cheapest = min(listings, key=lambda l: l.price)

    day = _weekday_key(requested_date)
    days = set(braider.available_days or [])
    if day is None:
        breakdown["availability"] = AVAILABILITY_WEIGHT // 2
    elif not days:
        breakdown["availability"] = AVAILABILITY_WEIGHT // 2
    elif day in days:
        breakdown["availability"] = AVAILABILITY_WEIGHT
    else:
        breakdown["availability"] = 0

    avg = braider.average_rating
    if avg is None:
        breakdown["rating"] = RATING_WEIGHT // 2
    else:
        breakdown["rating"] = round(RATING_WEIGHT * avg / 5)

    if cheapest_price:
        breakdown["price"] = round(PRICE_WEIGHT * float(cheapest_price) / float(cheapest.price))
    else:
        breakdown["price"] = PRICE_WEIGHT

    breakdown["experience"] = min(braider.years_experience, 5) * 2

    score = (
        breakdown["availability"]
        + breakdown["rating"]
        + breakdown["price"]
        + breakdown["experience"]
    )
    return score, breakdown, cheapest


def ranked_braiders_for_request(style, requested_date=None, max_price=None):
    """Braiders with an active listing for ``style``, best-first.

    Returns a list of (braider, score, breakdown, cheapest_listing) tuples.
    ``max_price`` filters out braiders whose cheapest listing is over budget.
    """
    from .models import BraiderProfile

    candidates = (
        BraiderProfile.objects.filter(is_active=True, listings__style=style, listings__is_active=True)
        .distinct()
        .prefetch_related("listings", "reviews")
    )
    priced = []
    for braider in candidates:
        listings = [l for l in braider.listings.all() if l.style_id == style.id and l.is_active]
        if not listings:
            continue
        cheapest = min(listings, key=lambda l: l.price)
        if max_price is not None and float(cheapest.price) > float(max_price):
            continue
        priced.append((braider, cheapest))
    if not priced:
        return []
    cheapest_price = min(float(c.price) for _, c in priced)
    ranked = []
    for braider, _ in priced:
        scored = score_braider_for_request(braider, style, requested_date, cheapest_price)
        if scored is None:
            continue
        score, breakdown, cheapest = scored
        ranked.append((braider, score, breakdown, cheapest))
    ranked.sort(key=lambda item: (-item[1], item[0].display_name or ""))
    return ranked
