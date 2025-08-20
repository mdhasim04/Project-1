/**
 * app.js
 * Handles UI logic, cart, auth and orders using localStorage.
 *
 * Data storage keys:
 *  - cart : array of {id, qty}
 *  - users : object keyed by username { username, password, phone }
 *  - currentUser : username (string)
 *  - orders : array of order objects
 */

const App = (function () {
  const LS = {
    CART: "store_cart_v1",
    USERS: "store_users_v1",
    CURRENT: "store_current_v1",
    ORDERS: "store_orders_v1"
  };

  /* ---------- utility ---------- */
  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }
  function money(n){ return "₹" + Number(n || 0).toLocaleString("en-IN"); }
  function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  function load(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch(e){ return fallback; } }

  /* ---------- cart helpers ---------- */
  function getCart(){ return load(LS.CART, []); }
  function setCart(c){ save(LS.CART, c); updateCartCount(); }
  function addToCart(productId, qty = 1){
    const cart = getCart();
    const item = cart.find(i => i.id === productId);
    if(item) item.qty += qty;
    else cart.push({ id: productId, qty });
    setCart(cart);
  }
  function removeFromCart(productId){
    const cart = getCart().filter(i => i.id !== productId);
    setCart(cart);
  }
  function updateQty(productId, qty){
    const cart = getCart();
    const item = cart.find(i => i.id === productId);
    if(!item) return;
    item.qty = qty;
    if(item.qty <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart);
    }
  }

  function cartTotals(){
    const cart = getCart();
    let subtotal = 0;
    let totalQty = 0;
    cart.forEach(ci => {
      const p = PRODUCTS.find(p => p.id === ci.id);
      if(p){ subtotal += (p.price || 0) * ci.qty; totalQty += ci.qty; }
    });
    const shipping = subtotal > 0 ? 99 : 0;
    const total = subtotal + shipping;
    return { subtotal, shipping, total, totalQty };
  }

  function updateCartCount(){
    const el = qs("#cart-count");
    if(el) el.textContent = cartTotals().totalQty || 0;
  }

  /* ---------- auth ---------- */
  function getUsers(){ return load(LS.USERS, {}); }
  function saveUser(user){ const u = getUsers(); u[user.username] = user; save(LS.USERS, u); }
  function getCurrentUser(){ return load(LS.CURRENT, null); }
  function setCurrentUser(username){ save(LS.CURRENT, username); updateAuthUI(); }
  function logout(){ localStorage.removeItem(LS.CURRENT); updateAuthUI(); }

  function updateAuthUI(){
    const cur = getCurrentUser();
    const authLink = qs("#auth-link");
    if(!authLink) return;

    if(cur){
      authLink.textContent = `Logout`;
      authLink.href = "#";
      authLink.onclick = (e) => {
        e.preventDefault();
        logout();
        // Optionally redirect to home after logout
        if(!location.pathname.endsWith("index.html")){
          location.href = "index.html";
        } else {
          updateCartCount();
        }
      };
    } else {
      authLink.textContent = "Login";
      authLink.href = "login.html";
      authLink.onclick = null;
    }
  }

  /* ---------- orders ---------- */
  function getOrders(){ return load(LS.ORDERS, []); }
  function saveOrder(order){
    const orders = getOrders();
    orders.push(order);
    save(LS.ORDERS, orders);
  }

  /* ---------- page initializers ---------- */
  function initIndex(){
    updateAuthUI();
    updateCartCount();
    const grid = qs("#product-grid");
    if(!grid) return;
    grid.innerHTML = "";
    PRODUCTS.forEach(p => {
      const div = document.createElement("div");
      div.className = "card";
      const img = p.img || "https://picsum.photos/seed/fallback/600/400";
      div.innerHTML = `
        <img src="${img}" alt="${p.title}">
        <h3>${p.title}</h3>
        <p>${p.desc}</p>
        <p style="font-weight:700;margin:6px 0">${money(p.price)}</p>
        <div class="actions">
          <a class="btn" href="product.html?id=${p.id}">View</a>
          <button class="btn primary" data-id="${p.id}">Add to cart</button>
        </div>
      `;
      grid.appendChild(div);
    });
    // attach add handlers
    qsa('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        addToCart(btn.dataset.id, 1);
        updateCartCount();
        btn.textContent = "Added ✓";
        setTimeout(() => btn.textContent = "Add to cart", 900);
      });
    });
  }

  function initProduct(){
    updateAuthUI();
    updateCartCount();
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    const container = qs("#product-detail");
    if(!container) return;
    const p = PRODUCTS.find(x => x.id === id) || PRODUCTS[0];
    const img = p.img || "https://picsum.photos/seed/fallback/600/400";
    container.innerHTML = `
      <div class="left"><img src="${img}" alt="${p.title}"></div>
      <div class="right">
        <h2>${p.title}</h2>
        <p class="muted">${p.desc}</p>
        <p style="font-weight:800;font-size:20px">${money(p.price)}</p>
        <div style="margin-top:12px">
          <label>Quantity <input id="qty" type="number" min="1" value="1" style="width:80px;padding:6px;border-radius:8px;border:1px solid #ddd"></label>
        </div>
        <div class="actions" style="margin-top:12px">
          <button id="add-btn" class="btn primary">Add to cart</button>
          <a class="btn" href="cart.html">Go to cart</a>
        </div>
      </div>
    `;
    const addBtn = qs("#add-btn");
    const qtyEl = qs("#qty");
    if(addBtn){
      addBtn.addEventListener('click', () => {
        const qty = Math.max(1, parseInt(qtyEl.value || 1, 10));
        addToCart(p.id, qty);
        updateCartCount();
        addBtn.textContent = "Added ✓";
        setTimeout(()=> addBtn.textContent = "Add to cart", 900);
      });
    }
  }

  function renderCartUI(){
    updateAuthUI();
    const list = qs("#cart-list"), summary = qs("#cart-summary");
    if(!list || !summary) return;
    const cart = getCart();
    if(cart.length === 0){
      list.innerHTML = `<p>Your cart is empty. <a href="index.html">Shop now</a></p>`;
      summary.innerHTML = "";
      return;
    }
    list.innerHTML = "";
    cart.forEach(ci => {
      const p = PRODUCTS.find(x => x.id === ci.id);
      if(!p) return;
      const img = p.img || "https://picsum.photos/seed/fallback/600/400";
      const div = document.createElement("div");
      div.className = "cart-item";
      div.innerHTML = `
        <img src="${img}" alt="${p.title}">
        <div style="flex:1">
          <strong>${p.title}</strong>
          <div style="color:var(--muted);margin-top:6px">${money(p.price)}</div>
        </div>
        <div class="qty">
          <button class="dec" data-id="${p.id}">−</button>
          <div>${ci.qty}</div>
          <button class="inc" data-id="${p.id}">+</button>
        </div>
        <div style="width:90px;text-align:right">${money(p.price * ci.qty)}</div>
        <div><button class="btn ghost remove" data-id="${p.id}">Remove</button></div>
      `;
      list.appendChild(div);
    });

    // attach qty handlers
    qsa(".inc").forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.id; const ci = getCart().find(x=>x.id===id);
      updateQty(id, (ci?.qty || 0) + 1); renderCartUI(); updateCartCount();
    }));
    qsa(".dec").forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.id; const ci = getCart().find(x=>x.id===id);
      updateQty(id, (ci?.qty || 0) - 1); renderCartUI(); updateCartCount();
    }));
    qsa(".remove").forEach(b => b.addEventListener('click', () => {
      removeFromCart(b.dataset.id); renderCartUI(); updateCartCount();
    }));

    const t = cartTotals();
    summary.innerHTML = `
      <div style="display:flex;justify-content:space-between"><span>Subtotal</span><strong>${money(t.subtotal)}</strong></div>
      <div style="display:flex;justify-content:space-between"><span>Shipping</span><strong>${money(t.shipping)}</strong></div>
      <hr style="margin:8px 0"/>
      <div style="display:flex;justify-content:space-between"><span>Total</span><strong>${money(t.total)}</strong></div>
    `;
    const checkoutBtn = qs("#checkout-btn");
    if(checkoutBtn){
      checkoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const user = getCurrentUser();
        if(!user){
          alert("Please login or register before checkout.");
          location.href = "login.html";
          return;
        }
        location.href = "checkout.html";
      });
    }
  }

  function initCart(){
    updateAuthUI();
    updateCartCount();
    renderCartUI();
  }

  /* ---------- checkout ---------- */
  function initCheckout(){
    updateAuthUI();
    updateCartCount();
    const cur = getCurrentUser();
    if(!cur){
      alert("You need to login to checkout.");
      location.href = "login.html";
      return;
    }
    const info = qs("#checkout-info");
    const form = qs("#checkout-form");
    const confirm = qs("#order-confirm");
    const cart = getCart();
    if(cart.length === 0){
      info.innerHTML = `<p>Your cart is empty. <a href="index.html">Shop now</a></p>`;
      form.classList.add("hidden");
      return;
    }

    const t = cartTotals();
    info.innerHTML = `<div class="cart-summary">
                        <div style="display:flex;justify-content:space-between"><span>Items</span><strong>${t.totalQty}</strong></div>
                        <div style="display:flex;justify-content:space-between"><span>Subtotal</span><strong>${money(t.subtotal)}</strong></div>
                        <div style="display:flex;justify-content:space-between"><span>Shipping</span><strong>${money(t.shipping)}</strong></div>
                        <hr style="margin:8px 0"/>
                        <div style="display:flex;justify-content:space-between"><span>Total</span><strong>${money(t.total)}</strong></div>
                      </div>`;

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const data = new FormData(form);
      const name = (data.get("name") || "").toString().trim();
      const address = (data.get("address") || "").toString().trim();
      const phone = (data.get("phone") || "").toString().trim();
      if(!name || !address) return alert("Please fill all required fields.");

      const order = {
        id: "ord_" + Date.now(),
        user: cur,
        createdAt: new Date().toISOString(),
        items: getCart().map(ci => {
          const p = PRODUCTS.find(x => x.id === ci.id) || {};
          return { id: ci.id, title: p.title || ci.id, price: p.price || 0, qty: ci.qty };
        }),
        totals: cartTotals(),
        shippingAddress: { name, address, phone }
      };
      saveOrder(order);
      setCart([]);
      updateCartCount();
      form.classList.add("hidden");
      confirm.classList.remove("hidden");
      confirm.innerHTML = `<h3>Order placed — ${order.id}</h3>
                           <p>Thanks ${name}! We saved your order. (This is a demo — no real payment.)</p>
                           <p><strong>Total:</strong> ${money(order.totals.total)}</p>
                           <a class="btn" href="index.html">Back to shop</a>`;
    });
  }

  /* ---------- auth flows ---------- */
  function initAuth(){
    updateAuthUI();
    updateCartCount();
    const loginForm = qs("#login-form");
    const registerForm = qs("#register-form");
    const showRegister = qs("#show-register");
    const showLogin = qs("#show-login");
    const regCard = qs("#register-card");
    const authMsg = qs("#auth-message");

    if(showRegister) showRegister.addEventListener('click', (e)=>{ e.preventDefault(); regCard.classList.remove("hidden"); document.querySelector(".auth-card").classList.add("hidden"); });
    if(showLogin) showLogin.addEventListener('click', (e)=>{ e.preventDefault(); regCard.classList.add("hidden"); document.querySelector(".auth-card").classList.remove("hidden"); });

    if(registerForm){
      registerForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const fm = new FormData(registerForm);
        const username = (fm.get("username") || "").toString().trim();
        const password = (fm.get("password") || "").toString();
        const phone = (fm.get("phone") || "").toString();
        if(!username || !password) return alert("Provide username & password.");
        const users = getUsers();
        if(users[username]) { authMsg.textContent = "Username already exists."; return; }
        saveUser({ username, password, phone });
        setCurrentUser(username);
        authMsg.textContent = "Registered and logged in!";
        setTimeout(()=> location.href = "index.html", 900);
      });
    }

    if(loginForm){
      loginForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const fm = new FormData(loginForm);
        const username = (fm.get("username") || "").toString().trim();
        const password = (fm.get("password") || "").toString();
        const users = getUsers();
        const u = users[username];
        if(!u || u.password !== password){
          authMsg.textContent = "Invalid credentials.";
          return;
        }
        setCurrentUser(username);
        authMsg.textContent = "Logged in!";
        setTimeout(()=> location.href = "index.html", 700);
      });
    }
  }

  /* ---------- expose ---------- */
  return {
    initIndex, initProduct, initCart, initCheckout, initAuth,
    _helpers: { addToCart, getCart, cartTotals, getCurrentUser, logout, getOrders }
  };
})();
