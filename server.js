import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

// ── Telegram Bot Configuration ──────────────────────────────────
const TELEGRAM_BOT_TOKEN = '8869498318:AAGQrO9_wToisCnYEiN_oifY5iop12r455U';
const TELEGRAM_CHAT_ID = '1858640798';

function sendTelegramNotification(orderData) {
  const { orderNumber, customerName, email, phone, address, total, items } = orderData;

  let itemsList = '';
  if (items && items.length > 0) {
    itemsList = items.map((item, i) => 
      `   ${i + 1}. ${item.name} × ${item.quantity} — $${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');
  }

  const message = `
🛒 *NEW ORDER RECEIVED!*
━━━━━━━━━━━━━━━━━━━━
📦 *Order:* \`${orderNumber}\`
👤 *Customer:* ${customerName}
📧 *Email:* ${email}
📱 *Phone:* ${phone || 'Not provided'}
📍 *Address:* ${address}
━━━━━━━━━━━━━━━━━━━━
🛍️ *Items:*
${itemsList}
━━━━━━━━━━━━━━━━━━━━
💰 *Total: $${parseFloat(total).toFixed(2)}*
🕐 *Time:* ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' })}
  `.trim();

  const payload = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'Markdown'
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Telegram notification sent successfully!');
      } else {
        console.error('❌ Telegram notification failed:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Telegram notification error:', error.message);
  });

  req.write(payload);
  req.end();
}

const DB_PATH = path.resolve('data/store.db');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
// Serve static files from root directory
app.use(express.static(path.resolve('.')));

// ── Database Configuration (Hybrid SQLite & Supabase) ───────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const useSupabase = !!(SUPABASE_URL && SUPABASE_KEY);

let supabase = null;
if (useSupabase) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('Using SUPABASE cloud database connection.');
} else {
  console.log('Using LOCAL SQLite database connection.');
}

function getDb() {
  return new DatabaseSync(DB_PATH);
}

// ── API Endpoints ─────────────────────────────────────────────

