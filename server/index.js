const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('node:crypto');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const uuidv4 = crypto.randomUUID;
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8000;
const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';

// YooKassa Configuration
// Credentials are loaded only from the server environment; never commit .env.
const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID || '';
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || '';
const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3/payments';

function normalizePhoneForYooKassa(phone) {
  const raw = String(phone || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 11 && digits.startsWith('8')) {
    return `+7${digits.slice(1)}`;
  }
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+7${digits}`;
  }
  if (raw.startsWith('+')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

function buildYooKassaReceipt(items, totalAmount, customerEmail, customerPhone) {
  const list = Array.isArray(items) ? items : [];
  const receiptItems = [];
  let productsTotal = 0;

  list.forEach((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.price);
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    const safeUnitPrice = Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0;
    if (safeUnitPrice <= 0) return;

    productsTotal += safeUnitPrice * safeQuantity;

    receiptItems.push({
      description: String(item.name || 'Товар').slice(0, 128),
      quantity: safeQuantity,
      amount: {
        value: safeUnitPrice.toFixed(2),
        currency: 'RUB'
      },
      vat_code: 1,
      payment_mode: 'full_payment',
      payment_subject: 'commodity'
    });
  });

  const deliveryAmount = Math.max(0, Number(totalAmount) - productsTotal);
  if (deliveryAmount > 0) {
    receiptItems.push({
      description: 'Доставка',
      quantity: 1,
      amount: {
        value: deliveryAmount.toFixed(2),
        currency: 'RUB'
      },
      vat_code: 1,
      payment_mode: 'full_payment',
      payment_subject: 'service'
    });
  }

  if (receiptItems.length === 0) return null;

  const email = String(customerEmail || '').trim();
  const phone = normalizePhoneForYooKassa(customerPhone);
  const customer = {};
  if (email) customer.email = email;
  if (phone) customer.phone = phone;
  if (!customer.email && !customer.phone) return null;

  return {
    customer,
    items: receiptItems
  };
}

function buildReturnUrl(req, orderId) {
  const configuredBaseUrl = String(BASE_URL || '').trim().replace(/\/+$/, '');
  const isConfiguredProdUrl = configuredBaseUrl && !/localhost|127\.0\.0\.1/.test(configuredBaseUrl);
  if (isConfiguredProdUrl) {
    const normalizedBaseUrl = configuredBaseUrl.replace(/^http:\/\//i, 'https://');
    return `${normalizedBaseUrl}/checkout.html?payment=return&orderId=${encodeURIComponent(orderId)}`;
  }

  const host = req.get('host');
  const rawProto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const proto = String(rawProto).split(',')[0].trim();
  const isLocalHost = /localhost|127\.0\.0\.1/.test(host || '');
  const protocol = isLocalHost ? proto : 'https';
  return `${protocol}://${host}/checkout.html?payment=return&orderId=${encodeURIComponent(orderId)}`;
}

require('./site-security')(app, express, path.join(__dirname, '..'));
app.use(bodyParser.json({ limit: '64kb' }));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../images/products');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-originalName
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed!'));
  }
});

// Serve static files for the main site
// Static files are served through the explicit allowlist in site-security.js.

// Serve static files for the admin panel
// Admin assets are served after server-side authentication.

