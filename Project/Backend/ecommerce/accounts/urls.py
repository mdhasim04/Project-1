from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("product/<str:pk>/", views.product_detail, name="product-detail"),
    path("cart/", views.cart, name="cart"),
    path("add-to-cart/<str:product_id>/", views.add_to_cart, name="add-to-cart"),
    path("remove-from-cart/<str:product_id>/", views.remove_from_cart, name="remove-from-cart"),
    path("checkout/", views.checkout, name="checkout"),

    # Auth
    path("login/", views.login_view, name="login"),
    path("register/", views.register_view, name="register"),
    path("logout/", views.logout_view, name="logout"),
]
