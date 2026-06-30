-- Supabase SQL Schema for Electro Store
-- Copy and paste this code into your Supabase SQL Editor and run it.

-- 1. Create Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    sort_order INT DEFAULT 0
);

-- 2. Create Products Table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    compare_price DECIMAL(10,2),
    stock INT DEFAULT 0,
    image TEXT NOT NULL,
    featured INT DEFAULT 0,
    new_arrival INT DEFAULT 0,
    top_selling INT DEFAULT 0,
    sort_order INT DEFAULT 0
);

-- 3. Create Cart Items Table
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    quantity INT DEFAULT 1
);

-- 4. Create Orders Table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Order Items Table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL
);

-- 6. Create Contacts Table
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Seed Initial Data
-- Categories
INSERT INTO categories (id, name, slug, sort_order) VALUES
(1, 'Accessories', 'accessories', 1),
(2, 'Electronics & Computer', 'electronics-computer', 2),
(3, 'Laptops & Desktops', 'laptops-desktops', 3),
(4, 'Mobiles & Tablets', 'mobiles-tablets', 4),
(5, 'SmartPhone & Smart TV', 'smartphone-smarttv', 5)
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO products (id, category_id, name, description, price, compare_price, stock, image, featured, new_arrival, top_selling, sort_order) VALUES
(1, 5, 'Apple iPad Mini G2356', 'High-performance Apple iPad Mini with gorgeous display, fast A-series chip, and long battery life.', 1050.00, 1250.00, 25, 'img/product-3.png', 1, 1, 1, 1),
(2, 5, 'Samsung Galaxy Tab S9', 'Android tablet with AMOLED screen, S-Pen included, and top-tier Snapdragon processor.', 850.00, 999.00, 15, 'img/product-4.png', 1, 1, 0, 2),
(3, 2, 'Smart Camera DVR-90', 'Security smart camera with motion tracking, night vision, and 2-way audio communication.', 150.00, 250.00, 50, 'img/product-1.png', 1, 0, 1, 3),
(4, 1, 'Smart Watch Active 4', 'Fitness tracker smart watch with heart rate monitor, sleep tracking, and built-in GPS.', 199.00, 249.00, 40, 'img/product-2.png', 1, 1, 1, 4),
(5, 3, 'HP ProBook 450 G10', 'HP business laptop with Core i7 processor, 16GB RAM, and 512GB fast NVMe SSD storage.', 950.00, 1100.00, 12, 'img/product-5.png', 0, 1, 0, 5),
(6, 3, 'Dell XPS 13 Plus', 'Ultra-thin Dell laptop with stunning infinity edge display, Intel Core Ultra 7 processor.', 1350.00, 1499.00, 8, 'img/product-6.png', 1, 0, 1, 6),
(7, 5, 'Apple iPhone 15 Pro', 'Titanium-built iPhone 15 Pro with advanced triple-lens camera, Action button, and A17 Pro chip.', 999.00, 1099.00, 30, 'img/product-7.png', 1, 1, 1, 7),
(8, 5, 'Sony Bravia 55" OLED TV', 'Sony 4K HDR Bravia OLED smart television with Google TV interface and acoustic surface audio.', 1200.00, 1450.00, 5, 'img/product-8.png', 1, 0, 1, 8),
(9, 1, 'Logitech G PRO Wireless Mouse', 'Lightweight gaming wireless mouse with HERO 25K optical sensor and customizable RGB lighting.', 119.00, 149.00, 35, 'img/product-9.png', 0, 1, 1, 9),
(10, 1, 'Mechanical Keyboard RGB', 'Tactile mechanical keyboard with custom switches, RGB backlighting, and media scroll wheel.', 89.00, 109.00, 20, 'img/product-10.png', 0, 1, 0, 10),
(11, 1, 'Wireless Noise Canceling Headphones', 'Over-ear headphones with active noise cancellation, high-resolution audio, and 40h battery.', 249.00, 299.00, 18, 'img/product-11.png', 1, 0, 1, 11),
(12, 1, 'USB-C Multiport Adapter 8-in-1', 'Aluminium hub containing HDMI 4K port, USB-C Power Delivery, SD/MicroSD card reader, and USB 3.0 ports.', 39.00, 49.00, 80, 'img/product-12.png', 0, 1, 0, 12),
(13, 2, 'Portable External SSD 1TB', 'Ultra-fast read/write speeds up to 1050MB/s, durable casing, USB-C interface.', 99.00, 129.00, 45, 'img/product-13.png', 0, 1, 1, 13),
(14, 3, 'Lenovo ThinkPad X1 Carbon', 'Super-lightweight carbon fiber chassis business laptop, Intel Evo Core Ultra 7 processor.', 1450.00, 1699.00, 6, 'img/product-14.png', 1, 0, 0, 14),
(15, 3, 'Apple MacBook Air M3', 'Super-slim Apple MacBook Air featuring the advanced M3 chip, 13.6-inch Liquid Retina display.', 1099.00, 1199.00, 14, 'img/product-15.png', 1, 1, 1, 15),
(16, 2, 'Smart Home Hub Google Nest', 'Control your smart home appliances, play music, set timers, and search with Google Assistant voice control.', 79.00, 99.00, 25, 'img/product-16.png', 0, 0, 1, 16),
(17, 1, 'Smart Bluetooth Speaker Portable', 'Waterproof wireless bluetooth speaker with deep bass, 360-degree sound, and up to 24h play time.', 59.00, 79.00, 60, 'img/product-17.png', 0, 1, 0, 17),
(18, 1, 'High Speed HDMI 2.1 Cable 2m', 'Ultra high speed HDMI cable supporting 8K @ 60Hz and 4K @ 120Hz resolutions, gold plated connectors.', 15.00, 19.99, 120, 'img/product-18.png', 0, 1, 0, 18)
ON CONFLICT (id) DO NOTHING;