// Catch-all handler for admin panel client-side routing
app.get('/admin/*', (req, res, next) => {
  // Check if it's an API call or static file
  if (req.path.startsWith('/api') || req.path.includes('.')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../admin/index.html'));
});

// API Routes

// Get all products
app.get('/api/products', (req, res) => {
  const sql = "SELECT * FROM products";
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});

// Create a new product (Admin)
app.post('/api/products', upload.single('image'), (req, res) => {
  const { name, description, composition, usage, price, inStock, isActive, image: imageText } = req.body;
  
  // Determine image source: uploaded file path or text/emoji
  let imagePath = imageText || '🧼'; // Default fallback
  if (req.file) {
    // Save relative path for frontend usage
    imagePath = `/images/products/${req.file.filename}`;
  }

  const sql = `INSERT INTO products (name, description, composition, usage, price, image, inStock, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const now = new Date().toISOString();
  const params = [name, description, composition, usage, price, imagePath, inStock ? 1 : 0, isActive ? 1 : 0, now, now];
  
  db.run(sql, params, function (err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": { id: this.lastID, ...req.body, image: imagePath, createdAt: now, updatedAt: now }
    });
  });
});

// Update a product (Admin)
app.put('/api/products/:id', upload.single('image'), (req, res) => {
  const { name, description, composition, usage, price, inStock, isActive, image: imageText } = req.body;
  
  // Determine new image path
  let imagePath = imageText; // Keep existing if no new file
  if (req.file) {
    imagePath = `/images/products/${req.file.filename}`;
  }
  
  // If we have a new image (file or text) update it, otherwise keep current in DB logic (but here we construct full SQL)
  // Actually, for simplicity, we'll update all fields. The frontend should send the old image path if no new file is selected, OR we handle it here.
  // Best practice: Frontend sends 'image' as text if no file, or we check if imagePath is defined.
  
  // If imagePath is undefined (no file and no text sent), we should probably fetch existing or just not update that field.
  // Let's assume frontend sends the old image string if no new file is uploaded, OR we just update if we have something.
  
  // However, simpler approach: construct query dynamically or just assume image is passed.
  // If req.file is present, we use it. If not, we use req.body.image (which might be the old path).
  
  if (!imagePath) {
      // If absolutely nothing provided, maybe don't update image? 
      // But let's assume the client sends the current image path in the body if not uploading a new one.
  }

  const sql = `UPDATE products SET name = ?, description = ?, composition = ?, usage = ?, price = ?, image = ?, inStock = ?, isActive = ?, updatedAt = ? WHERE id = ?`;
  const now = new Date().toISOString();
  const params = [name, description, composition, usage, price, imagePath, inStock ? 1 : 0, isActive ? 1 : 0, now, req.params.id];
  
  db.run(sql, params, function (err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": { id: req.params.id, ...req.body, image: imagePath, updatedAt: now }
    });
  });
});

// Delete a product (Admin)
app.delete('/api/products/:id', (req, res) => {
  const sql = 'DELETE FROM products WHERE id = ?';
  db.run(sql, req.params.id, function (err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({ "message": "deleted", changes: this.changes });
  });
});

// Create a new order
app.post('/api/orders', async (req, res) => {
  const { customerName, customerEmail, customerPhone, delivery, payment, comment } = req.body;
  let { items } = req.body;
  if (req.body.termsAccepted !== true || req.body.legalVersion !== '2026-09-27') {
    return res.status(400).json({ error: 'Примите актуальную оферту перед оформлением заказа.' });
  }
  if (typeof customerName !== 'string' || customerName.trim().length < 2 || customerName.length > 200 ||
      typeof customerPhone !== 'string' || customerPhone.length > 40 || !/^\+?[0-9 ()-]{10,25}$/.test(customerPhone) ||
      !Array.isArray(items) || !items.length || items.length > 100 || !delivery || !payment ||
      !['card', 'yookassa'].includes(payment.method) ||
      (customerEmail && (typeof customerEmail !== 'string' || customerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))) ||
      (comment && (typeof comment !== 'string' || comment.length > 2000))) {
    return res.status(400).json({ error: 'Проверьте данные заказа.' });
  }
  if (Object.values(delivery).some(value => value != null && (typeof value !== 'string' || value.length > 1000))) {
    return res.status(400).json({ error: 'Проверьте адрес доставки.' });
  }
  if (delivery.method !== 'pickup' && !String(delivery.address || '').trim() &&
      !(String(delivery.city || '').trim() && String(delivery.street || '').trim() && String(delivery.house || '').trim())) {
    return res.status(400).json({ error: 'Укажите адрес доставки.' });
  }
  if (delivery.method === 'pickup') {
    for (const key of ['address', 'city', 'street', 'house', 'apartment']) delivery[key] = '';
  }
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    return res.status(503).json({ error: 'Оплата временно недоступна. Свяжитесь с магазином.' });
  }
  const getRow = (sql, args) => new Promise((resolve, reject) => db.get(sql, args, (err, row) => err ? reject(err) : resolve(row)));
  let totalAmount;
  try {
    const shipping = await getRow('SELECT * FROM delivery_options WHERE id = ? AND isActive = 1', [delivery.method]);
    if (!shipping || !Number.isFinite(Number(shipping.price)) || Number(shipping.price) < 0) throw new Error('Invalid delivery');
    const canonical = [];
    for (const item of items) {
      if (!item || !Number.isSafeInteger(Number(item.id)) || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) throw new Error('Invalid item');
      const product = await getRow('SELECT * FROM products WHERE id = ? AND isActive = 1 AND inStock = 1', [Number(item.id)]);
      if (!product || !Number.isFinite(Number(product.price)) || Number(product.price) <= 0) throw new Error('Unavailable item');
      canonical.push({ id: product.id, name: product.name, price: Number(product.price), quantity: item.quantity, image: product.image });
    }
    items = canonical;
    totalAmount = (items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0) + Math.round(Number(shipping.price) * 100)) / 100;
    if (Math.round(Number(req.body.totalAmount) * 100) !== Math.round(totalAmount * 100)) {
      return res.status(409).json({ error: 'Стоимость изменилась. Обновите страницу и проверьте заказ.' });
    }
  } catch (_) { return res.status(400).json({ error: 'Товар или доставка недоступны. Обновите корзину.' }); }

  
  const orderId = 'ORD-' + uuidv4();
  const now = new Date().toISOString();
  const amountNumber = Number(totalAmount);
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return res.status(400).json({ "error": "Invalid order amount" });
  }
  
  const sqlOrder = `INSERT INTO orders (id, customerName, customerEmail, customerPhone, totalAmount, deliveryMethod, deliveryAddress, deliveryCity, deliveryStreet, deliveryHouse, deliveryApartment, paymentMethod, comment, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  // Construct delivery address: prefer structured data if available, otherwise fallback to single field
  let deliveryAddress = delivery.address;
  if (delivery.city && delivery.street) {
    deliveryAddress = `${delivery.city}, ${delivery.street}, ${delivery.house}, кв. ${delivery.apartment || '-'}`;
  } else if (!deliveryAddress) {
    deliveryAddress = 'Не указан';
  }
  
  const paramsOrder = [orderId, customerName, customerEmail, customerPhone, totalAmount, delivery.method, deliveryAddress, delivery.city, delivery.street, delivery.house, delivery.apartment, payment.method, comment, now, now];
  
  db.run(sqlOrder, paramsOrder, async function (err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    
    // Save contract evidence, not a fictitious personal-data consent.
    try {
      const offer = fs.readFileSync(path.join(__dirname, '../offer.html'), 'utf8');
      const privacy = fs.readFileSync(path.join(__dirname, '../privacy.html'), 'utf8');
      await new Promise((resolve, reject) => db.run(
        'INSERT INTO order_legal (orderId, acceptedAt, version, offerHash, offerSnapshot, privacySnapshot) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, now, '2026-09-27', crypto.createHash('sha256').update(offer).digest('hex'), offer, privacy],
        error => error ? reject(error) : resolve()
      ));
    } catch (_) {
      db.run('DELETE FROM orders WHERE id = ?', [orderId]);
      return res.status(503).json({ error: 'Не удалось сохранить подтверждение заказа. Повторите попытку позже.' });
    }

    // Insert items
    const sqlItem = `INSERT INTO order_items (orderId, productId, name, price, quantity, image) VALUES (?, ?, ?, ?, ?, ?)`;
    const stmt = db.prepare(sqlItem);
    
    items.forEach(item => {
      stmt.run(orderId, item.id, item.name, item.price, item.quantity, item.image);
    });
    stmt.finalize();

    // Handle Payment
    if (payment.method === 'card' || payment.method === 'yookassa') {
      try {
        const idempotenceKey = uuidv4();
        const returnUrl = buildReturnUrl(req, orderId);
        const receipt = buildYooKassaReceipt(items, amountNumber, customerEmail, customerPhone);
        if (!receipt) {
          return res.status(400).json({ "error": "Receipt data is invalid for YooKassa payment" });
        }

        const paymentResponse = await axios.post(
          YOOKASSA_API_URL,
          {
            amount: {
              value: amountNumber.toFixed(2),
              currency: 'RUB'
            },
            capture: true,
            confirmation: {
              type: 'redirect',
              return_url: returnUrl
            },
            description: `Order #${orderId}`,
            receipt
          },
          {
            headers: {
              'Idempotence-Key': idempotenceKey,
              'Authorization': 'Basic ' + Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64'),
              'Content-Type': 'application/json'
            }
          }
        );

        const paymentData = paymentResponse.data;
        const paymentId = paymentData.id;
        const confirmationUrl = paymentData.confirmation.confirmation_url;

        // Update order with paymentId
        db.run('UPDATE orders SET paymentId = ?, status = ? WHERE id = ?', [paymentId, 'pending_payment', orderId], (updateErr) => {
           if (updateErr) console.error('Error updating order with payment ID:', updateErr);
        });

        res.json({
          "message": "success",
          "data": { 
            id: orderId,
            paymentUrl: confirmationUrl
          }
        });
        return;

      } catch (paymentError) {
        console.error('YooKassa payment creation failed:', paymentError.response?.status || 'network error');
        db.run('UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?', ['payment_error', new Date().toISOString(), orderId], (updateErr) => {
          if (updateErr) console.error('Error updating failed payment status:', updateErr);
        });
        res.status(502).json({
          "error": "YooKassa payment creation failed"
        });
        return;
      }
    }
    
    res.json({
      "message": "success",
      "data": { id: orderId }
    });
  });
});

// Get all orders (Admin)
app.get('/api/orders', (req, res) => {
  const sql = "SELECT * FROM orders ORDER BY createdAt DESC";
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    
    // For simplicity, we are not fetching items for the list view right now, 
    // or we could do a join. For now let's just return orders.
    // Ideally we should fetch items too.
    
    const orders = rows;
    const promises = orders.map(order => {
      return new Promise((resolve, reject) => {
        db.all("SELECT * FROM order_items WHERE orderId = ?", [order.id], (err, items) => {
          if (err) reject(err);
          order.items = items;
          
          // Reconstruct delivery object structure for frontend compatibility
          order.delivery = {
            method: order.deliveryMethod,
            address: order.deliveryAddress,
            city: order.deliveryCity,
            street: order.deliveryStreet,
            house: order.deliveryHouse,
            apartment: order.deliveryApartment
          };
          order.payment = {
            method: order.paymentMethod
          };
          
          resolve(order);
        });
      });
    });
    
    Promise.all(promises).then(completedOrders => {
      res.json({
        "message": "success",
        "data": completedOrders
      });
    }).catch(err => {
      res.status(400).json({ "error": err.message });
    });
  });
});

