const express = require('express');
const cors = require('cors');
const db = require('./db');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'root2reach-ecommerce-secret-2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public/images');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage });

// ========== AUTH MIDDLEWARE ==========
const auth = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        // Verify user still exists in DB (catches stale JWTs after re-seeding)
        db.get('SELECT id, role, name FROM users WHERE id = ?', [user.id], (dbErr, row) => {
            if (dbErr || !row) {
                return res.status(401).json({ error: 'Session expired. Please login again.' });
            }
            req.user = { id: row.id, role: row.role, name: row.name };
            next();
        });
    });
};
const requireRole = (role) => (req, res, next) => {
    if (req.user.role !== role) return res.status(403).json({ error: 'Access denied' });
    next();
};


// ========== AUTH ROUTES ==========
app.post('/api/auth/register', async (req, res) => {
    const { name, email, phone, password, role, business_name, district, address } = req.body;
    if (!['SELLER', 'CUSTOMER'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    try {
        const hashed = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (name,email,phone,password,role,business_name,district,address) VALUES (?,?,?,?,?,?,?,?)',
            [name, email, phone, hashed, role, business_name || null, district || null, address || null],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already exists' });
                    return res.status(500).json({ error: err.message });
                }
                const token = jwt.sign({ id: this.lastID, role, name }, JWT_SECRET, { expiresIn: '24h' });
                res.status(201).json({ token, role, name, id: this.lastID });
            });
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/auth/login', (req, res) => {
    const { email, password, role } = req.body;
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid email or password' });
        if (role && user.role !== role) return res.status(401).json({ error: `This account is not registered as ${role}` });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
        const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, role: user.role, name: user.name, id: user.id, business_name: user.business_name });
    });
});

// ========== PUBLIC ROUTES ==========
app.get('/api/products', (req, res) => {
    const { category_id, district_id, search } = req.query;
    let q = `SELECT p.*, u.name as seller_name, u.business_name, c.name_en as category_name, d.name_en as district_name
             FROM products p LEFT JOIN users u ON p.seller_id=u.id LEFT JOIN categories c ON p.category_id=c.id LEFT JOIN districts d ON p.district_id=d.id WHERE 1=1`;
    const params = [];
    if (category_id) { q += ' AND p.category_id=?'; params.push(category_id); }
    if (district_id) { q += ' AND p.district_id=?'; params.push(district_id); }
    if (search) {
        q += ' AND (p.name LIKE ? OR p.name_ta LIKE ? OR p.description LIKE ? OR p.description_ta LIKE ? OR u.name LIKE ? OR u.business_name LIKE ? OR c.name_en LIKE ? OR d.name_en LIKE ?)';
        const s = `%${search}%`; params.push(s,s,s,s,s,s,s,s);
    }
    q += ' ORDER BY p.created_at DESC';
    db.all(q, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/products/:id', (req, res) => {
    db.get(`SELECT p.*, u.name as seller_name, u.business_name, u.phone as seller_phone, u.district as seller_district, u.address as seller_address,
            c.name_en as category_name, d.name_en as district_name
            FROM products p LEFT JOIN users u ON p.seller_id=u.id LEFT JOIN categories c ON p.category_id=c.id LEFT JOIN districts d ON p.district_id=d.id
            WHERE p.id=?`, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Product not found' });
        res.json(row);
    });
});

app.get('/api/products/:id/alternatives', (req, res) => {
    db.get('SELECT name FROM products WHERE id=?', [req.params.id], (err, product) => {
        if (err || !product) return res.json([]);
        db.all(`SELECT p.*, u.name as seller_name, u.business_name, u.address as seller_address, u.district as seller_district
                FROM products p JOIN users u ON p.seller_id=u.id
                WHERE p.name = ? AND p.id != ?`, [product.name, req.params.id], (err2, rows) => {
            if (err2) return res.json([]);
            res.json(rows);
        });
    });
});

app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/districts', (req, res) => {
    db.all('SELECT * FROM districts', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ========== SELLER ROUTES ==========
app.get('/api/seller/products', auth, requireRole('SELLER'), (req, res) => {
    db.all('SELECT p.*, c.name_en as category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.seller_id=? ORDER BY p.created_at DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/seller/products', auth, requireRole('SELLER'), upload.single('image'), (req, res) => {
    const { name, name_ta, description, description_ta, price, quantity, category_id, district_id } = req.body;
    const image_url = req.file ? `/public/images/${req.file.filename}` : '/public/images/placeholder.svg';
    db.run('INSERT INTO products (name,name_ta,description,description_ta,price,quantity,image_url,category_id,district_id,seller_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [name, name_ta, description, description_ta, parseFloat(price), parseInt(quantity), image_url, category_id, district_id, req.user.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Product added', productId: this.lastID });
        });
});

app.put('/api/seller/products/:id', auth, requireRole('SELLER'), upload.single('image'), (req, res) => {
    const { name, name_ta, description, description_ta, price, quantity, category_id, district_id } = req.body;
    db.get('SELECT * FROM products WHERE id=? AND seller_id=?', [req.params.id, req.user.id], (err, product) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        const image_url = req.file ? `/public/images/${req.file.filename}` : product.image_url;
        db.run('UPDATE products SET name=?,name_ta=?,description=?,description_ta=?,price=?,quantity=?,image_url=?,category_id=?,district_id=? WHERE id=?',
            [name, name_ta, description, description_ta, parseFloat(price), parseInt(quantity), image_url, category_id, district_id, req.params.id],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Product updated' });
            });
    });
});

app.delete('/api/seller/products/:id', auth, requireRole('SELLER'), (req, res) => {
    db.run('DELETE FROM products WHERE id=? AND seller_id=?', [req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Product deleted' });
    });
});

