from django.urls import path

from . import views

urlpatterns = [
    path("auth/register/", views.register, name="register"),
    path("auth/login/", views.login, name="login"),
    path("auth/me/", views.me, name="me"),
    path("styles/", views.BraidStyleListView.as_view(), name="style-list"),
    path("braiders/", views.BraiderListView.as_view(), name="braider-list"),
    path("braiders/<int:pk>/", views.BraiderDetailView.as_view(), name="braider-detail"),
    path("braiders/me/", views.my_braider_profile, name="my-braider-profile"),
    path("braiders/<int:braider_id>/reviews/", views.reviews_for_braider, name="braider-reviews"),
    path("clients/me/", views.my_client_profile, name="my-client-profile"),
    path("recommended/", views.recommended_braiders, name="recommended-braiders"),
    path("listings/", views.ListingListCreateView.as_view(), name="listing-list"),
    path("listings/<int:pk>/", views.ListingDetailView.as_view(), name="listing-detail"),
    path("my-listings/", views.my_listings, name="my-listings"),
    path("bookings/", views.bookings, name="bookings"),
    path("bookings/<int:booking_id>/", views.booking_detail, name="booking-detail"),
    path("bookings/<int:booking_id>/accept/", views.accept_booking, name="accept-booking"),
    path("bookings/<int:booking_id>/decline/", views.decline_booking, name="decline-booking"),
    path("bookings/<int:booking_id>/complete/", views.complete_booking, name="complete-booking"),
    path("bookings/<int:booking_id>/cancel/", views.cancel_booking, name="cancel-booking"),
    path("bookings/<int:booking_id>/review/", views.reviews_for_booking, name="booking-review"),
]