// Get order status by ID (used after returning from YooKassa)
app.get('/api/orders/:id/status', (req, res) => {
  const sql = "SELECT id, status, updatedAt FROM orders WHERE id = ?";
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(400).json({ "error": err.message });
    }
    if (!row) {
      return res.status(404).json({ "error": "Order not found" });
    }
    return res.json({
      "message": "success",
      "data": row
    });
  });
});

// Update order status (Admin)
app.put('/api/orders/:id', (req, res) => {
  const { status } = req.body;
  const sql = `UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?`;
  const now = new Date().toISOString();
  
  db.run(sql, [status, now, req.params.id], function (err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": { id: req.params.id, status, updatedAt: now }
    });
  });
});

// Delete an order (Admin)
app.delete('/api/orders/:id', (req, res) => {
  db.run('DELETE FROM order_legal WHERE orderId = ?', [req.params.id]);
  const sqlOrder = 'DELETE FROM orders WHERE id = ?';
  const sqlItems = 'DELETE FROM order_items WHERE orderId = ?';
  
  db.run(sqlItems, req.params.id, function(err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    
    db.run(sqlOrder, req.params.id, function(err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "deleted", changes: this.changes });
    });
  });
});

// Admin Login
app.post('/api/login', (req, res) => {
  const { pin } = req.body;
  const sql = "SELECT * FROM admin_users WHERE pin = ?";
  db.get(sql, [pin], (err, row) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    if (row) {
      res.json({ "message": "success", "token": "dummy-token" });
    } else {
      res.status(401).json({ "message": "Invalid PIN" });
    }
  });
});

