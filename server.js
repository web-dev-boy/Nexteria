const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51234567890abcdef');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Email service configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'nexteria.marketplace@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Email notification functions
async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: 'Nexteria Marketplace <nexteria.marketplace@gmail.com>',
      to,
      subject,
      html
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

async function sendSaleNotification(sellerEmail, productName, amount) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #87CEEB 0%, #4682B4 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">🎉 Sale Notification!</h1>
      </div>
      <div style="padding: 20px; background: #f9f9f9;">
        <h2>Congratulations!</h2>
        <p>Your product <strong>${productName}</strong> has been sold!</p>
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>Sale Details:</h3>
          <p><strong>Product:</strong> ${productName}</p>
          <p><strong>Sale Amount:</strong> $${amount}</p>
          <p><strong>Your Earnings (90%):</strong> $${(amount * 0.9).toFixed(2)}</p>
          <p><strong>Platform Commission (10%):</strong> $${(amount * 0.1).toFixed(2)}</p>
        </div>
        <p>Thank you for selling on Nexteria!</p>
      </div>
      <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
        <p>&copy; 2024 Nexteria Marketplace. All rights reserved.</p>
      </div>
    </div>
  `;
  
  await sendEmail(sellerEmail, '🎉 Your Product Sold on Nexteria!', html);
}

async function sendWelcomeEmail(sellerEmail, sellerName) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #87CEEB 0%, #4682B4 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Welcome to Nexteria!</h1>
      </div>
      <div style="padding: 20px; background: #f9f9f9;">
        <h2>Hello ${sellerName}!</h2>
        <p>Welcome to the Nexteria Marketplace! We're excited to have you as a seller.</p>
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>Getting Started:</h3>
          <ul>
            <li>Add your first product to the marketplace</li>
            <li>Set competitive prices</li>
            <li>Upload high-quality product images</li>
            <li>Monitor your sales in the dashboard</li>
          </ul>
        </div>
        <p><strong>Commission Rate:</strong> Only 10% (You keep 90% of sales!)</p>
        <p>Need help? Contact us at support@nexteria.com</p>
      </div>
      <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
        <p>&copy; 2024 Nexteria Marketplace. All rights reserved.</p>
      </div>
    </div>
  `;
  
  await sendEmail(sellerEmail, 'Welcome to Nexteria Marketplace!', html);
}

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true
});

app.use('/api/auth/', authLimiter);
app.use(limiter);

// Serve static files
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// Initialize SQLite database
const db = new sqlite3.Database('./database/marketplace.db');

// Create tables
db.serialize(() => {
    // Sellers table
    db.run(`
        CREATE TABLE IF NOT EXISTS sellers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            stripe_account_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            login_attempts INTEGER DEFAULT 0,
            locked_until DATETIME
        )
    `);

    // Categories table
    db.run(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Products table
    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seller_id INTEGER NOT NULL,
            category_id INTEGER,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            image_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (seller_id) REFERENCES sellers (id),
            FOREIGN KEY (category_id) REFERENCES categories (id)
        )
    `);

    // Sales table
    db.run(`
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            seller_id INTEGER NOT NULL,
            buyer_email TEXT NOT NULL,
            sale_amount DECIMAL(10,2) NOT NULL,
            commission_amount DECIMAL(10,2) NOT NULL,
            seller_amount DECIMAL(10,2) NOT NULL,
            stripe_payment_id TEXT,
            sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products (id),
            FOREIGN KEY (seller_id) REFERENCES sellers (id)
        )
    `);

    // Notifications table
    db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seller_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            read BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (seller_id) REFERENCES sellers (id)
        )
    `);

    // Insert default categories
    const defaultCategories = [
        'Electronics', 'Clothing & Fashion', 'Home & Garden', 'Sports & Outdoors',
        'Books & Media', 'Health & Beauty', 'Toys & Games', 'Food & Beverages',
        'Automotive', 'Art & Crafts', 'Business & Industrial', 'Other'
    ];

    defaultCategories.forEach(category => {
        db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [category]);
    });
});

