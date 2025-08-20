from django.contrib import admin
from .models import Product, Order, OrderItem


# ---------- Inline for Order Items ----------
class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product", "qty", "price")
    can_delete = False


# ---------- Order Admin ----------
@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "created_at", "total", "is_paid")
    list_filter = ("is_paid", "created_at")
    search_fields = ("user__username", "name", "phone")
    inlines = [OrderItemInline]


# ---------- Product Admin ----------
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "price")
    search_fields = ("id", "title")
    list_filter = ("price",)


# ---------- OrderItem Admin ----------
@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("order", "product", "qty", "price")
    search_fields = ("order__id", "product__title")