// Change Admin PIN
app.post('/api/change-pin', (req, res) => {
  const { oldPin, newPin } = req.body;
  
  if (!oldPin || !newPin) {
    return res.status(400).json({ "error": "Old PIN and New PIN are required" });
  }

  // Verify old PIN
  db.get("SELECT * FROM admin_users WHERE pin = ?", [oldPin], (err, row) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    if (!row) {
      res.status(401).json({ "error": "Неверный текущий PIN-код" });
      return;
    }

    // Update to new PIN
    // In production, PIN should be hashed!
    db.run("UPDATE admin_users SET pin = ? WHERE id = ?", [newPin, row.id], function(err) {
      if (err) {
        res.status(400).json({ "error": err.message });
        return;
      }
      res.json({ "message": "success", "changes": this.changes });
    });
  });
});

// Get delivery options
app.get('/api/delivery-options', (req, res) => {
  const sql = "SELECT * FROM delivery_options";
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});

// Update delivery option
app.put('/api/delivery-options/:id', (req, res) => {
  const { name, description, price, isActive } = req.body;
  const sql = `UPDATE delivery_options SET name = ?, description = ?, price = ?, isActive = ? WHERE id = ?`;
  const params = [name, description, price, isActive ? 1 : 0, req.params.id];
  
  db.run(sql, params, function (err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": { id: req.params.id, ...req.body }
    });
  });
});

