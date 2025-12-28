# Nexteria Marketplace - Production Setup Guide

## 🚀 **Complete Production Setup**

This guide will help you make your Nexteria marketplace fully operational with real payments and email notifications.

---

## 💳 **Payment Processing Setup (Stripe)**

### **Step 1: Create Stripe Account**
1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete the account verification process
3. Get your API keys from the Stripe Dashboard

### **Step 2: Get API Keys**
1. Login to Stripe Dashboard
2. Go to **Developers → API keys**
3. You'll see two sets of keys:
   - **Test Keys** (for development)
   - **Live Keys** (for production)

### **Step 3: Environment Configuration**

Create a `.env` file in your nexteria folder:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_test_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key_here

# For Production (when ready):
# STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here
# STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key_here

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# Security
JWT_SECRET=your-super-secure-jwt-secret-key-change-this
NODE_ENV=production
PORT=3000
```

### **Step 4: Update Frontend for Stripe**

Add this to your `index.html` before the closing `</head>` tag:

```html
<!-- Stripe.js -->
<script src="https://js.stripe.com/v3/"></script>
<script>
  // Configure Stripe with your publishable key
  const stripe = Stripe('pk_test_your_publishable_key_here');
</script>
```

### **Step 5: Enhanced Payment Form**

Update your payment processing in `js/main.js`:

```javascript
async function processStripePayment(productId) {
    const buyerEmail = document.getElementById('buyerEmail').value;
    
    try {
        // Create payment intent
        const response = await fetch(API_BASE + '/api/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product_id: productId,
                buyer_email: buyerEmail
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Redirect to Stripe Checkout
            const { error } = await stripe.redirectToCheckout({
                sessionId: data.sessionId
            });
            
            if (error) {
                showMessage('Payment error: ' + error.message, 'error');
            }
        } else {
            showMessage('Payment setup failed', 'error');
        }
    } catch (error) {
        console.error('Payment error:', error);
        showMessage('Payment error', 'error');
    }
}
```

---

## 📧 **Email Notifications Setup (Gmail)**

### **Step 1: Enable Gmail App Password**

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Name it "Nexteria Marketplace"
   - Copy the 16-character password

### **Step 2: Configure Email Service**

Update your `.env` file with Gmail credentials:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
```

### **Step 3: Test Email Configuration**

Create a test script `test-email.js`:

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function testEmail() {
  try {
    await transporter.sendMail({
      from: 'Nexteria Marketplace <your-email@gmail.com>',
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<h1>Test Email</h1><p>This is a test email from Nexteria.</p>'
    });
    console.log('✅ Email sent successfully!');
  } catch (error) {
    console.error('❌ Email failed:', error);
  }
}

testEmail();
```

Run: `node test-email.js`

---

## 🌐 **Production Deployment Options**

### **Option 1: VPS Deployment (Recommended)**

#### **Server Setup:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Clone your project
git clone your-repo-url
cd nexteria

# Install dependencies
npm install --production

# Configure environment
cp .env.example .env
# Edit .env with your production keys
```

#### **Start with PM2:**
```bash
# Start the application
pm2 start server.js --name "nexteria"

# Enable auto-restart
pm2 startup

# Save current process list
pm2 save
```

### **Option 2: Cloud Platform**

#### **Heroku Deployment:**
```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set STRIPE_SECRET_KEY=sk_live_your_key
heroku config:set STRIPE_PUBLISHABLE_KEY=pk_live_your_key
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASS=your-app-password
heroku config:set JWT_SECRET=your-secure-secret

# Deploy
git add .
git commit -m "Deploy to production"
git push heroku main
```

#### **Vercel/Netlify:**
- Connect your GitHub repository
- Set environment variables in dashboard
- Deploy automatically

---

## 🔧 **Nginx Reverse Proxy (for VPS)**

Create `/etc/nginx/sites-available/nexteria`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/nexteria /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 **SSL Certificate (HTTPS)**

### **Let's Encrypt (Free):**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 📊 **Monitoring & Logging**

### **PM2 Monitoring:**
```bash
# View logs
pm2 logs nexteria

# Monitor performance
pm2 monit

# Restart if needed
pm2 restart nexteria
```

### **Database Backup:**
```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp database/marketplace.db backups/marketplace_$DATE.db

# Add to crontab for daily backups
0 2 * * * /path/to/backup-script.sh
```

---

## 🚨 **Security Checklist**

### **Essential Security:**
- [ ] Change JWT_SECRET to a random 64-character string
- [ ] Use environment variables for all sensitive data
- [ ] Enable HTTPS with SSL certificate
- [ ] Set up firewall (UFW on Ubuntu)
- [ ] Regularly update dependencies
- [ ] Monitor server logs

### **Firewall Setup:**
```bash
# Enable firewall
sudo ufw enable

# Allow SSH, HTTP, HTTPS
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Check status
sudo ufw status
```

---

## 🎯 **Production Testing Checklist**

### **Before Going Live:**
- [ ] Test registration with real email
- [ ] Test complete payment flow with Stripe
- [ ] Verify email notifications are sent
- [ ] Test all security features
- [ ] Check mobile responsiveness
- [ ] Test with multiple users
- [ ] Verify commission calculations
- [ ] Test file uploads

### **Performance:**
- [ ] Optimize images
- [ ] Enable gzip compression
- [ ] Set up caching headers
- [ ] Monitor server resources

---

## 📞 **Support & Maintenance**

### **Regular Tasks:**
1. **Weekly:** Check server logs, update dependencies
2. **Monthly:** Review security updates, backup database
3. **Quarterly:** Review Stripe transactions, update SSL certificate

### **Monitoring Tools:**
- **Uptime monitoring:** UptimeRobot, Pingdom
- **Error tracking:** Sentry (free tier available)
- **Performance:** Google PageSpeed Insights

---

## 💰 **Cost Breakdown**

### **Monthly Costs:**
- **VPS:** $5-20/month (DigitalOcean, Vultr, Linode)
- **Domain:** $10-15/year
- **SSL:** Free (Let's Encrypt)
- **Stripe:** No monthly fee (2.9% + 30¢ per transaction)
- **Email:** Free (Gmail) or $5-20/month (SendGrid)

---

## 🎉 **You're Ready!**

Once you complete these steps, your Nexteria marketplace will be:
- ✅ Fully functional with real payments
- ✅ Sending email notifications
- ✅ Secure and production-ready
- ✅ Accessible to customers worldwide
- ✅ Processing real transactions

**Start with test mode, verify everything works, then switch to live mode!**