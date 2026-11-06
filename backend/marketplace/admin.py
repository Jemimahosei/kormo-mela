from django.contrib import admin

from .models import Booking, BraiderProfile, BraidStyle, ClientProfile, Listing, Review


@admin.register(BraidStyle)
class BraidStyleAdmin(admin.ModelAdmin):
    list_display = ["name", "typical_duration_minutes"]
    search_fields = ["name"]


@admin.register(BraiderProfile)
class BraiderProfileAdmin(admin.ModelAdmin):
    list_display = ["display_name", "campus_area", "years_experience", "is_active", "is_demo"]
    list_filter = ["campus_area", "is_demo", "is_active"]
    search_fields = ["display_name", "user__username"]


@admin.register(ClientProfile)
class ClientProfileAdmin(admin.ModelAdmin):
    list_display = ["display_name", "created_at"]
    search_fields = ["display_name", "user__username"]


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ["title", "braider", "style", "price", "duration_minutes", "is_active"]
    list_filter = ["style", "is_active"]


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ["id", "client", "listing", "date", "start_time", "status"]
    list_filter = ["status", "date"]


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["braider", "client", "rating", "created_at"]
    list_filter = ["rating"]