// Get site content
app.get('/api/content', (req, res) => {
  const sql = "SELECT * FROM site_content";
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    // Convert array of rows to object { key: value }
    const content = {};
    rows.forEach(row => {
      content[row.key] = row.value;
    });
    
    res.json({
      "message": "success",
      "data": content
    });
  });
});

// Update site content
app.post('/api/content', (req, res) => {
  const updates = req.body; // Expect { key: value, key2: value2 }
  
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ "error": "Invalid body" });
  }

  const keys = Object.keys(updates);
  if (keys.length === 0) {
    return res.json({ "message": "No changes" });
  }

  // Use a transaction or sequential updates
  const stmt = db.prepare("INSERT OR REPLACE INTO site_content (key, value) VALUES (?, ?)");
  
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    
    keys.forEach(key => {
      stmt.run(key, updates[key]);
    });
    
    stmt.finalize();
    
    db.run("COMMIT", (err) => {
      if (err) {
        res.status(400).json({ "error": err.message });
        return;
      }
      res.json({ "message": "success" });
    });
  });
});

// YooKassa Webhook
app.post('/api/yookassa/webhook', async (req, res) => {
  const { event, object } = req.body;
  if (!['payment.succeeded', 'payment.canceled'].includes(event)) return res.sendStatus(200);
  if (!object || typeof object.id !== 'string' || !/^[a-zA-Z0-9-]{10,80}$/.test(object.id)) return res.sendStatus(400);
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) return res.sendStatus(503);
  try {
    const verified = await axios.get(`${YOOKASSA_API_URL}/${encodeURIComponent(object.id)}`, {
      auth: { username: YOOKASSA_SHOP_ID, password: YOOKASSA_SECRET_KEY }, timeout: 10000
    });
    const expected = event === 'payment.succeeded' ? 'succeeded' : 'canceled';
    if (verified.data.id !== object.id || verified.data.status !== expected) return res.sendStatus(400);
  } catch (_) { return res.sendStatus(502); }

  
  if (event === 'payment.succeeded') {
    const paymentId = object.id;
    
    // Update order status to 'paid'
    // We assume 'paid' means payment is successful
    db.run('UPDATE orders SET status = ?, updatedAt = ? WHERE paymentId = ?', ['paid', new Date().toISOString(), paymentId], function(err) {
      if (err) {
        console.error('Error updating order status from webhook:', err);
        res.status(500).send('Error');
        return;
      }
      console.log(`Payment ${paymentId} succeeded. Order updated.`);
      res.status(200).send('OK');
    });
  } else if (event === 'payment.canceled') {
     const paymentId = object.id;
     db.run('UPDATE orders SET status = ?, updatedAt = ? WHERE paymentId = ?', ['cancelled', new Date().toISOString(), paymentId], function(err) {
      if (err) {
        console.error('Error updating order status from webhook:', err);
        res.status(500).send('Error');
        return;
      }
      console.log(`Payment ${paymentId} canceled. Order updated.`);
      res.status(200).send('OK');
    });
  } else {
    // Other events
    res.status(200).send('OK');
  }
});

app.listen(PORT, process.env.HOST || '127.0.0.1', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
