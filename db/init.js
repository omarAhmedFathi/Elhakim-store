import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_DIR = path.resolve('data');
const DB_PATH = path.join(DB_DIR, 'store.db');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

console.log('Initializing SQLite database at:', DB_PATH);
const db = new DatabaseSync(DB_PATH);

// Helper to execute raw SQL
function exec(sql) {
  db.exec(sql);
}

// 1. Create Tables
console.log('Creating tables...');

exec(`
  DROP TABLE IF EXISTS order_items;
  DROP TABLE IF EXISTS orders;
  DROP TABLE IF EXISTS cart_items;
  DROP TABLE IF EXISTS products;
  DROP TABLE IF EXISTS categories;
  DROP TABLE IF EXISTS contacts;
  DROP TABLE IF EXISTS admin_users;
`);

exec(`
  CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0
  );
`);

exec(`
  CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    compare_price REAL,
    stock INTEGER DEFAULT 0,
    image TEXT NOT NULL,
    featured INTEGER DEFAULT 0,
    new_arrival INTEGER DEFAULT 0,
    top_selling INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );
`);

exec(`
  CREATE TABLE cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );
`);

exec(`
  CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

exec(`
  CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );
`);

exec(`
  CREATE TABLE contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

exec(`
  CREATE TABLE admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );
`);

// 2. Seed Data
console.log('Seeding categories...');

const insertCategory = db.prepare('INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, ?)');
insertCategory.run('Clothes', 'clothes', 1);
insertCategory.run('Perfumes', 'perfumes', 2);
insertCategory.run('El Abayas', 'el-abayas', 3);
insertCategory.run('Makeup', 'makeup', 4);

// Fetch categories to map IDs
const getCategories = db.prepare('SELECT id, slug FROM categories');
const categoryRows = getCategories.all();
const catMap = {};
categoryRows.forEach(row => {
  catMap[row.slug] = row.id;
});

console.log('Seeding products...');
const insertProduct = db.prepare(`
  INSERT INTO products (
    category_id, name, description, price, compare_price, stock, image, featured, new_arrival, top_selling, sort_order
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Seed Products (loaded dynamically from products_seed.json)
const productsSeedPath = path.join(DB_DIR, 'products_seed.json');
const productsData = JSON.parse(fs.readFileSync(productsSeedPath, 'utf8'));

productsData.forEach(p => {
  const catId = catMap[p.category];
  insertProduct.run(
    catId, p.name, p.description, p.price, p.compare_price, p.stock, p.image, p.featured, p.new_arrival, p.top_selling, p.sort_order
  );
});

console.log(`Seeded ${productsData.length} products successfully.`);

console.log('Seeding admin user...');
const passwordHash = bcrypt.hashSync('123456', 12);
const insertAdmin = db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)');
insertAdmin.run('admin', passwordHash);

console.log('Seeding complete! Database initialized successfully.');
db.close();
