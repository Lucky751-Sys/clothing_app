import { products, categories } from "./data.js";

const $ = (sel) => document.querySelector(sel);
const fmtINR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const els = {
  year: $("#year"),
  q: $("#q"),
  category: $("#category"),
  size: $("#size"),
  sort: $("#sort"),
  clearFiltersBtn: $("#clearFiltersBtn"),
  resultMeta: $("#resultMeta"),
  grid: $("#grid"),
  shopNowBtn: $("#shopNowBtn"),

  productDialog: $("#productDialog"),
  productDialogBody: $("#productDialogBody"),

  cartBtn: $("#cartBtn"),
  cartCount: $("#cartCount"),
  cartSub: $("#cartSub"),
  closeCartBtn: $("#closeCartBtn"),
  drawerOverlay: $("#drawerOverlay"),
  cartDrawer: $("#cartDrawer"),
  cartItems: $("#cartItems"),
  subtotal: $("#subtotal"),
  shipping: $("#shipping"),
  total: $("#total"),
  checkoutBtn: $("#checkoutBtn"),
  clearCartBtn: $("#clearCartBtn"),

  checkoutDialog: $("#checkoutDialog"),
  checkoutForm: $("#checkoutForm"),
  checkoutTotal: $("#checkoutTotal"),
  cancelCheckoutBtn: $("#cancelCheckoutBtn"),
};

const CART_KEY = "clothify.cart.v1";

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

let cart = loadCart(); // { [productId]: { size: "M", qty: 2 } } - size is last selected

function cartCount() {
  return Object.values(cart).reduce((n, it) => n + (it?.qty || 0), 0);
}

function cartLines() {
  return Object.entries(cart)
    .map(([id, it]) => {
      const p = products.find((x) => x.id === id);
      if (!p) return null;
      const qty = clampInt(it?.qty ?? 0, 0, 99);
      const size = it?.size && p.sizes.includes(it.size) ? it.size : p.sizes[0];
      return { p, qty, size };
    })
    .filter(Boolean);
}

function cartSubtotal() {
  return cartLines().reduce((sum, line) => sum + line.p.price * line.qty, 0);
}

function shippingCost(subtotal) {
  if (subtotal === 0) return 0;
  if (subtotal >= 4999) return 0;
  return 99;
}

function clampInt(n, min, max) {
  const x = Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : min;
  return Math.max(min, Math.min(max, x));
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initFilters() {
  for (const c of categories) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    els.category.appendChild(opt);
  }
}

function currentFilters() {
  return {
    q: els.q.value.trim().toLowerCase(),
    category: els.category.value,
    size: els.size.value,
    sort: els.sort.value,
  };
}

function applyFilters(list, f) {
  let out = list.slice();
  if (f.q) {
    out = out.filter((p) => {
      const hay = `${p.name} ${p.category} ${p.color} ${p.blurb}`.toLowerCase();
      return hay.includes(f.q);
    });
  }
  if (f.category !== "all") out = out.filter((p) => p.category === f.category);
  if (f.size !== "all") out = out.filter((p) => p.sizes.includes(f.size));

  if (f.sort === "priceAsc") out.sort((a, b) => a.price - b.price);
  if (f.sort === "priceDesc") out.sort((a, b) => b.price - a.price);
  if (f.sort === "ratingDesc") out.sort((a, b) => b.rating - a.rating);
  return out;
}

