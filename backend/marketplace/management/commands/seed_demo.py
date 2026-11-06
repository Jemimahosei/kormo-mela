"""Seed demo data for the braiding marketplace.

All braiders are invented demo accounts flagged ``is_demo=True`` so the
frontend badges them "Demo profile" — no real people. Demo logins
(password ``demo1234`` for every account):

    braider_demo / braider_ada / braider_zuri (fully set-up demo braiders)
    braider_new (bare profile, for the braider signup tour)
    client_demo (has one upcoming and one completed booking)
    client_new (bare profile, for the client signup tour)

Run:  python manage.py seed_demo
"""

from datetime import time, timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from marketplace.models import (
    Booking,
    BraiderProfile,
    BraidStyle,
    ClientProfile,
    Listing,
)


def _user(username):
    user, _ = User.objects.get_or_create(username=username)
    user.set_password("demo1234")
    user.save()
    return user


@transaction.atomic
def seed():
    styles = {}
    for name, description, minutes in [
        ("knotless braids", "Feed-in braids with no knot at the root — lighter on the scalp.", 240),
        ("box braids", "The classic. Square parts, endless length options.", 210),
        ("cornrows", "Close-to-the-scalp rows, straight back or patterned.", 90),
        ("stitch braids", "Cornrows with crisp, stitched-looking parts.", 120),
        ("passion twists", "Soft, bouncy twists with a natural finish.", 180),
        ("faux locs", "Locs look without the commitment.", 240),
        ("goddess braids", "Braids with loose, curly ends woven through.", 270),
        ("two-strand twists", "Quick, versatile twists — great protective style.", 120),
    ]:
        styles[name], _ = BraidStyle.objects.get_or_create(
            name=name, defaults={"description": description, "typical_duration_minutes": minutes}
        )

    def make_braider(username, display_name, bio, campus_area, location_detail,
                     instagram, years, days, start, end, is_demo=True):
        user = _user(username)
        profile, _ = BraiderProfile.objects.get_or_create(user=user)
        profile.display_name = display_name
        profile.bio = bio
        profile.campus_area = campus_area
        profile.location_detail = location_detail
        profile.instagram = instagram
        profile.years_experience = years
        profile.available_days = days
        profile.available_start_time = start
        profile.available_end_time = end
        profile.is_active = True
        profile.is_demo = is_demo
        profile.save()
        return profile

    def make_listing(braider, style_name, title, description, price, minutes):
        listing, _ = Listing.objects.get_or_create(
            braider=braider, style=styles[style_name], title=title,
            defaults={"description": description, "price": price,
                      "duration_minutes": minutes, "is_active": True},
        )
        return listing

    ada = make_braider(
        "braider_demo", "Adaeze", "Braiding since high school — knotless is my signature.",
        "north", "North Campus — meet at my dorm lounge", "@adaeze.braids", 3,
        ["fri", "sat", "sun"], time(10, 0), time(19, 0),
    )
    ada_listings = [
        make_listing(ada, "knotless braids", "Knotless Braids — mid-back",
                     "Feed-in knotless, mid-back length. Hair included.", 85, 240),
        make_listing(ada, "box braids", "Box Braids — shoulder length",
                     "Classic box braids, shoulder length. Hair included.", 70, 210),
        make_listing(ada, "cornrows", "Cornrows — straight back",
                     "Straight-back cornrows, neat parts. No hair needed.", 45, 90),
    ]

    zuri = make_braider(
        "braider_ada", "Zuri", "Cornrow specialist. Clean parts, fast hands.",
        "collegetown", "Collegetown — my apartment near College Ave", "@zuri.styles", 2,
        ["mon", "wed", "fri", "sat"], time(11, 0), time(20, 0),
    )
    zuri_listings = [
        make_listing(zuri, "cornrows", "Cornrows — freestyle",
                     "Freestyle cornrows, any pattern you bring me.", 50, 90),
        make_listing(zuri, "stitch braids", "Stitch Braids — 6 feed-ins",
                     "Six crisp stitch braids with a straight-back finish.", 55, 120),
        make_listing(zuri, "two-strand twists", "Two-Strand Twists",
                     "Shoulder-length twists, low tension.", 50, 120),
    ]

    mariam = make_braider(
        "braider_zuri", "Mariam", "Locs and twists. I take my time and it shows.",
        "west", "West Campus", "@mariam.braids", 4,
        ["tue", "thu", "sat", "sun"], time(9, 0), time(18, 0),
    )
    mariam_listings = [
        make_listing(mariam, "faux locs", "Faux Locs — bob length",
                     "Lightweight faux locs, bob length. Hair included.", 90, 240),
        make_listing(mariam, "goddess braids", "Goddess Braids — waist length",
                     "Waist-length goddess braids with curly ends.", 95, 270),
        make_listing(mariam, "passion twists", "Passion Twists — mid-back",
                     "Soft passion twists, mid-back. Hair included.", 75, 180),
    ]

    new_braider_user = _user("braider_new")
    new_braider, _ = BraiderProfile.objects.get_or_create(user=new_braider_user)
    new_braider.display_name = "New Braider"
    new_braider.is_demo = False
    new_braider.save()

    def make_client(username, display_name):
        user = _user(username)
        profile, _ = ClientProfile.objects.get_or_create(user=user)
        profile.display_name = display_name
        profile.save()
        return profile

    client_demo = make_client("client_demo", "Demo Client")
    make_client("client_new", "New Client")

    # One upcoming accepted booking + one completed booking for the demo client.
    today = timezone.localdate()
    next_sat = today + timedelta(days=(5 - today.weekday()) % 7 or 7)
    last_sat = today - timedelta(days=(today.weekday() - 5) % 7 or 7)
    Booking.objects.get_or_create(
        client=client_demo, listing=ada_listings[0], date=next_sat, start_time=time(11, 0),
        defaults={"braider": ada, "status": "accepted", "notes": "Mid-back, black hair."},
    )
    Booking.objects.get_or_create(
        client=client_demo, listing=zuri_listings[0], date=last_sat, start_time=time(12, 0),
        defaults={"braider": zuri, "status": "completed", "notes": "Freestyle, side part."},
    )
    return {"braiders": 4, "listings": len(ada_listings) + len(zuri_listings) + len(mariam_listings)}


class Command(BaseCommand):
    help = "Seed demo braiding data (idempotent)."

    def handle(self, *args, **options):
        result = seed()
        self.stdout.write(self.style.SUCCESS(
            f"Seeded {result['braiders']} braiders and {result['listings']} listings."
        ))
