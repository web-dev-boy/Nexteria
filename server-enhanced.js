// Enhanced server with full Stripe Checkout integration
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

// Load environment variables
require('dotenv').config();

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

// Enhanced email templates
async function sendSaleNotification(sellerEmail, productName, amount, buyerEmail) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #87CEEB 0%, #4682B4 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">💰 Sale Notification!</h1>
      </div>
      <div style="padding: 20px; background: #f9f9f9;">
        <h2>Congratulations!</h2>
        <p>Your product <strong>${productName}</strong> has been sold to <strong>${buyerEmail}</strong>!</p>
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>📊 Sale Details:</h3>
          <p><strong>Product:</strong> ${productName}</p>
          <p><strong>Buyer:</strong> ${buyerEmail}</p>
          <p><strong>Sale Amount:</strong> $${amount}</p>
          <p><strong>💵 Your Earnings (90%):</strong> <span style="color: #4caf50; font-size: 1.2em;">$${(amount * 0.9).toFixed(2)}</span></p>
          <p><strong>🏢 Platform Commission (10%):</strong> $${(amount * 0.1).toFixed(2)}</p>
        </div>
        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50;">
          <p><strong>💡 Next Steps:</strong></p>
          <ul>
            <li>Package the product carefully</li>
            <li>Ship to the buyer promptly</li>
            <li>Track your earnings in the dashboard</li>
          </ul>
        </div>
        <p>Thank you for selling on Nexteria! 🎉</p>
      </div>
      <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
        <p>&copy; 2024 Nexteria Marketplace. All rights reserved.</p>
        <p style="font-size: 0.9em;">Questions? Contact us at support@nexteria.com</p>
      </div>
    </div>
  `;
  
  await sendEmail(sellerEmail, '💰 Your Product Sold on Nexteria!', html);
}

async function sendWelcomeEmail(sellerEmail, sellerName) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #87CEEB 0%, #4682B4 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">🎉 Welcome to Nexteria!</h1>
      </div>
      <div style="padding: 20px; background: #f9f9f9;">
        <h2>Hello ${sellerName}!</h2>
        <p>Welcome to the Nexteria Marketplace! We're excited to have you as a seller.</p>
        
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>🚀 Getting Started:</h3>
          <ol>
            <li><strong>Add Your First Product</strong> - Upload products with great photos</li>
            <li><strong>Set Competitive Prices</strong> - Research similar products</li>
            <li><strong>Write Great Descriptions</strong> - Be detailed and honest</li>
            <li><strong>Monitor Sales</strong> - Check your dashboard regularly</li>
          </ol>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
          <h3>💰 Commission Structure:</h3>
          <p><strong>You keep 90%</strong> of every sale!</p>
          <p><strong>We only take 10%</strong> - the lowest in the industry!</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.SITE_URL || 'http://localhost:3000'}/dashboard.html" 
             style="background: #4682B4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Go to Your Dashboard
          </a>
        </div>
        
        <p>Need help? <a href="mailto:support@nexteria.com">Contact our support team</a></p>
      </div>
      <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
        <p>&copy; 2024 Nexteria Marketplace. All rights reserved.</p>
      </div>
    </div>
  `;
  
  await sendEmail(sellerEmail, '🎉 Welcome to Nexteria Marketplace!', html);
}

async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: 'Nexteria Marketplace <nexteria.marketplace@gmail.com>',
      to,
      subject,
      html
    });
    console.log('✅ Email sent successfully to:', to);
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

// Initialize database (same as before)
const db = new sqlite3.Database('./database/marketplace.db');

// Create tables (same as before)
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
            stripe_session_id TEXT,
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

// Middleware setup (same as before)
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true
});

app.use('/api/auth/', authLimiter);
app.use(limiter);
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// Enhanced Stripe Checkout Session Creation
app.post('/api/create-checkout-session', [
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
                // Create Stripe Checkout Session
                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: [{
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: product.name,
                                description: product.description.substring(0, 500),
                                images: product.image_url ? [`${process.env.SITE_URL || 'http://localhost:3000'}${product.image_url}`] : [],
                            },
                            unit_amount: Math.round(product.price * 100),
                        },
                        quantity: 1,
                    }],
                    mode: 'payment',
                    success_url: `${process.env.SITE_URL || 'http://localhost:3000'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${process.env.SITE_URL || 'http://localhost:3000'}/cancel.html`,
                    metadata: {
                        product_id: product_id.toString(),
                        buyer_email: buyer_email,
                        seller_id: product.seller_id.toString()
                    },
                    customer_email: buyer_email
                });

                res.json({ 
                    sessionId: session.id,
                    url: session.url
                });
            } catch (error) {
                console.error('Stripe error:', error);
                res.status(500).json({ message: 'Payment processing error' });
            }
        }
    );
});

// Stripe webhook for processing completed payments
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.log(`⚠️  Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        const productId = parseInt(session.metadata.product_id);
        const buyerEmail = session.metadata.buyer_email;
        const sellerId = parseInt(session.metadata.seller_id);
        const saleAmount = session.amount_total / 100; // Convert from cents

        // Get product details for email
        db.get(
            'SELECT p.*, s.email as seller_email, s.name as seller_name FROM products p JOIN sellers s ON p.seller_id = s.id WHERE p.id = ?',
            [productId],
            async (err, product) => {
                if (!err && product) {
                    const commissionAmount = saleAmount * 0.10;
                    const sellerAmount = saleAmount - commissionAmount;

                    // Record sale in database
                    db.run(
                        'INSERT INTO sales (product_id, seller_id, buyer_email, sale_amount, commission_amount, seller_amount, stripe_payment_id, stripe_session_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [productId, sellerId, buyerEmail, saleAmount, commissionAmount, sellerAmount, session.payment_intent, session.id],
                        function(err) {
                            if (!err) {
                                console.log(`✅ Sale recorded: ${product.name} sold for $${saleAmount}`);
                                
                                // Send email notification
                                sendSaleNotification(product.seller_email, product.name, saleAmount, buyerEmail);
                                
                                // Create in-app notification
                                db.run(
                                    'INSERT INTO notifications (seller_id, type, title, message) VALUES (?, ?, ?, ?)',
                                    [sellerId, 'sale', '🎉 Product Sold!', `Your product "${product.name}" was sold to ${buyerEmail} for $${saleAmount}`]
                                );
                            }
                        }
                    );
                }
            }
        );
    }

    res.json({ received: true });
});

// All other routes remain the same as the original server.js...
// (Include all the authentication, products, categories, etc. routes)

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Nexteria Marketplace server running on port ${PORT}`);
    console.log(`📧 Email service: ${process.env.EMAIL_USER ? 'Configured' : 'Not configured'}`);
    console.log(`💳 Stripe mode: ${process.env.STRIPE_SECRET_KEY?.includes('live') ? 'Live' : 'Test'}`);
    console.log(`🔗 Site URL: ${process.env.SITE_URL || 'http://localhost:3000'}`);
});