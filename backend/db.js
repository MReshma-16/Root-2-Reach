const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        db.run('PRAGMA foreign_keys = ON');
        
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                phone TEXT NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('SELLER','CUSTOMER')),
                business_name TEXT,
                district TEXT,
                address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name_en TEXT NOT NULL,
                name_ta TEXT NOT NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS districts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name_en TEXT NOT NULL,
                name_ta TEXT NOT NULL,
                description_en TEXT,
                description_ta TEXT,
                image_url TEXT
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                name_ta TEXT,
                description TEXT,
                description_ta TEXT,
                price REAL NOT NULL DEFAULT 0,
                quantity INTEGER NOT NULL DEFAULT 0,
                image_url TEXT,
                category_id INTEGER,
                district_id INTEGER,
                seller_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id),
                FOREIGN KEY (district_id) REFERENCES districts(id),
                FOREIGN KEY (seller_id) REFERENCES users(id)
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS cart (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY (customer_id) REFERENCES users(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                total REAL NOT NULL,
                name TEXT,
                phone TEXT,
                address TEXT,
                district TEXT,
                pincode TEXT,
                status TEXT DEFAULT 'PLACED',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES users(id)
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                seller_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (seller_id) REFERENCES users(id)
            )`);

            console.log('Database tables verified/created successfully.');
        });
    }
});

module.exports = db;
