"""Core models for Kormo Mela — a braiding-services marketplace for Black
women on campus.

Two sides, synced through bookings:
- BraiderProfile: a student braider offering braid styles as listings.
- ClientProfile: a client looking for a braider.

A braider publishes one Listing per style offering (style + price +
duration). A client books a listing for a date/time; the braider accepts
or declines; after a completed booking the client may leave one Review.

Seed/demo accounts are flagged ``is_demo`` on the braider profile so the
frontend can badge them "Demo profile". No real people are seeded.
"""

from django.contrib.auth.models import User
from django.db import models

ROLE_CHOICES = [
    ("braider", "Braider"),
    ("client", "Client"),
]

BOOKING_STATUS_CHOICES = [
    ("requested", "Requested"),
    ("accepted", "Accepted"),
    ("declined", "Declined"),
    ("completed", "Completed"),
    ("cancelled", "Cancelled"),
]

WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

CAMPUS_AREAS = [
    ("north", "North Campus"),
    ("west", "West Campus"),
    ("south", "South Campus"),
    ("collegetown", "Collegetown"),
    ("east", "East Campus"),
    ("off_campus", "Off Campus"),
]


class BraidStyle(models.Model):
    """A braid style clients can search for, e.g. 'knotless braids'."""

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    typical_duration_minutes = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class BraiderProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="braider_profile")
    display_name = models.CharField(max_length=120, blank=True)
    bio = models.TextField(blank=True)
    campus_area = models.CharField(max_length=20, choices=CAMPUS_AREAS, blank=True)
    # Free-text detail, e.g. a dorm or building clients should meet at.
    location_detail = models.CharField(max_length=160, blank=True)
    instagram = models.CharField(max_length=120, blank=True)
    years_experience = models.PositiveIntegerField(default=0)
    # e.g. ["fri", "sat", "sun"] plus an optional daily window.
    available_days = models.JSONField(default=list, blank=True)
    available_start_time = models.TimeField(null=True, blank=True)
    available_end_time = models.TimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    # True for seeded demo accounts; the frontend badges these "Demo profile".
    is_demo = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["display_name"]

    def __str__(self):
        return self.display_name or self.user.username

    @property
    def role(self):
        return "braider"

    @property
    def average_rating(self):
        from django.db.models import Avg

        result = self.reviews.aggregate(avg=Avg("rating"))["avg"]
        return round(result, 1) if result is not None else None

    @property
    def review_count(self):
        return self.reviews.count()


class ClientProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="client_profile")
    display_name = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.display_name or self.user.username

    @property
    def role(self):
        return "client"


class Listing(models.Model):
    """One braider's offering of one style: price + how long it takes."""

    braider = models.ForeignKey(BraiderProfile, on_delete=models.CASCADE, related_name="listings")
    style = models.ForeignKey(BraidStyle, on_delete=models.CASCADE, related_name="listings")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    duration_minutes = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["price", "-created_at"]

    def __str__(self):
        return f"{self.title} — {self.braider} (${self.price})"


class Booking(models.Model):
    client = models.ForeignKey(ClientProfile, on_delete=models.CASCADE, related_name="bookings")
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="bookings")
    braider = models.ForeignKey(BraiderProfile, on_delete=models.CASCADE, related_name="bookings")
    date = models.DateField()
    start_time = models.TimeField()
    status = models.CharField(max_length=20, choices=BOOKING_STATUS_CHOICES, default="requested")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.client} -> {self.listing} on {self.date} ({self.status})"

    @property
    def duration_minutes(self):
        return self.listing.duration_minutes

    @property
    def price(self):
        return self.listing.price


class Review(models.Model):
    """One review per completed booking, left by the client."""

    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="review")
    client = models.ForeignKey(ClientProfile, on_delete=models.CASCADE, related_name="reviews_given")
    braider = models.ForeignKey(BraiderProfile, on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.rating}/5 for {self.braider} by {self.client}"
