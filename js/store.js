/**
 * Electro Store - Dynamic JavaScript API Connector
 * Connects the Electro Bootstrap template to the Express/SQLite backend.
 */

// ── Session Management ─────────────────────────────────────────
function getSessionId() {
    let sessionId = localStorage.getItem('electro_session_id');
    if (!sessionId) {
        sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('electro_session_id', sessionId);
    }
    return sessionId;
}

// ── API Helper ─────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`API Error [${url}]:`, error);
        throw error;
    }
}

// ── Product Card HTML Generator ────────────────────────────────
function createProductCardHTML(product, delay = '0.1s') {
    const categoryName = product.category_name || 'Electronics';
    const isNew = product.new_arrival ? '<div class="product-new">New</div>' : '';
    const isSale = product.compare_price && product.compare_price > product.price
        ? '<div class="product-sale">Sale</div>' : '';
    const badge = isNew || isSale;

    const comparePrice = product.compare_price
        ? `<del class="me-2 fs-5">$${parseFloat(product.compare_price).toFixed(2)}</del>`
        : '';

    return `
        <div class="col-md-6 col-lg-4 col-xl-3">
            <div class="product-item rounded wow fadeInUp" data-wow-delay="${delay}">
                <div class="product-item-inner border rounded">
                    <div class="product-item-inner-item">
                        <img src="${product.image}" class="img-fluid w-100 rounded-top" alt="${product.name}">
                        ${badge}
                        <div class="product-details">
                            <a href="single.html?id=${product.id}"><i class="fa fa-eye fa-1x"></i></a>
                        </div>
                    </div>
                    <div class="text-center rounded-bottom p-4">
                        <a href="shop.html?category=${product.category_slug || ''}" class="d-block mb-2">${categoryName}</a>
                        <a href="single.html?id=${product.id}" class="d-block h4">${product.name}</a>
                        ${comparePrice}
                        <span class="text-primary fs-5">$${parseFloat(product.price).toFixed(2)}</span>
                    </div>
                </div>
                <div class="product-item-add border border-top-0 rounded-bottom text-center p-4 pt-0">
                    <a href="#" onclick="addToCart(${product.id}); return false;"
                        class="btn btn-primary border-secondary rounded-pill py-2 px-4 mb-4"><i
                            class="fas fa-shopping-cart me-2"></i> Add To Cart</a>
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex">
                            <i class="fas fa-star text-primary"></i>
                            <i class="fas fa-star text-primary"></i>
                            <i class="fas fa-star text-primary"></i>
                            <i class="fas fa-star text-primary"></i>
                            <i class="fas fa-star"></i>
                        </div>
                        <div class="d-flex">
                            <a href="#"
                                class="text-primary d-flex align-items-center justify-content-center me-3"><span
                                    class="rounded-circle btn-sm-square border"><i
                                        class="fas fa-random"></i></span></a>
                            <a href="#"
                                class="text-primary d-flex align-items-center justify-content-center me-0"><span
                                    class="rounded-circle btn-sm-square border"><i
                                        class="fas fa-heart"></i></span></a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ── Cart Functions ─────────────────────────────────────────────
async function addToCart(productId, quantity = 1) {
    try {
        await apiFetch('/api/cart/add', {
            method: 'POST',
            body: JSON.stringify({
                sessionId: getSessionId(),
                productId: productId,
                quantity: quantity
            })
        });
        await updateCartCount();
        showToast('Product added to cart!');
    } catch (error) {
        showToast('Failed to add product to cart', 'error');
    }
}

async function removeFromCart(productId) {
    try {
        await apiFetch('/api/cart/remove', {
            method: 'POST',
            body: JSON.stringify({
                sessionId: getSessionId(),
                productId: productId
            })
        });
        await updateCartCount();
        // Refresh cart page if we're on it
        if (typeof loadCartPage === 'function') {
            loadCartPage();
        }
        showToast('Product removed from cart');
    } catch (error) {
        showToast('Failed to remove product', 'error');
    }
}

async function updateCartQuantity(productId, quantity) {
    try {
        await apiFetch('/api/cart/update', {
            method: 'POST',
            body: JSON.stringify({
                sessionId: getSessionId(),
                productId: productId,
                quantity: quantity
            })
        });
        await updateCartCount();
        if (typeof loadCartPage === 'function') {
            loadCartPage();
        }
    } catch (error) {
        showToast('Failed to update cart', 'error');
    }
}

async function getCartItems() {
    return await apiFetch(`/api/cart?sessionId=${getSessionId()}`);
}

async function updateCartCount() {
    try {
        const items = await getCartItems();
        const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
        // Update all cart count badges on the page
        document.querySelectorAll('.cart-count').forEach(el => {
            el.textContent = totalCount;
            el.style.display = totalCount > 0 ? 'inline-flex' : 'none';
        });
    } catch (error) {
        // Silently fail - cart count is not critical
    }
}

// ── Toast Notification ─────────────────────────────────────────
function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.getElementById('store-toast');
    if (existingToast) existingToast.remove();

    const bgColor = type === 'success' ? '#28a745' : '#dc3545';
    const toast = document.createElement('div');
    toast.id = 'store-toast';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 99999;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: opacity 0.3s ease, transform 0.3s ease;
        transform: translateY(-10px);
        opacity: 0;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ── URL Parameter Helper ───────────────────────────────────────
function getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// ── Initialize on page load ────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    updateCartCount();
});
