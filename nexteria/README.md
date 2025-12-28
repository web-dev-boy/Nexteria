# Nexteria - Secure Online Marketplace

A modern, secure online marketplace platform built with Node.js, Express, and SQLite. Features include user authentication, product management, sales tracking, and a 10% commission system.

## Features

### 🔍 **Search & Discovery**
- **Advanced Product Search**: Full-text search across names and descriptions
- **Category Filtering**: 12 pre-defined product categories
- **Price Range Filtering**: Min/max price filters
- **Multiple Sort Options**: Latest, Price (low to high/high to low), Name (A-Z)
- **Real-time Results**: Instant search and filter updates

### 🔐 Security Features
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **Brute Force Protection**: Account locking after 5 failed login attempts
- **SQL Injection Prevention**: Parameterized queries throughout
- **Rate Limiting**: Request rate limiting to prevent abuse
- **Input Validation**: Comprehensive input sanitization and validation
- **XSS Protection**: Built-in Cross-Site Scripting protection
- **Secure Headers**: Helmet.js for security headers

### 💳 **Payment Processing**
- **Stripe Integration**: Secure payment processing with Stripe
- **Payment Intent Creation**: Secure payment flow
- **Commission Tracking**: Automatic 10% platform commission
- **Payment Verification**: Secure payment confirmation
- **Production Ready**: Ready for live Stripe deployment

### 📧 **Communication System**
- **Email Notifications**: Automated welcome and sale notifications
- **Professional Templates**: Beautiful email design with Nexteria branding
- **Sale Alerts**: Instant email notifications for product sales
- **In-App Notifications**: Real-time dashboard notifications
- **Notification Management**: Read/unread status tracking

### 🛍️ Marketplace Features
- **Seller Registration**: Secure seller onboarding process
- **Product Management**: Add, view, and manage products with image uploads
- **Category Organization**: Structured product categorization
- **Sales Tracking**: Real-time sales monitoring and commission calculation
- **Purchase Flow**: Complete buying experience with payment processing
- **Dashboard**: Comprehensive seller dashboard with statistics
- **10% Commission**: Automatic commission calculation (platform gets 10%, seller gets 90%)

### 🎨 Design Features
- **Sky Blue Theme**: Beautiful, modern design with sky blue color scheme
- **Responsive Design**: Mobile-friendly interface
- **Custom Logo**: Professional Nexteria branding
- **User-Friendly UI**: Intuitive interface for easy navigation
- **Modern Search Interface**: Advanced filtering and search components

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, bcrypt, express-rate-limit, express-validator
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **File Upload**: Multer
- **Styling**: Custom CSS with CSS Variables

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Step 1: Clone and Install
```bash
cd nexteria
npm install
```

### Step 2: Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Step 3: Access the Application
Open your browser and navigate to:
- Main Site: `http://localhost:3000`
- Dashboard: `http://localhost:3000/dashboard.html`

## Project Structure

```
nexteria/
├── css/
│   └── style.css              # Main stylesheet with sky-blue theme
├── js/
│   ├── main.js               # Frontend JavaScript for main site
│   └── dashboard.js          # Dashboard JavaScript
├── database/
│   └── marketplace.db        # SQLite database (auto-created)
├── uploads/                  # Product image uploads
├── index.html                # Main marketplace page
├── dashboard.html            # Seller dashboard
├── server.js                 # Node.js/Express server
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new seller
- `POST /api/auth/login` - Seller login
- `GET /api/auth/verify` - Verify JWT token

### Products
- `GET /api/products` - Get all products (public)
- `POST /api/products` - Add new product (authenticated sellers only)
- `GET /api/seller/products` - Get seller's products (authenticated)

### Sales
- `POST /api/sales` - Process a sale (authenticated sellers only)
- `GET /api/seller/sales` - Get seller's sales history (authenticated)
- `GET /api/seller/stats` - Get seller statistics (authenticated)

## Database Schema

### Sellers Table
- `id` - Primary key
- `name` - Business name
- `email` - Unique email address
- `password_hash` - Bcrypt hashed password
- `created_at` - Registration timestamp
- `last_login` - Last login timestamp
- `login_attempts` - Failed login attempts counter
- `locked_until` - Account lock timestamp

### Products Table
- `id` - Primary key
- `seller_id` - Foreign key to sellers
- `name` - Product name
- `description` - Product description
- `price` - Product price
- `image_url` - Product image path
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Sales Table
- `id` - Primary key
- `product_id` - Foreign key to products
- `seller_id` - Foreign key to sellers
- `buyer_email` - Buyer's email
- `sale_amount` - Total sale amount
- `commission_amount` - Platform commission (10%)
- `seller_amount` - Seller's earnings (90%)
- `sale_date` - Sale timestamp

## Security Measures

### Password Security
- bcrypt with 12 salt rounds for password hashing
- Minimum 8-character password requirement
- Password complexity validation (uppercase, lowercase, numbers)

### Authentication Security
- JWT tokens with 24-hour expiration
- Secure token storage and validation
- Automatic logout on token expiration

### Attack Prevention
- SQL injection prevention through parameterized queries
- XSS protection with input sanitization
- CSRF protection through secure headers
- Rate limiting to prevent brute force attacks
- Account locking after failed attempts

### File Upload Security
- File type validation (images only)
- File size limits (5MB max)
- Secure file storage with random filenames

## Usage Guide

### For Sellers

1. **Registration**: Click "Become a Seller" and fill out the registration form
2. **Login**: Use your email and password to access the dashboard
3. **Add Products**: Navigate to dashboard → Add Product tab
4. **Manage Products**: View, edit, and track your products
5. **Monitor Sales**: Track sales and earnings in real-time
6. **Commission System**: Automatically earn 90% of sales (platform keeps 10%)

### Features Overview

#### Dashboard Statistics
- Total products listed
- Total sales revenue
- Your earnings (90% of sales)
- Platform commission (10% of sales)

#### Product Management
- Add products with images
- Set competitive prices
- Write detailed descriptions
- Track product performance

#### Sales Tracking
- Real-time sales monitoring
- Detailed sales history
- Earnings breakdown
- Commission transparency

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=production
```

## Development

### Running in Development Mode
```bash
npm run dev
```
This uses nodemon for automatic server restart on file changes.

### Testing
```bash
npm test
```

## Deployment

### Production Setup
1. Set environment variables
2. Install dependencies: `npm install --production`
3. Start server: `npm start`

### Security Recommendations
1. Change the JWT_SECRET in production
2. Use HTTPS in production
3. Regularly update dependencies
4. Set up proper file backup for database
5. Monitor application logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - Feel free to use this project for commercial or personal use.

## Support

For support and questions:
- Email: support@nexteria.com
- Documentation: Check this README file
- Issues: Report bugs via GitHub issues

---

**Nexteria** - Your trusted marketplace for quality products