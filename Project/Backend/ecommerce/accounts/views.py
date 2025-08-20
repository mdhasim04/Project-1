from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.contrib import messages

from .models import Product, Order, OrderItem


# -------- Home page (product list) --------
def index(request):
    products = Product.objects.all()
    return render(request, "index.html", {"products": products})


# -------- Product details --------
def product_detail(request, pk):
    product = get_object_or_404(Product, pk=pk)
    return render(request, "product.html", {"product": product})


# -------- Cart page (just renders template) --------


# Hardcoded product data for non-database cart
BASIC_PRODUCTS = {
    "1": {"title": "Smartphone", "price": 19999, "img": "https://picsum.photos/300?1"},
    "2": {"title": "Laptop", "price": 49999, "img": "https://picsum.photos/300?2"},
    "3": {"title": "Smartwatch", "price": 9999, "img": "https://picsum.photos/300?3"},
    "4": {"title": "Headphones", "price": 2999, "img": "https://picsum.photos/300?4"},
    "5": {"title": "Backpack", "price": 1499, "img": "https://picsum.photos/300?5"},
}

def add_to_cart(request, product_id):
    cart = request.session.get("cart", {})
    # Handle old int format and migrate to dict
    if product_id in cart:
        if isinstance(cart[product_id], int):
            # Migrate to dict format
            prod = BASIC_PRODUCTS.get(product_id)
            if prod:
                cart[product_id] = {"qty": cart[product_id] + 1, "title": prod["title"], "price": prod["price"], "img": prod["img"]}
        else:
            cart[product_id]["qty"] += 1
    else:
        prod = BASIC_PRODUCTS.get(product_id)
        if prod:
            cart[product_id] = {"qty": 1, "title": prod["title"], "price": prod["price"], "img": prod["img"]}
    request.session["cart"] = cart
    return redirect("cart")



# View Cart (from session, not DB)
def cart(request):
    cart = request.session.get("cart", {})
    cart_items = []
    subtotal = 0
    shipping = 0  # You can set a flat shipping rate if you want
    updated = False
    for pid, item in list(cart.items()):
        # If item is int, convert to dict using BASIC_PRODUCTS
        if isinstance(item, int):
            prod = BASIC_PRODUCTS.get(pid)
            if prod:
                cart[pid] = {"qty": item, "title": prod["title"], "price": prod["price"], "img": prod["img"]}
                item = cart[pid]
                updated = True
            else:
                continue  # skip if product info not found
        item_total = item["price"] * item["qty"]
        subtotal += item_total
        cart_items.append({
            "title": item["title"],
            "img": item["img"],
            "qty": item["qty"],
            "price": item["price"],
            "subtotal": item_total
        })
    if updated:
        request.session["cart"] = cart
    total = subtotal + shipping
    return render(request, "cart.html", {"cart_items": cart_items, "subtotal": subtotal, "shipping": shipping, "total": total})


# Remove from Cart
def remove_from_cart(request, product_id):
    cart = request.session.get("cart", {})
    if product_id in cart:
        del cart[product_id]
        request.session["cart"] = cart
    return redirect("cart")

# -------- Checkout --------
@login_required
def checkout(request):
    if request.method == "POST":
        name = request.POST.get("name")
        address = request.POST.get("address")
        phone = request.POST.get("phone")

        # create new order
        order = Order.objects.create(
            user=request.user,
            name=name,
            address=address,
            phone=phone,
            subtotal=0,
            shipping=0,
            total=0,
        )

        # for demo: no cart logic yet
        messages.success(request, "Order placed successfully!")
        return redirect("index")

    return render(request, "checkout.html")


# -------- Authentication --------
def login_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect("index")
        else:
            messages.error(request, "Invalid username or password")
    return render(request, "login.html")


def register_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        if User.objects.filter(username=username).exists():
            messages.error(request, "Username already taken")
        else:
            User.objects.create_user(username=username, password=password)
            messages.success(request, "Account created! Please login.")
            return redirect("login")
    return render(request, "login.html")  # reuse login template


def logout_view(request):
    logout(request)
    return redirect("index")