app.get('/api/seller/orders', auth, requireRole('SELLER'), (req, res) => {
    db.all(`SELECT oi.*, o.status, o.created_at as order_date, o.name as customer_name, o.phone as customer_phone, o.address as delivery_address, o.district as delivery_district, o.pincode, p.name as product_name, p.image_url
            FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN products p ON oi.product_id=p.id
            WHERE oi.seller_id=? ORDER BY o.created_at DESC`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/api/seller/orders/:orderId/status', auth, requireRole('SELLER'), (req, res) => {
    const { status } = req.body;
    const valid = ['PLACED','CONFIRMED','SHIPPED','DELIVERED','CANCELLED'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    db.run('UPDATE orders SET status=? WHERE id=?', [status, req.params.orderId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Order status updated' });
    });
});

app.get('/api/seller/stats', auth, requireRole('SELLER'), (req, res) => {
    db.get('SELECT COUNT(*) as total_products FROM products WHERE seller_id=?', [req.user.id], (err, r1) => {
        if (err) return res.status(500).json({ error: err.message });
        db.get('SELECT COUNT(DISTINCT oi.order_id) as total_orders, COALESCE(SUM(oi.price*oi.quantity),0) as total_sales FROM order_items oi WHERE oi.seller_id=?', [req.user.id], (err2, r2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ total_products: r1.total_products, total_orders: r2.total_orders, total_sales: r2.total_sales });
        });
    });
});

// ========== CUSTOMER ROUTES ==========
// Cart
app.get('/api/cart', auth, requireRole('CUSTOMER'), (req, res) => {
    db.all(`SELECT c.id as cart_id, c.quantity, p.id as product_id, p.name, p.price, p.image_url, p.quantity as available, u.name as seller_name, u.business_name
            FROM cart c JOIN products p ON c.product_id=p.id LEFT JOIN users u ON p.seller_id=u.id WHERE c.customer_id=?`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/cart', auth, requireRole('CUSTOMER'), (req, res) => {
    const { product_id, quantity } = req.body;
    db.get('SELECT * FROM cart WHERE customer_id=? AND product_id=?', [req.user.id, product_id], (err, existing) => {
        if (err) return res.status(500).json({ error: err.message });
        if (existing) {
            db.run('UPDATE cart SET quantity=quantity+? WHERE id=?', [quantity || 1, existing.id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Cart updated' });
            });
        } else {
            db.run('INSERT INTO cart (customer_id,product_id,quantity) VALUES (?,?,?)', [req.user.id, product_id, quantity || 1], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: 'Added to cart' });
            });
        }
    });
});

app.put('/api/cart/:id', auth, requireRole('CUSTOMER'), (req, res) => {
    const { quantity } = req.body;
    if (quantity <= 0) {
        db.run('DELETE FROM cart WHERE id=? AND customer_id=?', [req.params.id, req.user.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Removed from cart' });
        });
    } else {
        db.run('UPDATE cart SET quantity=? WHERE id=? AND customer_id=?', [quantity, req.params.id, req.user.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Cart updated' });
        });
    }
});

app.delete('/api/cart/:id', auth, requireRole('CUSTOMER'), (req, res) => {
    db.run('DELETE FROM cart WHERE id=? AND customer_id=?', [req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Removed from cart' });
    });
});

// Checkout / Orders
app.post('/api/orders', auth, requireRole('CUSTOMER'), (req, res) => {
    const { name, phone, address, district, pincode } = req.body;
    db.all('SELECT c.*, p.price, p.seller_id, p.quantity as available FROM cart c JOIN products p ON c.product_id=p.id WHERE c.customer_id=?', [req.user.id], (err, items) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!items.length) return res.status(400).json({ error: 'Cart is empty' });
        const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        db.run('INSERT INTO orders (customer_id,total,name,phone,address,district,pincode) VALUES (?,?,?,?,?,?,?)',
            [req.user.id, total, name, phone, address, district, pincode], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                const orderId = this.lastID;
                const stmt = db.prepare('INSERT INTO order_items (order_id,product_id,seller_id,quantity,price) VALUES (?,?,?,?,?)');
                items.forEach(i => {
                    stmt.run([orderId, i.product_id, i.seller_id, i.quantity, i.price]);
                    db.run('UPDATE products SET quantity=quantity-? WHERE id=?', [i.quantity, i.product_id]);
                });
                stmt.finalize();
                db.run('DELETE FROM cart WHERE customer_id=?', [req.user.id]);
                res.status(201).json({ message: 'Order placed successfully', orderId });
            });
    });
});

app.get('/api/orders', auth, requireRole('CUSTOMER'), (req, res) => {
    db.all('SELECT * FROM orders WHERE customer_id=? ORDER BY created_at DESC', [req.user.id], (err, orders) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!orders.length) return res.json([]);
        const ids = orders.map(o => o.id).join(',');
        db.all(`SELECT oi.*, p.name as product_name, p.image_url FROM order_items oi JOIN products p ON oi.product_id=p.id WHERE oi.order_id IN (${ids})`, [], (err2, items) => {
            if (err2) return res.status(500).json({ error: err2.message });
            const result = orders.map(o => ({ ...o, items: items.filter(i => i.order_id === o.id) }));
            res.json(result);
        });
    });
});

app.get('/api/profile', auth, (req, res) => {
    db.get('SELECT id,name,email,phone,role,business_name,district,address FROM users WHERE id=?', [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(user);
    });
});

app.listen(PORT, () => console.log(`Root 2 Reach server running on port ${PORT}`));
