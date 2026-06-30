# Electro Store - Website URL & Route Directory

This document lists all active pages (frontend URLs) and API endpoints (backend routes) for your website. 

---

## 🌐 Frontend Pages (URLs)

When running your website locally, access these pages at `http://localhost:3000/`. When deployed online, replace `http://localhost:3000` with your production URL (e.g. `https://your-site.onrender.com`).

| Page Name | Local URL | Description |
| :--- | :--- | :--- |
| **Homepage** | [index.html](http://localhost:3000/index.html) | Main page showing banner sliders, category offers, and product tabs (All, New, Featured, Top Selling). |
| **Shop** | [shop.html](http://localhost:3000/shop.html) | Searchable catalog showing all products, category sidebar filters, and sorting option. |
| **Product Details** | [single.html?id=1](http://localhost:3000/single.html?id=1) | Dynamic details page showing image, description, price, stock quantity, and "Add to cart" button. Change `?id=1` to any product ID (e.g. `1` to `18`). |
| **Shopping Cart** | [cart.html](http://localhost:3000/cart.html) | Lists added items, lets you adjust quantities, delete items, and shows total price. |
| **Checkout** | [cheackout.html](http://localhost:3000/cheackout.html) | Billing details checkout form where customers fill details and place orders. |
| **Contact Us** | [contact.html](http://localhost:3000/contact.html) | Store locator, address coordinates, and active contact submission form. |
| **Bestsellers** | [bestseller.html](http://localhost:3000/bestseller.html) | Template page showcasing top-rated products. |
| **404 Error Page** | [404.html](http://localhost:3000/404.html) | Redirection page shown when a user visits a page that does not exist. |

---

## ⚙️ Backend API Endpoints (JSON Routes)

These are backend routes used by the frontend to fetch database records. All responses return data in JSON format.

### Products & Categories
* **Get Categories:** `GET http://localhost:3000/api/categories`
  * Returns list of all category names, slugs, and sort orders.
* **Get Products:** `GET http://localhost:3000/api/products`
  * Returns all products. You can append URL query filters:
    * Category filter: `?category=accessories`
    * Product Type: `?type=featured` or `?type=new_arrival` or `?type=top_selling`
    * Search keywords: `?search=keyboard`
    * Limit results: `?limit=4`
* **Get Single Product:** `GET http://localhost:3000/api/products/:id` (e.g. `/api/products/3`)
  * Returns detailed specifications for one product.

### Shopping Cart (Session-based)
* **Get Cart Items:** `GET http://localhost:3000/api/cart?sessionId=your_session_id`
  * Fetches the products inside the active user's cart.
* **Add to Cart:** `POST http://localhost:3000/api/cart/add`
  * Body: `{ "sessionId": "...", "productId": 3, "quantity": 1 }`
* **Update Cart Quantity:** `POST http://localhost:3000/api/cart/update`
  * Body: `{ "sessionId": "...", "productId": 3, "quantity": 2 }` (Set quantity to 0 to remove item).
* **Remove from Cart:** `POST http://localhost:3000/api/cart/remove`
  * Body: `{ "sessionId": "...", "productId": 3 }`

### Checkout & Forms
* **Place Order:** `POST http://localhost:3000/api/checkout`
  * Body: `{ "sessionId": "...", "customerName": "John Doe", "email": "john@example.com", "phone": "12345678", "address": "123 Street", "total": 1050.00 }`
  * Saves order to SQLite/Supabase database AND logs order to `data/orders.json`.
* **Contact Submission:** `POST http://localhost:3000/api/contact`
  * Body: `{ "name": "Alice", "email": "alice@example.com", "subject": "Question", "message": "Hello!" }`
