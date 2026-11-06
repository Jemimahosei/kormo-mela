"""API views for Kormo Mela — braiding marketplace.

Auth is DRF token auth: register/login return a token the client stores
and sends as ``Authorization: Token <key>``.
"""

from datetime import date as date_cls
from datetime import datetime, timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from . import matching
from .models import (
    Booking,
    BraiderProfile,
    BraidStyle,
    ClientProfile,
    Listing,
    Review,
)
from .serializers import (
    BookingSerializer,
    BraiderProfileSerializer,
    BraidStyleSerializer,
    ClientProfileSerializer,
    ListingSerializer,
    RegisterSerializer,
    ReviewSerializer,
)


def _role_and_profile(user):
    """Return (role, profile) for a user, or (None, None)."""
    if hasattr(user, "braider_profile"):
        return "braider", user.braider_profile
    if hasattr(user, "client_profile"):
        return "client", user.client_profile
    return None, None


# ---------------------------------------------------------------- auth


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    token, _ = Token.objects.get_or_create(user=user)
    role, profile = _role_and_profile(user)
    return Response(
        {"token": token.key, "username": user.username, "role": role, "profile_id": profile.id},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login(request):
    from django.contrib.auth import authenticate

    user = authenticate(
        username=request.data.get("username"), password=request.data.get("password")
    )
    if user is None:
        return Response({"detail": "Invalid username or password."}, status=status.HTTP_400_BAD_REQUEST)
    token, _ = Token.objects.get_or_create(user=user)
    role, profile = _role_and_profile(user)
    return Response(
        {"token": token.key, "username": user.username, "role": role, "profile_id": profile.id if profile else None}
    )


@api_view(["GET"])
def me(request):
    role, profile = _role_and_profile(request.user)
    data = {"username": request.user.username, "role": role, "profile_id": profile.id if profile else None}
    if role == "braider":
        data["profile"] = BraiderProfileSerializer(profile).data
    elif role == "client":
        data["profile"] = ClientProfileSerializer(profile).data
    return Response(data)


# ---------------------------------------------------------------- styles


class BraidStyleListView(generics.ListAPIView):
    queryset = BraidStyle.objects.all()
    serializer_class = BraidStyleSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


# ---------------------------------------------------------------- braiders


class BraiderListView(generics.ListAPIView):
    serializer_class = BraiderProfileSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = BraiderProfile.objects.filter(is_active=True).prefetch_related(
            "listings__style", "reviews"
        )
        style = self.request.query_params.get("style")
        campus_area = self.request.query_params.get("campus_area")
        if style:
            queryset = queryset.filter(listings__style__name__iexact=style, listings__is_active=True)
        if campus_area:
            queryset = queryset.filter(campus_area__iexact=campus_area)
        return queryset.distinct()


class BraiderDetailView(generics.RetrieveAPIView):
    queryset = BraiderProfile.objects.prefetch_related("listings__style", "reviews__client")
    serializer_class = BraiderProfileSerializer
    permission_classes = [permissions.AllowAny]


@api_view(["GET", "PUT", "PATCH"])
def my_braider_profile(request):
    role, profile = _role_and_profile(request.user)
    if role != "braider":
        return Response({"detail": "No braider profile for this user."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "GET":
        return Response(BraiderProfileSerializer(profile).data)
    serializer = BraiderProfileSerializer(profile, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(["GET", "PUT", "PATCH"])
def my_client_profile(request):
    role, profile = _role_and_profile(request.user)
    if role != "client":
        return Response({"detail": "No client profile for this user."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "GET":
        return Response(ClientProfileSerializer(profile).data)
    serializer = ClientProfileSerializer(profile, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(["GET"])
def recommended_braiders(request):
    """Braiders ranked for a style + date (+ optional budget)."""
    style_name = request.query_params.get("style")
    date_str = request.query_params.get("date")
    max_price = request.query_params.get("max_price")
    if not style_name:
        return Response({"detail": "Query param 'style' is required."}, status=status.HTTP_400_BAD_REQUEST)
    style = get_object_or_404(BraidStyle, name__iexact=style_name)
    requested_date = None
    if date_str:
        try:
            requested_date = date_cls.fromisoformat(date_str)
        except ValueError:
            return Response({"detail": "Date must be YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
    ranked = matching.ranked_braiders_for_request(style, requested_date, max_price)
    data = []
    for braider, score, breakdown, cheapest in ranked:
        item = BraiderProfileSerializer(braider).data
        item["match_score"] = score
        item["match_breakdown"] = breakdown
        item["cheapest_listing"] = ListingSerializer(cheapest).data
        data.append(item)
    return Response(data)


# ---------------------------------------------------------------- listings


class ListingListCreateView(generics.ListCreateAPIView):
    serializer_class = ListingSerializer

    def get_queryset(self):
        queryset = Listing.objects.filter(is_active=True).select_related("braider", "style")
        style = self.request.query_params.get("style")
        braider = self.request.query_params.get("braider")
        max_price = self.request.query_params.get("max_price")
        campus_area = self.request.query_params.get("campus_area")
        if style:
            queryset = queryset.filter(style__name__iexact=style)
        if braider:
            queryset = queryset.filter(braider_id=braider)
        if campus_area:
            queryset = queryset.filter(braider__campus_area__iexact=campus_area)
        if max_price:
            try:
                queryset = queryset.filter(price__lte=max_price)
            except (ValueError, TypeError):
                pass
        return queryset

    def perform_create(self, serializer):
        role, profile = _role_and_profile(self.request.user)
        if role != "braider":
            raise PermissionDenied("Only braiders can create listings.")
        serializer.save(braider=profile)


class ListingDetailView(generics.RetrieveUpdateAPIView):
    queryset = Listing.objects.select_related("braider", "style")
    serializer_class = ListingSerializer
    permission_classes = [permissions.AllowAny]

    def perform_update(self, serializer):
        listing = self.get_object()
        role, profile = _role_and_profile(self.request.user)
        if role != "braider" or listing.braider_id != profile.id:
            raise PermissionDenied("Not your listing.")
        serializer.save()


@api_view(["GET"])
def my_listings(request):
    role, profile = _role_and_profile(request.user)
    if role != "braider":
        return Response({"detail": "No braider profile for this user."}, status=status.HTTP_404_NOT_FOUND)
    listings = Listing.objects.filter(braider=profile).select_related("style")
    return Response(ListingSerializer(listings, many=True).data)


# ---------------------------------------------------------------- bookings


def _overlaps(a_start, a_end, b_start, b_end):
    return a_start < b_end and b_start < a_end


def _braider_has_conflict(braider, booking_date, start_time, duration_minutes, exclude_id=None):
    """True if the braider already has an accepted booking overlapping."""
    end = (datetime.combine(booking_date, start_time) + timedelta(minutes=duration_minutes)).time()
    busy = Booking.objects.filter(braider=braider, date=booking_date, status="accepted")
    if exclude_id:
        busy = busy.exclude(id=exclude_id)
    for other in busy.select_related("listing"):
        other_end = (
            datetime.combine(other.date, other.start_time)
            + timedelta(minutes=other.listing.duration_minutes)
        ).time()
        if _overlaps(start_time, end, other.start_time, other_end):
            return True
    return False


@api_view(["GET", "POST"])
def bookings(request):
    role, profile = _role_and_profile(request.user)
    if request.method == "GET":
        if role == "client":
            qs = Booking.objects.filter(client=profile)
        elif role == "braider":
            qs = Booking.objects.filter(braider=profile)
        else:
            return Response({"detail": "No profile for this user."}, status=status.HTTP_404_NOT_FOUND)
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        qs = qs.select_related("listing__style", "braider", "client")
        return Response(BookingSerializer(qs, many=True).data)

    # POST: client requests a booking for a listing.
    if role != "client":
        return Response({"detail": "Only clients can request bookings."}, status=status.HTTP_403_FORBIDDEN)
    listing = get_object_or_404(Listing, id=request.data.get("listing"))
    if not listing.is_active or not listing.braider.is_active:
        return Response({"detail": "That listing is not available."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        booking_date = date_cls.fromisoformat(request.data.get("date", ""))
        start_time = datetime.strptime(request.data.get("start_time", ""), "%H:%M").time()
    except (ValueError, TypeError):
        return Response(
            {"detail": "Provide date as YYYY-MM-DD and start_time as HH:MM."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if booking_date < timezone.localdate():
        return Response({"detail": "Booking date cannot be in the past."}, status=status.HTTP_400_BAD_REQUEST)
    if _braider_has_conflict(listing.braider, booking_date, start_time, listing.duration_minutes):
        return Response(
            {"detail": "The braider already has a booking at that time."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    serializer = BookingSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    booking = serializer.save(client=profile, braider=listing.braider, status="requested")
    return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def booking_detail(request, booking_id):
    role, profile = _role_and_profile(request.user)
    booking = get_object_or_404(Booking, id=booking_id)
    if role == "client" and booking.client_id != profile.id:
        return Response({"detail": "Not your booking."}, status=status.HTTP_403_FORBIDDEN)
    if role == "braider" and booking.braider_id != profile.id:
        return Response({"detail": "Not your booking."}, status=status.HTTP_403_FORBIDDEN)
    if role not in ("client", "braider"):
        return Response({"detail": "No profile for this user."}, status=status.HTTP_404_NOT_FOUND)
    return Response(BookingSerializer(booking).data)


def _transition_booking(request, booking_id, allowed_from, new_status, actor):
    role, profile = _role_and_profile(request.user)
    booking = get_object_or_404(Booking, id=booking_id)
    if actor == "braider":
        if role != "braider" or booking.braider_id != profile.id:
            return Response({"detail": "Not your booking."}, status=status.HTTP_403_FORBIDDEN)
    else:
        if role != "client" or booking.client_id != profile.id:
            return Response({"detail": "Not your booking."}, status=status.HTTP_403_FORBIDDEN)
    if booking.status not in allowed_from:
        return Response(
            {"detail": f"Booking is {booking.status}; cannot move it to {new_status}."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if new_status == "accepted" and _braider_has_conflict(
        booking.braider, booking.date, booking.start_time,
        booking.listing.duration_minutes, exclude_id=booking.id,
    ):
        return Response(
            {"detail": "That time now conflicts with another accepted booking."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    booking.status = new_status
    booking.save(update_fields=["status", "updated_at"])
    return Response(BookingSerializer(booking).data)


@api_view(["POST"])
def accept_booking(request, booking_id):
    return _transition_booking(request, booking_id, ["requested"], "accepted", "braider")


@api_view(["POST"])
def decline_booking(request, booking_id):
    return _transition_booking(request, booking_id, ["requested"], "declined", "braider")


@api_view(["POST"])
def complete_booking(request, booking_id):
    return _transition_booking(request, booking_id, ["accepted"], "completed", "braider")


@api_view(["POST"])
def cancel_booking(request, booking_id):
    return _transition_booking(request, booking_id, ["requested", "accepted"], "cancelled", "client")


# ---------------------------------------------------------------- reviews


@api_view(["GET", "POST"])
def reviews_for_booking(request, booking_id):
    booking = get_object_or_404(Booking, id=booking_id)
    if request.method == "GET":
        if hasattr(booking, "review"):
            return Response(ReviewSerializer(booking.review).data)
        return Response({"detail": "No review yet."}, status=status.HTTP_404_NOT_FOUND)
    role, profile = _role_and_profile(request.user)
    if role != "client" or booking.client_id != profile.id:
        return Response({"detail": "Not your booking."}, status=status.HTTP_403_FORBIDDEN)
    if booking.status != "completed":
        return Response(
            {"detail": "You can only review a completed booking."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if hasattr(booking, "review"):
        return Response({"detail": "This booking already has a review."}, status=status.HTTP_400_BAD_REQUEST)
    rating = request.data.get("rating")
    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return Response({"detail": "Rating must be an integer 1-5."}, status=status.HTTP_400_BAD_REQUEST)
    if rating < 1 or rating > 5:
        return Response({"detail": "Rating must be 1-5."}, status=status.HTTP_400_BAD_REQUEST)
    review = Review.objects.create(
        booking=booking, client=profile, braider=booking.braider,
        rating=rating, comment=request.data.get("comment", ""),
    )
    return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def reviews_for_braider(request, braider_id):
    braider = get_object_or_404(BraiderProfile, id=braider_id)
    reviews = Review.objects.filter(braider=braider).select_related("client")
    return Response(ReviewSerializer(reviews, many=True).data)
