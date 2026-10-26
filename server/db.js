const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite'));

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
    // Products Table
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      composition TEXT,
      usage TEXT,
      price REAL NOT NULL,
      image TEXT,
      inStock INTEGER DEFAULT 1,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT,
      updatedAt TEXT
    )`);

    // Orders Table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customerName TEXT NOT NULL,
      customerEmail TEXT,
      customerPhone TEXT NOT NULL,
      status TEXT DEFAULT 'new',
      totalAmount REAL NOT NULL,
      deliveryMethod TEXT,
      deliveryAddress TEXT,
      deliveryCity TEXT,
      deliveryStreet TEXT,
      deliveryHouse TEXT,
      deliveryApartment TEXT,
      paymentMethod TEXT,
      paymentId TEXT,
      comment TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )`);

    // Backward-compatible migration for older databases.
    db.all(`PRAGMA table_info(orders)`, [], (err, columns) => {
      if (err) {
        console.error('Error checking orders table schema:', err.message);
        return;
      }
      const hasPaymentId = Array.isArray(columns) && columns.some((col) => col.name === 'paymentId');
      if (!hasPaymentId) {
        db.run(`ALTER TABLE orders ADD COLUMN paymentId TEXT`, (alterErr) => {
          if (alterErr) {
            console.error('Error adding paymentId column:', alterErr.message);
            return;
          }
          console.log('Added missing paymentId column to orders table.');
        });
      }
    });

    // Versioned evidence for new orders; existing orders are not given invented acceptances.
    db.run(`CREATE TABLE IF NOT EXISTS order_legal (
      orderId TEXT PRIMARY KEY, acceptedAt TEXT NOT NULL, version TEXT NOT NULL,
      offerHash TEXT NOT NULL, offerSnapshot TEXT NOT NULL, privacySnapshot TEXT NOT NULL
    )`);

    // Order Items Table
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId TEXT NOT NULL,
      productId INTEGER,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      image TEXT,
      FOREIGN KEY (orderId) REFERENCES orders (id)
    )`);

    // Admin Users Table
    db.run(`CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      pin TEXT NOT NULL
    )`);

    // Delivery Options Table
    db.run(`CREATE TABLE IF NOT EXISTS delivery_options (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      isActive INTEGER DEFAULT 1
    )`);

    // Site Content Table
    db.run(`CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);

    // Seed Data
    db.get("SELECT count(*) as count FROM products", [], (err, row) => {
      if (err) {
        return console.error(err.message);
      }
      if (row.count === 0) {
        console.log('Seeding products...');
        const products = [
          {
            name: "Мыло 'Лаванда и мед'",
            description: "Нежное мыло с экстрактом лаванды и натуральным медом. Обладает успокаивающим и антисептическим действием.",
            composition: "Оливковое масло, кокосовое масло, лавандовое масло, натуральный мед, луговой мед.",
            usage: "Нанести на влажную кожу, вспенить, смыть теплой водой. Подходит для ежедневного использования.",
            price: 350,
            image: "🧼",
            inStock: 1,
            isActive: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            name: "Мыло 'Роза и молоко'",
            description: "Кремовое мыло с розовым маслом и молочными протеинами. Идеально для чувствительной кожи.",
            composition: "Масло ши, миндальное масло, розовое масло, молочные протеины, глицерин.",
            usage: "Массирующими движениями нанести на кожу, наслаждаться ароматом, смыть водой.",
            price: 420,
            image: "🌹",
            inStock: 1,
            isActive: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];

        const insert = db.prepare(`INSERT INTO products (name, description, composition, usage, price, image, inStock, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        products.forEach((product) => {
          insert.run(product.name, product.description, product.composition, product.usage, product.price, product.image, product.inStock, product.isActive, product.createdAt, product.updatedAt);
        });
        insert.finalize();
      }
    });

    // Seed Admin
    db.get("SELECT count(*) as count FROM admin_users", [], (err, row) => {
      if (err) {
        return console.error(err.message);
      }
      if (row.count === 0) {
        console.log('Seeding admin...');
        // Simple PIN '1234' for demo purposes. In production, hash this!
        db.run(`INSERT INTO admin_users (username, pin) VALUES ('admin', '1234')`);
      }
    });

    // Seed Delivery Options
    db.get("SELECT count(*) as count FROM delivery_options", [], (err, row) => {
      if (err) {
        return console.error(err.message);
      }
      if (row.count === 0) {
        console.log('Seeding delivery options...');
        const options = [
          { id: 'pickup', name: 'Самовывоз', description: 'Бесплатно, по предварительной договоренности', price: 0 },
          { id: 'courier', name: 'Курьер', description: 'Доставка по городу от 300₽', price: 300 },
          { id: 'cdek', name: 'СДЭК', description: 'От 350₽, срок 2-5 дней', price: 350 },
          { id: 'ozon', name: 'Ozon', description: 'От 300₽, срок 2-5 дней', price: 300 }
        ];

        const insert = db.prepare(`INSERT INTO delivery_options (id, name, description, price, isActive) VALUES (?, ?, ?, ?, 1)`);
        options.forEach((opt) => {
          insert.run(opt.id, opt.name, opt.description, opt.price);
        });
        insert.finalize();
      }
    });

    // Seed Site Content
    db.get("SELECT count(*) as count FROM site_content", [], (err, row) => {
      if (err) {
        return console.error(err.message);
      }
      if (row.count === 0) {
        console.log('Seeding site content...');
        const content = [
          { key: 'hero_title', value: 'Натуральное мыло ручной работы' },
          { key: 'hero_subtitle', value: 'Экологичные ингредиенты для заботы о вашей коже' }
        ];

        const insert = db.prepare(`INSERT INTO site_content (key, value) VALUES (?, ?)`);
        content.forEach((item) => {
          insert.run(item.key, item.value);
        });
        insert.finalize();
      }
    });
  });
}

module.exports = db;
