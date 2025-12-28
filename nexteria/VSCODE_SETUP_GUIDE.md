# Nexteria Marketplace - VS Code & Local Setup Guide

## 🚀 Quick Start Guide

### Step 1: Install Dependencies

Open a terminal/command prompt in the Nexteria folder and run:

```bash
npm install
```

This will install all required packages:
- express (web server)
- sqlite3 (database)
- bcrypt (password hashing)
- jsonwebtoken (authentication)
- helmet (security)
- express-rate-limit (rate limiting)
- express-validator (input validation)
- cors (cross-origin resource sharing)
- multer (file uploads)
- nodemailer (email)
- stripe (payments)

### Step 2: Start the Server

```bash
node server.js
```

You should see:
```
Nexteria server running on http://localhost:3000
Database connected successfully
```

### Step 3: Access the Application

**Important:** Do NOT open HTML files directly in your browser (file:// protocol)

Instead, open your browser and go to:
```
http://localhost:3000
```

## 🔧 Common Issues & Solutions

### Issue 1: "Network Error" When Opening Files Directly

**Problem:** You're opening HTML files directly in VS Code's browser or using file:// protocol

**Solution:** 
1. Make sure the Node.js server is running (`node server.js`)
2. Open your web browser (Chrome, Firefox, Edge, etc.)
3. Navigate to `http://localhost:3000`
4. Do NOT use `file:///path/to/index.html`

### Issue 2: Server Won't Start - Port 3000 Already in Use

**Problem:** Another application is using port 3000

**Solution:** 
1. Find the process using port 3000:
   - Windows: `netstat -ano | findstr :3000`
   - Mac/Linux: `lsof -i :3000`
2. Kill the process or use a different port
3. To use a different port, edit server.js:
   ```javascript
   const PORT = process.env.PORT || 3001; // Change to 3001 or any available port
   ```

### Issue 3: API Calls Failing with Network Error

**Problem:** API_BASE configuration is incorrect

**Solution:** 
1. Check browser console for API_BASE value (should be logged)
2. If opening directly (file://), API_BASE should be `http://localhost:3000`
3. If on localhost, API_BASE should be empty string ``
4. Make sure server is running on the expected port

**Debug Steps:**
```javascript
// Check in browser console (F12)
console.log('API_BASE:', API_BASE);
console.log('Protocol:', window.location.protocol);
console.log('Hostname:', window.location.hostname);
```

### Issue 4: Database Errors

**Problem:** Database file is missing or corrupted

**Solution:**
1. Delete the `database/marketplace.db` file
2. Restart the server - it will recreate the database automatically
3. All data will be reset (this is normal for development)

### Issue 5: Registration/Login Not Working

**Possible Causes:**
1. Server not running
2. Wrong API_BASE configuration
3. Browser blocking local requests

**Solutions:**
1. Verify server is running at `http://localhost:3000`
2. Check browser console for errors (F12)
3. Clear browser cache and cookies
4. Try a different browser

## 📁 Project Structure

```
nexteria/
├── css/
│   └── style.css              # Main stylesheet
├── js/
│   ├── main.js                # Frontend JavaScript (index.html)
│   └── dashboard.js           # Dashboard JavaScript
├── database/
│   └── marketplace.db         # SQLite database (auto-created)
├── images/                    # Product images
├── uploads/                   # Uploaded product images
├── about.html                 # About page
├── contact.html               # Contact page
├── index.html                 # Homepage
├── dashboard.html             # Seller dashboard
├── success.html               # Payment success page
├── cancel.html                # Payment cancel page
├── server.js                  # Main server file
├── package.json               # Node.js dependencies
└── .env.example               # Environment variables template
```

## 🌐 Accessing Different Pages

Once the server is running, access pages via:

- **Homepage:** http://localhost:3000
- **About Page:** http://localhost:3000/about.html
- **Contact Page:** http://localhost:3000/contact.html
- **Dashboard:** http://localhost:3000/dashboard.html (requires login)

**Important:** Always use `http://localhost:3000` prefix, NOT file paths!

## 🔐 Authentication Flow

1. Click "Become a Seller" to register
2. Fill in business details (name, email, password)
3. Password must be 8+ characters with uppercase, lowercase, and numbers
4. After registration, you'll be automatically logged in
5. Access dashboard to add products and track sales

## 💡 Best Practices for Development

1. **Always keep server running** while testing
2. **Use browser console** (F12) to debug
3. **Check API calls** in Network tab of browser dev tools
4. **Clear browser data** if experiencing issues
5. **Restart server** after making changes to server.js
6. **Refresh page** after making changes to HTML/CSS/JS files

## 🎯 Testing Checklist

Before reporting issues, verify:

- [ ] Node.js server is running (`node server.js`)
- [ ] No errors in server terminal
- [ ] Browser is accessing `http://localhost:3000` NOT file://
- [ ] Browser console shows API_BASE correctly configured
- [ ] Database file exists in `database/` folder
- [ ] All npm packages installed (`npm install`)

## 📞 Getting Help

If you're still experiencing issues:

1. Check the troubleshooting section above
2. Review browser console errors (F12)
3. Review server terminal output
4. Ensure you're following the correct access method (http:// not file://)

## 🔄 Resetting the Application

To start fresh:

1. Stop the server (Ctrl+C)
2. Delete `database/marketplace.db`
3. Delete `node_modules/` folder
4. Run `npm install`
5. Start server with `node server.js`

This will reset all data and reinstall dependencies.

---

**Remember:** The key to avoiding network errors is ALWAYS accessing the application through `http://localhost:3000` with the server running, never by opening HTML files directly!