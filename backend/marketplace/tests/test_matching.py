"""Unit tests for braider recommendations (availability / rating / price /
experience)."""

from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase

from marketplace import matching
from marketplace.models import BraiderProfile, BraidStyle, Listing, Review


def make_braider(username, years, days, price, style, rating=None):
    user = User.objects.create_user(username=username, password="<redacted>")
    profile = BraiderProfile.objects.create(
        user=user, display_name=username, years_experience=years, available_days=days
    )
    Listing.objects.create(
        braider=profile, style=style, title=f"{style.name} by {username}",
        price=price, duration_minutes=180,
    )
    if rating is not None:
        from marketplace.models import Booking, ClientProfile

        client_user = User.objects.create_user(username=f"client-{username}", password="<redacted>")
        client = ClientProfile.objects.create(user=client_user, display_name="C")
        listing = profile.listings.first()
        booking = Booking.objects.create(
            client=client, listing=listing, braider=profile,
            date=date(2026, 11, 7), start_time="10:00", status="completed",
        )
        Review.objects.create(booking=booking, client=client, braider=profile, rating=rating)
    return profile


class MatchingTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.style = BraidStyle.objects.create(name="knotless braids")

    def test_availability_on_the_day_beats_not(self):
        saturday = date(2026, 11, 7)  # a Saturday
        free = make_braider("free", 1, ["sat"], 80, self.style)
        busy = make_braider("busy", 1, ["mon"], 80, self.style)
        _, free_break, _ = matching.score_braider_for_request(free, self.style, saturday, 80)
        _, busy_break, _ = matching.score_braider_for_request(busy, self.style, saturday, 80)
        self.assertEqual(free_break["availability"], 40)
        self.assertEqual(busy_break["availability"], 0)

    def test_no_reviews_is_neutral_not_zero(self):
        saturday = date(2026, 11, 7)
        braider = make_braider("newbie", 0, [], 80, self.style)
        score, breakdown, _ = matching.score_braider_for_request(braider, self.style, saturday, 80)
        self.assertEqual(breakdown["rating"], 15)
        self.assertEqual(breakdown["availability"], 20)
        self.assertEqual(score, 20 + 15 + 20 + 0)

    def test_five_star_rating_beats_unrated(self):
        saturday = date(2026, 11, 7)
        rated = make_braider("rated", 0, ["sat"], 80, self.style, rating=5)
        unrated = make_braider("unrated", 0, ["sat"], 80, self.style)
        rated_score, _, _ = matching.score_braider_for_request(rated, self.style, saturday, 80)
        unrated_score, _, _ = matching.score_braider_for_request(unrated, self.style, saturday, 80)
        self.assertGreater(rated_score, unrated_score)

    def test_cheaper_listing_wins_on_price(self):
        saturday = date(2026, 11, 7)
        cheap = make_braider("cheap", 0, ["sat"], 60, self.style)
        pricey = make_braider("pricey", 0, ["sat"], 120, self.style)
        ranked = matching.ranked_braiders_for_request(self.style, saturday)
        self.assertEqual(ranked[0][0], cheap)
        self.assertEqual(ranked[-1][0], pricey)

    def test_max_price_filters(self):
        make_braider("cheap2", 0, ["sat"], 60, self.style)
        make_braider("pricey2", 0, ["sat"], 120, self.style)
        ranked = matching.ranked_braiders_for_request(self.style, max_price=70)
        self.assertEqual(len(ranked), 1)
        self.assertEqual(ranked[0][0].display_name, "cheap2")

    def test_braider_without_the_style_is_not_ranked(self):
        other = BraidStyle.objects.create(name="cornrows")
        make_braider("cornrow-only", 0, ["sat"], 50, other)
        ranked = matching.ranked_braiders_for_request(self.style)
        self.assertEqual(ranked, [])