function renderGrid() {
  const f = currentFilters();
  const list = applyFilters(products, f);
  els.resultMeta.textContent = `${list.length} product${list.length === 1 ? "" : "s"} · ${cartCount()} item${cartCount() === 1 ? "" : "s"} in cart`;
  els.grid.setAttribute("aria-busy", "false");

  els.grid.innerHTML = list
    .map((p) => {
      const inCart = cart[p.id]?.qty ? true : false;
      return `
        <article class="card">
          <div class="card__media" role="img" aria-label="${escapeHtml(p.name)}">
            <div class="chip">${escapeHtml(p.category)}</div>
            <div class="rating">★ ${p.rating.toFixed(1)}</div>
          </div>
          <div class="card__body">
            <div>
              <div class="card__title">${escapeHtml(p.name)}</div>
              <div class="card__desc">${escapeHtml(p.blurb)}</div>
            </div>
            <div class="card__row">
              <div>
                <div class="price">${fmtINR.format(p.price)}</div>
                <div class="sub">${escapeHtml(p.color)} · Sizes ${escapeHtml(p.sizes.join(", "))}</div>
              </div>
            </div>
            <div class="card__actions">
              <button class="btn btn--ghost" type="button" data-action="view" data-id="${p.id}">View</button>
              <button class="btn btn--primary" type="button" data-action="quickAdd" data-id="${p.id}">
                ${inCart ? "Add another" : "Add to cart"}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function openProductDialog(productId) {
  const p = products.find((x) => x.id === productId);
  if (!p) return;

  const existing = cart[p.id];
  const initialSize = existing?.size && p.sizes.includes(existing.size) ? existing.size : p.sizes[0];
  const initialQty = clampInt(existing?.qty ?? 1, 1, 99);

  els.productDialogBody.innerHTML = `
    <div class="product">
      <div class="product__media" aria-hidden="true"></div>
      <div class="product__body">
        <h2 style="margin:0">${escapeHtml(p.name)}</h2>
        <div class="product__meta">
          <span class="mini">${escapeHtml(p.category)}</span>
          <span class="mini">★ ${p.rating.toFixed(1)}</span>
          <span class="mini">${escapeHtml(p.color)}</span>
        </div>
        <p>${escapeHtml(p.blurb)}</p>

        <div class="card__row" style="margin:10px 0 14px">
          <div class="price">${fmtINR.format(p.price)}</div>
          <div class="muted">Free delivery over ${fmtINR.format(4999)}</div>
        </div>

        <div class="field">
          <label for="dlgSize">Size</label>
          <select id="dlgSize">
            ${p.sizes.map((s) => `<option value="${s}" ${s === initialSize ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>

        <div style="display:flex;align-items:flex-end;gap:12px;margin-top:12px;flex-wrap:wrap">
          <div class="qty" aria-label="Quantity">
            <button class="qty__btn" type="button" data-action="dec">−</button>
            <div id="dlgQty" class="qty__val" aria-live="polite">${initialQty}</div>
            <button class="qty__btn" type="button" data-action="inc">+</button>
          </div>
          <button id="dlgAddBtn" class="btn btn--primary" type="button" style="flex:1;min-width:220px">Add to cart</button>
          <button class="btn btn--ghost" type="button" data-action="goCart">Go to cart</button>
        </div>
      </div>
    </div>
  `;

  const qtyEl = $("#dlgQty");
  const sizeEl = $("#dlgSize");
  const addBtn = $("#dlgAddBtn");

  const setQty = (next) => {
    const n = clampInt(next, 1, 99);
    qtyEl.textContent = String(n);
  };

  els.productDialogBody.addEventListener(
    "click",
    (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const action = t.getAttribute("data-action");
      if (!action) return;
      if (action === "inc") setQty(Number(qtyEl.textContent) + 1);
      if (action === "dec") setQty(Number(qtyEl.textContent) - 1);
      if (action === "goCart") {
        els.productDialog.close();
        openCart();
      }
    },
    { once: true }
  );

  addBtn.addEventListener(
    "click",
    () => {
      addToCart(p.id, sizeEl.value, Number(qtyEl.textContent));
      els.productDialog.close();
      openCart();
    },
    { once: true }
  );

  els.productDialog.showModal();
}

function addToCart(productId, size, qty) {
  const p = products.find((x) => x.id === productId);
  if (!p) return;
  const safeSize = p.sizes.includes(size) ? size : p.sizes[0];
  const addQty = clampInt(qty, 1, 99);
  const prevQty = clampInt(cart[productId]?.qty ?? 0, 0, 99);
  const nextQty = clampInt(prevQty + addQty, 1, 99);
  cart[productId] = { size: safeSize, qty: nextQty };
  saveCart(cart);
  renderCart();
  renderGrid();
}

function setCartQty(productId, nextQty) {
  const p = products.find((x) => x.id === productId);
  if (!p) return;
  const qty = clampInt(nextQty, 0, 99);
  if (qty <= 0) delete cart[productId];
  else cart[productId] = { size: cart[productId]?.size ?? p.sizes[0], qty };
  saveCart(cart);
  renderCart();
  renderGrid();
}

function setCartSize(productId, size) {
  const p = products.find((x) => x.id === productId);
  if (!p) return;
  if (!cart[productId]) cart[productId] = { size: p.sizes[0], qty: 1 };
  cart[productId].size = p.sizes.includes(size) ? size : p.sizes[0];
  saveCart(cart);
  renderCart();
}

function clearCart() {
  cart = {};
  saveCart(cart);
  renderCart();
  renderGrid();
}

function openCart() {
  els.drawerOverlay.hidden = false;
  els.cartDrawer.classList.add("is-open");
  els.cartDrawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  els.drawerOverlay.hidden = true;
  els.cartDrawer.classList.remove("is-open");
  els.cartDrawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function renderCart() {
  const lines = cartLines();
  const count = cartCount();
  els.cartCount.textContent = String(count);
  els.cartSub.textContent = `${count} item${count === 1 ? "" : "s"}`;

  if (lines.length === 0) {
    els.cartItems.innerHTML = `
      <div class="muted">Your cart is empty.</div>
      <button class="btn btn--primary" type="button" id="startShoppingBtn">Start shopping</button>
    `;
    $("#startShoppingBtn")?.addEventListener("click", () => {
      closeCart();
      $("#catalog")?.scrollIntoView({ behavior: "smooth" });
    });
  } else {
    els.cartItems.innerHTML = lines
      .map(({ p, qty, size }) => {
        return `
          <div class="item">
            <div class="thumb" aria-hidden="true"></div>
            <div>
              <div class="item__title">${escapeHtml(p.name)}</div>
              <div class="item__meta">${escapeHtml(p.color)} ·
                <label class="sr-only" for="size-${p.id}">Size for ${escapeHtml(p.name)}</label>
                <select id="size-${p.id}" data-action="size" data-id="${p.id}" style="margin-left:6px">
                  ${p.sizes.map((s) => `<option value="${s}" ${s === size ? "selected" : ""}>${s}</option>`).join("")}
                </select>
              </div>
              <div class="item__meta" style="margin-top:8px">
                <button class="btn btn--ghost" type="button" data-action="dec" data-id="${p.id}">−</button>
                <span style="display:inline-block;min-width:28px;text-align:center;font-weight:900">${qty}</span>
                <button class="btn btn--ghost" type="button" data-action="inc" data-id="${p.id}">+</button>
                <button class="btn btn--ghost" type="button" data-action="remove" data-id="${p.id}">Remove</button>
              </div>
            </div>
            <div class="item__right">
              <div class="item__price">${fmtINR.format(p.price * qty)}</div>
              <div class="muted" style="font-size:12px">${fmtINR.format(p.price)} each</div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  const subtotal = cartSubtotal();
  const ship = shippingCost(subtotal);
  const total = subtotal + ship;
  els.subtotal.textContent = fmtINR.format(subtotal);
  els.shipping.textContent = fmtINR.format(ship);
  els.total.textContent = fmtINR.format(total);
  els.checkoutTotal.textContent = fmtINR.format(total);

  els.checkoutBtn.disabled = subtotal === 0;
  els.clearCartBtn.disabled = subtotal === 0;
}

function wireEvents() {
  els.year.textContent = String(new Date().getFullYear());

  const onFiltersChanged = () => renderGrid();
  ["input", "change"].forEach((evt) => {
    els.q.addEventListener(evt, onFiltersChanged);
  });
  els.category.addEventListener("change", onFiltersChanged);
  els.size.addEventListener("change", onFiltersChanged);
  els.sort.addEventListener("change", onFiltersChanged);

  els.clearFiltersBtn.addEventListener("click", () => {
    els.q.value = "";
    els.category.value = "all";
    els.size.value = "all";
    els.sort.value = "featured";
    renderGrid();
    els.q.focus();
  });

  els.shopNowBtn.addEventListener("click", () => {
    $("#catalog")?.scrollIntoView({ behavior: "smooth" });
    els.q.focus();
  });

  els.grid.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const action = t.getAttribute("data-action");
    const id = t.getAttribute("data-id");
    if (!action || !id) return;
    if (action === "view") openProductDialog(id);
    if (action === "quickAdd") {
      const p = products.find((x) => x.id === id);
      if (!p) return;
      const size = cart[id]?.size ?? p.sizes[0];
      addToCart(id, size, 1);
      openCart();
    }
  });

  els.cartBtn.addEventListener("click", () => openCart());
  els.closeCartBtn.addEventListener("click", () => closeCart());
  els.drawerOverlay.addEventListener("click", () => closeCart());
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCart();
  });

  els.cartItems.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const action = t.getAttribute("data-action");
    const id = t.getAttribute("data-id");
    if (!action || !id) return;
    const curr = clampInt(cart[id]?.qty ?? 0, 0, 99);
    if (action === "inc") setCartQty(id, curr + 1);
    if (action === "dec") setCartQty(id, curr - 1);
    if (action === "remove") setCartQty(id, 0);
  });

  els.cartItems.addEventListener("change", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLSelectElement)) return;
    if (t.getAttribute("data-action") !== "size") return;
    const id = t.getAttribute("data-id");
    if (!id) return;
    setCartSize(id, t.value);
  });

  els.clearCartBtn.addEventListener("click", () => clearCart());

  els.checkoutBtn.addEventListener("click", () => {
    els.checkoutDialog.showModal();
  });
  els.cancelCheckoutBtn.addEventListener("click", () => {
    els.checkoutDialog.close();
  });

  els.checkoutForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (cartSubtotal() === 0) return;
    const name = $("#name")?.value?.trim() || "Customer";
    els.checkoutDialog.close();
    closeCart();
    clearCart();
    alert(`Thanks ${name}! Your demo order has been placed.`);
  });
}

function main() {
  initFilters();
  wireEvents();
  renderCart();
  renderGrid();
}

main();