// 1. Get Categories
app.get('/api/categories', async (req, res) => {
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('Supabase failed to fetch categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  } else {
    const db = getDb();
    try {
      const stmt = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC');
      const categories = stmt.all();
      res.json(categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    } finally {
      db.close();
    }
  }
});

// 2. Get Products (supports query filters)
app.get('/api/products', async (req, res) => {
  const { category, type, search, limit } = req.query;

  if (useSupabase) {
    try {
      let query;
      if (category) {
        // filter by category slug
        query = supabase
          .from('products')
          .select('*, categories!inner(name, slug)')
          .eq('categories.slug', category);
      } else {
        query = supabase
          .from('products')
          .select('*, categories(name, slug)');
      }

      if (type === 'featured') query = query.eq('featured', 1);
      else if (type === 'new_arrival') query = query.eq('new_arrival', 1);
      else if (type === 'top_selling') query = query.eq('top_selling', 1);

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      query = query.order('sort_order', { ascending: true });

      if (limit) {
        query = query.limit(parseInt(limit));
      }

      const { data, error } = await query;
      if (error) throw error;

      // Map Supabase layout to SQLite compatibility flat model
      const products = data.map(p => ({
        id: p.id,
        category_id: p.category_id,
        name: p.name,
        description: p.description,
        price: p.price,
        compare_price: p.compare_price,
        stock: p.stock,
        image: p.image,
        featured: p.featured,
        new_arrival: p.new_arrival,
        top_selling: p.top_selling,
        sort_order: p.sort_order,
        category_name: p.categories?.name || 'Electronics',
        category_slug: p.categories?.slug || ''
      }));

      res.json(products);
    } catch (error) {
      console.error('Supabase failed to fetch products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  } else {
    const db = getDb();
    try {
      let sql = `
        SELECT p.*, c.name as category_name, c.slug as category_slug 
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (category) {
        sql += ' AND c.slug = ?';
        params.push(category);
      }

      if (type === 'featured') {
        sql += ' AND p.featured = 1';
      } else if (type === 'new_arrival') {
        sql += ' AND p.new_arrival = 1';
      } else if (type === 'top_selling') {
        sql += ' AND p.top_selling = 1';
      }

      if (search) {
        sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      sql += ' ORDER BY p.sort_order ASC';

      if (limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(limit));
      }

      const stmt = db.prepare(sql);
      const products = stmt.all(...params);
      res.json(products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    } finally {
      db.close();
    }
  }
});

// 3. Get Single Product
app.get('/api/products/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, slug)')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const product = {
        id: data.id,
        category_id: data.category_id,
        name: data.name,
        description: data.description,
        price: data.price,
        compare_price: data.compare_price,
        stock: data.stock,
        image: data.image,
        featured: data.featured,
        new_arrival: data.new_arrival,
        top_selling: data.top_selling,
        sort_order: data.sort_order,
        category_name: data.categories?.name || 'Electronics',
        category_slug: data.categories?.slug || ''
      };

      res.json(product);
    } catch (error) {
      console.error('Supabase failed to fetch product:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  } else {
    const db = getDb();
    try {
      const stmt = db.prepare(`
        SELECT p.*, c.name as category_name, c.slug as category_slug 
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
      `);
      const product = stmt.all(id)[0];
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    } finally {
      db.close();
    }
  }
});

// 4. Get Cart Items
app.get('/api/cart', async (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) {
    return res.json([]);
  }

  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, products(*)')
        .eq('session_id', sessionId);

      if (error) throw error;

      const items = data.map(item => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        name: item.products?.name,
        price: item.products?.price,
        image: item.products?.image,
        compare_price: item.products?.compare_price
      }));

      res.json(items);
    } catch (error) {
      console.error('Supabase failed to fetch cart:', error);
      res.status(500).json({ error: 'Failed to fetch cart' });
    }
  } else {
    const db = getDb();
    try {
      const stmt = db.prepare(`
        SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image, p.compare_price
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.session_id = ?
      `);
      const items = stmt.all(sessionId);
      res.json(items);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      res.status(500).json({ error: 'Failed to fetch cart' });
    } finally {
      db.close();
    }
  }
});

// 5. Add to Cart
app.post('/api/cart/add', async (req, res) => {
  const { sessionId, productId, quantity = 1 } = req.body;
  if (!sessionId || !productId) {
    return res.status(400).json({ error: 'Missing sessionId or productId' });
  }

  if (useSupabase) {
    try {
      // Check if product exists
      const { data: pData, error: pErr } = await supabase
        .from('products')
        .select('id')
        .eq('id', parseInt(productId))
        .maybeSingle();

      if (pErr) throw pErr;
      if (!pData) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check if cart item already exists
      const { data: existing, error: eErr } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('session_id', sessionId)
        .eq('product_id', parseInt(productId))
        .maybeSingle();

      if (eErr) throw eErr;

      if (existing) {
        const { error: uErr } = await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id);
        if (uErr) throw uErr;
      } else {
        const { error: iErr } = await supabase
          .from('cart_items')
          .insert({
            session_id: sessionId,
            product_id: parseInt(productId),
            quantity
          });
        if (iErr) throw iErr;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Supabase failed to add to cart:', error);
      res.status(500).json({ error: 'Failed to add to cart' });
    }
  } else {
    const db = getDb();
    try {
      // Check if product exists
      const checkProduct = db.prepare('SELECT id FROM products WHERE id = ?');
      const product = checkProduct.all(parseInt(productId))[0];
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check if item already in cart
      const checkCart = db.prepare('SELECT id, quantity FROM cart_items WHERE session_id = ? AND product_id = ?');
      const existingItem = checkCart.all(sessionId, parseInt(productId))[0];

      if (existingItem) {
        const updateStmt = db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?');
        updateStmt.run(existingItem.quantity + quantity, existingItem.id);
      } else {
        const insertStmt = db.prepare('INSERT INTO cart_items (session_id, product_id, quantity) VALUES (?, ?, ?)');
        insertStmt.run(sessionId, parseInt(productId), quantity);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to add to cart:', error);
      res.status(500).json({ error: 'Failed to add to cart' });
    } finally {
      db.close();
    }
  }
});

// 6. Update Cart Quantity
app.post('/api/cart/update', async (req, res) => {
  const { sessionId, productId, quantity } = req.body;
  if (!sessionId || !productId || quantity === undefined) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  if (useSupabase) {
    try {
      if (quantity <= 0) {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('session_id', sessionId)
          .eq('product_id', parseInt(productId));
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: parseInt(quantity) })
          .eq('session_id', sessionId)
          .eq('product_id', parseInt(productId));
        if (error) throw error;
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Supabase failed to update cart:', error);
      res.status(500).json({ error: 'Failed to update cart' });
    }
  } else {
    const db = getDb();
    try {
      if (quantity <= 0) {
        const deleteStmt = db.prepare('DELETE FROM cart_items WHERE session_id = ? AND product_id = ?');
        deleteStmt.run(sessionId, parseInt(productId));
      } else {
        const updateStmt = db.prepare('UPDATE cart_items SET quantity = ? WHERE session_id = ? AND product_id = ?');
        updateStmt.run(quantity, sessionId, parseInt(productId));
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to update cart:', error);
      res.status(500).json({ error: 'Failed to update cart' });
    } finally {
      db.close();
    }
  }
});

// 7. Remove from Cart
app.post('/api/cart/remove', async (req, res) => {
  const { sessionId, productId } = req.body;
  if (!sessionId || !productId) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  if (useSupabase) {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('session_id', sessionId)
        .eq('product_id', parseInt(productId));
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      console.error('Supabase failed to remove from cart:', error);
      res.status(500).json({ error: 'Failed to remove from cart' });
    }
  } else {
    const db = getDb();
    try {
      const stmt = db.prepare('DELETE FROM cart_items WHERE session_id = ? AND product_id = ?');
      stmt.run(sessionId, parseInt(productId));
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      res.status(500).json({ error: 'Failed to remove from cart' });
    } finally {
      db.close();
    }
  }
});

// 8. Place Order (Checkout)
app.post('/api/checkout', async (req, res) => {
  const { sessionId, customerName, email, phone, address, total } = req.body;
  if (!sessionId || !customerName || !email || !address || !total) {
    return res.status(400).json({ error: 'Missing checkout parameters' });
  }

  const orderNumber = 'EL-' + Date.now().toString().slice(-8) + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
  let cartItems = [];

  if (useSupabase) {
    try {
      // Get cart items to insert into order items
      const { data: cartData, error: cErr } = await supabase
        .from('cart_items')
        .select('*, products(*)')
        .eq('session_id', sessionId);

      if (cErr) throw cErr;
      if (!cartData || cartData.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
      }

      cartItems = cartData.map(item => ({
        product_id: item.product_id,
        name: item.products?.name,
        price: item.products?.price,
        quantity: item.quantity
      }));

      // Insert Order
      const { data: orderData, error: oErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_name: customerName,
          email,
          phone: phone || null,
          address,
          total: parseFloat(total)
        })
        .select()
        .single();

      if (oErr) throw oErr;

      // Insert Order Items
      const orderItemsRows = cartItems.map(item => ({
        order_id: orderData.id,
        product_id: item.product_id,
        product_name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      const { error: oiErr } = await supabase
        .from('order_items')
        .insert(orderItemsRows);

      if (oiErr) throw oiErr;

      // Update product stock (for each product)
      for (const item of cartData) {
        const currentStock = item.products?.stock || 0;
        const newStock = Math.max(0, currentStock - item.quantity);
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.product_id);
      }

      // Clear cart
      const { error: ccErr } = await supabase
        .from('cart_items')
        .delete()
        .eq('session_id', sessionId);

      if (ccErr) throw ccErr;

    } catch (error) {
      console.error('Supabase checkout failed:', error);
      return res.status(500).json({ error: 'Checkout failed' });
    }
  } else {
    const db = getDb();
    try {
      // Get cart items to insert into order items
      const getCartItems = db.prepare(`
        SELECT ci.product_id, ci.quantity, p.name, p.price 
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.session_id = ?
      `);
      const sqliteCart = getCartItems.all(sessionId);
      if (sqliteCart.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
      }

      cartItems = sqliteCart.map(item => ({
        product_id: item.product_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      // Begin manual transaction
      db.exec('BEGIN TRANSACTION');

      const insertOrder = db.prepare(`
        INSERT INTO orders (order_number, customer_name, email, phone, address, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertOrder.run(orderNumber, customerName, email, phone || null, address, parseFloat(total));

      // Get the last inserted order id
      const getOrderId = db.prepare('SELECT last_insert_rowid() as id');
      const orderId = getOrderId.all()[0].id;

      const insertOrderItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
        VALUES (?, ?, ?, ?, ?)
      `);
      const updateStock = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');

      for (const item of sqliteCart) {
        insertOrderItem.run(orderId, item.product_id, item.name, item.price, item.quantity);
        updateStock.run(item.quantity, item.product_id);
      }

      // Clear cart
      const clearCart = db.prepare('DELETE FROM cart_items WHERE session_id = ?');
      clearCart.run(sessionId);

      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      console.error('Checkout failed:', error);
      return res.status(500).json({ error: 'Checkout failed' });
    } finally {
      db.close();
    }
  }

  // Common: Save order details to a local JSON file (data/orders.json)
  try {
    const fileOrderData = {
      orderNumber,
      customerName,
      email,
      phone: phone || null,
      address,
      total: parseFloat(total),
      createdAt: new Date().toISOString(),
      items: cartItems
    };
    
    const ordersFilePath = path.resolve('data/orders.json');
    let ordersList = [];
    if (fs.existsSync(ordersFilePath)) {
      const fileContent = fs.readFileSync(ordersFilePath, 'utf8');
      try {
        ordersList = JSON.parse(fileContent);
      } catch (e) {
        console.error('Error parsing orders file, resetting:', e);
      }
    }
    ordersList.push(fileOrderData);
    fs.writeFileSync(ordersFilePath, JSON.stringify(ordersList, null, 2), 'utf8');
  } catch (fileErr) {
    console.error('Failed to write order to file:', fileErr);
  }

  // Send Telegram notification for the new order
  sendTelegramNotification({
    orderNumber,
    customerName,
    email,
    phone,
    address,
    total,
    items: cartItems
  });

  res.json({ success: true, orderNumber });
});

// 9. Contact Submit
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  if (useSupabase) {
    try {
      const { error } = await supabase
        .from('contacts')
        .insert({ name, email, subject, message });
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      console.error('Supabase contact submission failed:', error);
      res.status(500).json({ error: 'Contact submission failed' });
    }
  } else {
    const db = getDb();
    try {
      const stmt = db.prepare('INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)');
      stmt.run(name, email, subject || null, message);
      res.json({ success: true });
    } catch (error) {
      console.error('Contact submission failed:', error);
      res.status(500).json({ error: 'Contact submission failed' });
    } finally {
      db.close();
    }
  }
});

// Serve main routes explicitly for routing ease (fallback)
app.get('*', (req, res, next) => {
  // If request is not an API request and doesn't specify extension, serve index.html
  if (!req.path.startsWith('/api') && !req.path.includes('.')) {
    res.sendFile(path.resolve('index.html'));
  } else {
    next();
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Electro store server running at http://localhost:${port}`);
});

export default app;
