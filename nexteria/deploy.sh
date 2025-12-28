#!/bin/bash

# Nexteria Marketplace Deployment Script
# This script helps you deploy your marketplace to production

echo "🚀 Nexteria Marketplace Deployment Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v)
    print_status "Node.js is installed: $NODE_VERSION"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    NPM_VERSION=$(npm -v)
    print_status "npm is installed: $NPM_VERSION"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install --production
    
    if [ $? -eq 0 ]; then
        print_status "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

# Setup environment variables
setup_env() {
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        cp .env.example .env
        print_warning "Please edit .env file with your actual values:"
        print_warning "- Stripe keys: https://dashboard.stripe.com/apikeys"
        print_warning "- Gmail app password: https://myaccount.google.com/apppasswords"
        print_warning "- JWT secret: Generate a random 64-character string"
        echo ""
        read -p "Press Enter to continue after editing .env file..."
    else
        print_status ".env file exists"
    fi
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Create database directory if it doesn't exist
    mkdir -p database
    
    if [ $? -eq 0 ]; then
        print_status "Database directory ready"
    else
        print_error "Failed to create database directory"
        exit 1
    fi
}

# Setup uploads directory
setup_uploads() {
    print_status "Setting up uploads directory..."
    
    mkdir -p uploads
    
    if [ $? -eq 0 ]; then
        print_status "Uploads directory ready"
    else
        print_error "Failed to create uploads directory"
        exit 1
    fi
}

# Test email configuration
test_email() {
    print_status "Testing email configuration..."
    
    # Create a simple test script
    cat > test-email.js << 'EOF'
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.sendMail({
  from: 'Nexteria Marketplace <' + process.env.EMAIL_USER + '>',
  to: process.env.EMAIL_USER,
  subject: '📧 Test Email from Nexteria',
  html: '<h1>Test Successful!</h1><p>Your email configuration is working correctly.</p>'
}).then(() => {
  console.log('✅ Email test successful!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Email test failed:', error);
  process.exit(1);
});
EOF

    node test-email.js
    
    if [ $? -eq 0 ]; then
        print_status "Email configuration is working"
        rm test-email.js
    else
        print_warning "Email test failed. Please check your EMAIL_USER and EMAIL_PASS in .env"
        rm test-email.js
    fi
}

# Start the application
start_app() {
    print_status "Starting Nexteria Marketplace..."
    
    # Check if PM2 is installed
    if command -v pm2 &> /dev/null; then
        print_status "PM2 found. Starting with PM2..."
        pm2 start server.js --name "nexteria"
        pm2 save
        print_status "Application started with PM2"
        print_status "View logs: pm2 logs nexteria"
        print_status "Monitor: pm2 monit"
    else
        print_status "PM2 not found. Starting with Node.js..."
        print_status "For production, consider installing PM2: npm install -g pm2"
        node server.js &
        echo $! > nexteria.pid
        print_status "Application started. PID: $(cat nexteria.pid)"
    fi
}

# SSL setup function
setup_ssl() {
    print_warning "SSL Setup Instructions:"
    echo "1. Install Nginx: sudo apt install nginx"
    echo "2. Install Certbot: sudo apt install certbot python3-certbot-nginx"
    echo "3. Get SSL certificate: sudo certbot --nginx -d your-domain.com"
    echo "4. Configure Nginx reverse proxy"
}

# Main deployment flow
main() {
    echo "Starting deployment process..."
    echo ""
    
    check_nodejs
    check_npm
    install_dependencies
    setup_env
    setup_database
    setup_uploads
    
    # Optional tests
    read -p "Do you want to test email configuration? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_email
    fi
    
    read -p "Do you want to start the application now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_app
    fi
    
    echo ""
    print_status "Deployment completed!"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env file with your actual values"
    echo "2. Test the application at http://localhost:3000"
    echo "3. Set up domain and SSL certificate"
    echo "4. Configure reverse proxy (Nginx)"
    echo ""
    echo "For SSL setup, run: $0 --ssl-help"
}

# SSL help
if [ "$1" = "--ssl-help" ]; then
    setup_ssl
    exit 0
fi

# Stop application function
if [ "$1" = "--stop" ]; then
    print_status "Stopping Nexteria Marketplace..."
    
    if command -v pm2 &> /dev/null; then
        pm2 stop nexteria
        pm2 delete nexteria
    fi
    
    if [ -f "nexteria.pid" ]; then
        kill $(cat nexteria.pid)
        rm nexteria.pid
    fi
    
    print_status "Application stopped"
    exit 0
fi

# Restart function
if [ "$1" = "--restart" ]; then
    print_status "Restarting Nexteria Marketplace..."
    $0 --stop
    sleep 2
    main
    exit 0
fi

# Run main deployment
main