// File upload configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Helper function to check if account is locked
const isAccountLocked = (email, callback) => {
    db.get(
        'SELECT locked_until, login_attempts FROM sellers WHERE email = ?',
        [email],
        (err, row) => {
            if (err) return callback(err);
            if (!row) return callback(null, false);
            
            const now = new Date();
            const lockedUntil = row.locked_until ? new Date(row.locked_until) : null;
            
            if (lockedUntil && lockedUntil > now) {
                return callback(null, true);
            }
            
            if (lockedUntil && lockedUntil <= now) {
                // Reset login attempts if lock period has expired
                db.run(
                    'UPDATE sellers SET login_attempts = 0, locked_until = NULL WHERE email = ?',
                    [email],
                    callback
                );
            } else {
                callback(null, false);
            }
        }
    );
};

// Routes

// Registration
app.post('/api/auth/register', [
    body('name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            message: 'Validation failed', 
            errors: errors.array() 
        });
    }

    const { name, email, password } = req.body;

    try {
        // Check if user already exists
        db.get('SELECT id FROM sellers WHERE email = ?', [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (row) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            // Hash password
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Insert new seller
            db.run(
                'INSERT INTO sellers (name, email, password_hash) VALUES (?, ?, ?)',
                [name, email, passwordHash],
                async function(err) {
                    if (err) {
                        return res.status(500).json({ message: 'Registration failed' });
                    }

                    // Send welcome email
                    await sendWelcomeEmail(email, name);

                    const token = jwt.sign(
                        { id: this.lastID, email, name },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                    );

                    res.status(201).json({
                        message: 'Registration successful',
                        token,
                        user: { id: this.lastID, email, name, businessName: name }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
app.post('/api/auth/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            message: 'Validation failed', 
            errors: errors.array() 
        });
    }

    const { email, password } = req.body;

    isAccountLocked(email, (err, locked) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (locked) {
            return res.status(423).json({ message: 'Account locked due to too many failed attempts. Try again later.' });
        }

        db.get(
            'SELECT id, name, email, password_hash, login_attempts FROM sellers WHERE email = ?',
            [email],
            async (err, user) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error' });
                }

                if (!user) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }

                const isValidPassword = await bcrypt.compare(password, user.password_hash);

                if (!isValidPassword) {
                    // Increment login attempts
                    const newAttempts = user.login_attempts + 1;
                    const lockedUntil = newAttempts >= 5 ? 
                        new Date(Date.now() + 30 * 60 * 1000) : null; // Lock for 30 minutes after 5 attempts

                    db.run(
                        'UPDATE sellers SET login_attempts = ?, locked_until = ? WHERE email = ?',
                        [newAttempts, lockedUntil, email]
                    );

                    if (lockedUntil) {
                        return res.status(423).json({ message: 'Account locked due to too many failed attempts. Try again in 30 minutes.' });
                    }

                    return res.status(401).json({ message: 'Invalid credentials' });
                }

                // Reset login attempts on successful login
                db.run(
                    'UPDATE sellers SET login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id = ?',
                    [user.id]
                );

                const token = jwt.sign(
                    { id: user.id, email: user.email, name: user.name },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                res.json({
                    message: 'Login successful',
                    token,
                    user: { id: user.id, email: user.email, name: user.name, businessName: user.name }
                });
            }
        );
    });
});

// Verify token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// Get categories
app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories ORDER BY name', (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.json({ categories: rows });
    });
});

// Search products
   // Get platform statistics
   app.get('/api/stats', (req, res) => {
       db.get('SELECT COUNT(*) as totalSellers FROM sellers', (err, sellers) => {
           if (err) {
               return res.status(500).json({ message: 'Database error' });
           }
           db.get('SELECT COUNT(*) as totalProducts FROM products', (err, products) => {
               if (err) {
                   return res.status(500).json({ message: 'Database error' });
               }
               db.get('SELECT COUNT(*) as totalSales FROM sales', (err, sales) => {
                   if (err) {
                       return res.status(500).json({ message: 'Database error' });
                   }
                   db.get('SELECT SUM(amount) as totalRevenue FROM sales', (err, revenue) => {
                       if (err) {
                           return res.status(500).json({ message: 'Database error' });
                       }
                       res.json({
                           totalSellers: sellers.totalSellers,
                           totalProducts: products.totalProducts,
                           totalSales: sales.totalSales,
                           totalRevenue: revenue.totalRevenue || 0
                       });
                   });
               });
           });
       });
   });
