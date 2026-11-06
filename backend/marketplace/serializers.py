from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    CAMPUS_AREAS,
    WEEKDAYS,
    Booking,
    BraiderProfile,
    BraidStyle,
    ClientProfile,
    Listing,
    Review,
)


class BraidStyleSerializer(serializers.ModelSerializer):
    class Meta:
        model = BraidStyle
        fields = ["id", "name", "description", "typical_duration_minutes"]


class ListingSerializer(serializers.ModelSerializer):
    braider_name = serializers.CharField(source="braider.display_name", read_only=True)
    braider_id = serializers.IntegerField(source="braider.id", read_only=True)
    braider_is_demo = serializers.BooleanField(source="braider.is_demo", read_only=True)
    campus_area = serializers.CharField(source="braider.campus_area", read_only=True)
    style_name = serializers.CharField(source="style.name", read_only=True)

    class Meta:
        model = Listing
        fields = [
            "id", "braider", "braider_id", "braider_name", "braider_is_demo",
            "campus_area", "style", "style_name", "title", "description",
            "price", "duration_minutes", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["braider", "created_at", "updated_at"]


class ReviewSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.display_name", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "booking", "client_name", "rating", "comment", "created_at"]
        read_only_fields = ["booking", "created_at"]


class BraiderProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    listings = ListingSerializer(many=True, read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)

    class Meta:
        model = BraiderProfile
        fields = [
            "id", "username", "display_name", "bio", "campus_area",
            "location_detail", "instagram", "years_experience",
            "available_days", "available_start_time", "available_end_time",
            "is_active", "is_demo", "average_rating", "review_count",
            "listings", "reviews", "created_at",
        ]
        read_only_fields = ["is_demo", "created_at"]

    def validate_available_days(self, value):
        bad = [day for day in value if day not in WEEKDAYS]
        if bad:
            raise serializers.ValidationError(f"Invalid weekdays: {bad}. Use {WEEKDAYS}.")
        return value

    def validate_campus_area(self, value):
        if value and value not in dict(CAMPUS_AREAS):
            raise serializers.ValidationError(f"Unknown campus area: {value}.")
        return value


class ClientProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = ClientProfile
        fields = ["id", "username", "display_name", "created_at"]
        read_only_fields = ["created_at"]


class BookingSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    style_name = serializers.CharField(source="listing.style.name", read_only=True)
    braider_name = serializers.CharField(source="braider.display_name", read_only=True)
    braider_id = serializers.IntegerField(source="braider.id", read_only=True)
    client_name = serializers.CharField(source="client.display_name", read_only=True)
    price = serializers.DecimalField(source="listing.price", max_digits=8, decimal_places=2, read_only=True)
    duration_minutes = serializers.IntegerField(source="listing.duration_minutes", read_only=True)
    end_time = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id", "client", "client_name", "listing", "listing_title",
            "style_name", "braider", "braider_id", "braider_name", "price",
            "duration_minutes", "date", "start_time", "end_time", "status",
            "notes", "created_at", "updated_at",
        ]
        read_only_fields = ["client", "braider", "status", "created_at", "updated_at"]

    def get_end_time(self, obj):
        from datetime import datetime, time, timedelta

        start = datetime.combine(obj.date, obj.start_time)
        return (start + timedelta(minutes=obj.listing.duration_minutes)).time().isoformat(timespec="minutes")


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=4)
    role = serializers.ChoiceField(choices=["braider", "client"])
    display_name = serializers.CharField(max_length=120, required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("That username is taken.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"], password=validated_data["password"]
        )
        display_name = validated_data.get("display_name") or validated_data["username"]
        if validated_data["role"] == "braider":
            BraiderProfile.objects.create(user=user, display_name=display_name)
        else:
            ClientProfile.objects.create(user=user, display_name=display_name)
        return user