app.get('/api/products/search', (req, res) => {
    const { q, category, min_price, max_price, sort = 'created_at', order = 'DESC' } = req.query;
    
    let query = `
        SELECT p.*, s.name as seller_name, c.name as category_name 
        FROM products p 
        JOIN sellers s ON p.seller_id = s.id 
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1
    `;
    const params = [];

    if (q) {
        query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        const searchTerm = `%${q}%`;
        params.push(searchTerm, searchTerm);
    }

    if (category) {
        query += ' AND p.category_id = ?';
        params.push(category);
    }

    if (min_price) {
        query += ' AND p.price >= ?';
        params.push(min_price);
    }

    if (max_price) {
        query += ' AND p.price <= ?';
        params.push(max_price);
    }

    // Validate sort column to prevent SQL injection
    const allowedSortColumns = ['name', 'price', 'created_at', 'updated_at'];
    const sortColumn = allowedSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY p.${sortColumn} ${sortOrder}`;

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.json({ products: rows });
    });
});

// Get products
app.get('/api/products', (req, res) => {
    db.all(`
        SELECT p.*, s.name as seller_name, c.name as category_name 
        FROM products p 
        JOIN sellers s ON p.seller_id = s.id 
        LEFT JOIN categories c ON p.category_id = c.id 
        ORDER BY p.created_at DESC
    `, (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.json({ products: rows });
    });
});

// Add product (sellers only)
app.post('/api/products', authenticateToken, upload.single('image'), [
    body('name').trim().isLength({ min: 1, max: 200 }).escape(),
    body('description').trim().isLength({ min: 1, max: 1000 }).escape(),
    body('price').isFloat({ min: 0.01, max: 99999.99 }),
    body('category_id').optional().isInt()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            message: 'Validation failed', 
            errors: errors.array() 
        });
    }

    const { name, description, price, category_id } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    db.run(
        'INSERT INTO products (seller_id, category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, category_id || null, name, description, price, imageUrl],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Failed to add product' });
            }

            res.status(201).json({
                message: 'Product added successfully',
                product: {
                    id: this.lastID,
                    name,
                    description,
                    price,
                    category_id,
                    image_url: imageUrl
                }
            });
        }
    );
});

// Get seller's products
app.get('/api/seller/products', authenticateToken, (req, res) => {
    db.all(
        'SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC',
        [req.user.id],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }
            res.json({ products: rows });
        }
    );
});

// Create Stripe payment intent
app.post('/api/create-payment-intent', [
    body('product_id').isInt(),
    body('buyer_email').isEmail().normalizeEmail()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            message: 'Validation failed', 
            errors: errors.array() 
        });
    }

    const { product_id, buyer_email } = req.body;

    // Get product details
    db.get(
        'SELECT p.*, s.email as seller_email, s.name as seller_name FROM products p JOIN sellers s ON p.seller_id = s.id WHERE p.id = ?',
        [product_id],
        async (err, product) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            try {
                // Create Stripe payment intent
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: Math.round(product.price * 100), // Convert to cents
                    currency: 'usd',
                    metadata: {
                        product_id: product_id.toString(),
                        buyer_email: buyer_email,
                        seller_id: product.seller_id.toString()
                    }
                });

                res.json({
                    clientSecret: paymentIntent.client_secret,
                    product: {
                        id: product.id,
                        name: product.name,
                        price: product.price
                    }
                });
            } catch (error) {
                console.error('Stripe error:', error);
                res.status(500).json({ message: 'Payment processing error' });
            }
        }
    );
});

// Process sale after successful payment
app.post('/api/sales', [
    body('payment_intent_id').isString(),
    body('product_id').isInt(),
    body('buyer_email').isEmail().normalizeEmail()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            message: 'Validation failed', 
            errors: errors.array() 
        });
    }

    const { payment_intent_id, product_id, buyer_email } = req.body;

    // Get product details
    db.get(
        'SELECT p.*, s.email as seller_email, s.name as seller_name FROM products p JOIN sellers s ON p.seller_id = s.id WHERE p.id = ?',
        [product_id],
        async (err, product) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            // Verify payment with Stripe
            try {
                const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
                
                if (paymentIntent.status !== 'succeeded') {
                    return res.status(400).json({ message: 'Payment not successful' });
                }

                // Calculate commission (10%)
                const saleAmount = product.price;
                const commissionAmount = saleAmount * 0.10;
                const sellerAmount = saleAmount - commissionAmount;

                // Record sale
                db.run(
                    'INSERT INTO sales (product_id, seller_id, buyer_email, sale_amount, commission_amount, seller_amount, stripe_payment_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [product_id, product.seller_id, buyer_email, saleAmount, commissionAmount, sellerAmount, payment_intent_id],
                    async function(err) {
                        if (err) {
                            return res.status(500).json({ message: 'Failed to process sale' });
                        }

                        // Send email notification to seller
                        await sendSaleNotification(product.seller_email, product.name, saleAmount);

                        // Create notification in database
                        db.run(
                            'INSERT INTO notifications (seller_id, type, title, message) VALUES (?, ?, ?, ?)',
                            [product.seller_id, 'sale', 'Product Sold!', `Your product "${product.name}" was sold for $${saleAmount}`]
                        );

                        res.json({
                            message: 'Sale processed successfully',
                            sale: {
                                id: this.lastID,
                                sale_amount: saleAmount,
                                commission_amount: commissionAmount,
                                seller_amount: sellerAmount
                            }
                        });
                    }
                );
            } catch (error) {
                console.error('Payment verification error:', error);
                res.status(500).json({ message: 'Payment verification failed' });
            }
        }
    );
});

// Get seller notifications
app.get('/api/seller/notifications', authenticateToken, (req, res) => {
    db.all(
        'SELECT * FROM notifications WHERE seller_id = ? ORDER BY created_at DESC',
        [req.user.id],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }
            res.json({ notifications: rows });
        }
    );
});

// Mark notification as read
app.put('/api/seller/notifications/:id/read', authenticateToken, (req, res) => {
    db.run(
        'UPDATE notifications SET read = TRUE WHERE id = ? AND seller_id = ?',
        [req.params.id, req.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }
            res.json({ message: 'Notification marked as read' });
        }
    );
});

// Get seller's sales
app.get('/api/seller/sales', authenticateToken, (req, res) => {
    db.all(`
        SELECT s.*, p.name as product_name, p.image_url 
        FROM sales s 
        JOIN products p ON s.product_id = p.id 
        WHERE s.seller_id = ? 
        ORDER BY s.sale_date DESC
    `, [req.user.id], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.json({ sales: rows });
    });
});

// Get seller statistics
app.get('/api/seller/stats', authenticateToken, (req, res) => {
    db.get(`
        SELECT 
            COUNT(*) as total_sales,
            SUM(sale_amount) as total_revenue,
            SUM(commission_amount) as total_commission,
            SUM(seller_amount) as total_earnings,
            COUNT(DISTINCT product_id) as products_sold
        FROM sales 
        WHERE seller_id = ?
    `, [req.user.id], (err, stats) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        db.get(
            'SELECT COUNT(*) as total_products FROM products WHERE seller_id = ?',
            [req.user.id],
            (err, productStats) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error' });
                }

                res.json({
                    ...stats,
                    total_products: productStats.total_products
                });
            }
        );
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Nexteria Marketplace server running on port ${PORT}`);
    console.log(`Database: marketplace.db`);
});