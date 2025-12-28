// Nexteria Marketplace - Frontend JavaScript

// Global variables
let currentUser = null;
let products = [];

// API Base URL - handles both localhost and proxy environments
   // API Base URL - handles multiple environments
   // Detects if running from file:// protocol (direct file access)
   const isFileProtocol = window.location.protocol === 'file:';
   const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
   
   // API Base URL configuration
   let API_BASE;
   if (isFileProtocol) {
       // When opening files directly, use localhost
       API_BASE = 'http://localhost:3000';
   } else if (isLocalhost) {
       // When running on localhost web server
       API_BASE = '';
   } else {
       // When running on production/proxy
       API_BASE = window.location.origin;
   }
   
   console.log('API_BASE configured as:', API_BASE);

// DOM Elements
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const categoryFilter = document.getElementById('categoryFilter');
const minPrice = document.getElementById('minPrice');
const maxPrice = document.getElementById('maxPrice');
const sortFilter = document.getElementById('sortFilter');
const clearFilters = document.getElementById('clearFilters');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    loadCategories();
    loadProducts();
    checkAuthStatus();
}

function setupEventListeners() {
    // Modal controls
    loginBtn.addEventListener('click', () => showModal('loginModal'));
    registerBtn.addEventListener('click', () => showModal('registerModal'));
    
    // Close modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    
    // Search and filter controls
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    categoryFilter.addEventListener('change', performSearch);
    minPrice.addEventListener('change', performSearch);
    maxPrice.addEventListener('change', performSearch);
    sortFilter.addEventListener('change', performSearch);
    
    clearFilters.addEventListener('click', () => {
        searchInput.value = '';
        categoryFilter.value = '';
        minPrice.value = '';
        maxPrice.value = '';
        sortFilter.value = 'created_at';
        loadProducts();
    });
}

function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(API_BASE + '/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('token', data.token);
            showMessage('Login successful!', 'success');
            hideModal('loginModal');
            updateUIForAuthenticatedUser();
            loginForm.reset();
        } else {
            showMessage(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
        console.error('Login error:', error);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    // Validation
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 8) {
        showMessage('Password must be at least 8 characters long', 'error');
        return;
    }
    
    try {
        const response = await fetch(API_BASE + '/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Registration successful! Please login.', 'success');
            hideModal('registerModal');
            registerForm.reset();
            showModal('loginModal');
        } else {
            showMessage(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
        console.error('Registration error:', error);
    }
}

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        // Verify token with backend
        fetch(API_BASE + '/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                currentUser = data.user;
                updateUIForAuthenticatedUser();
            }
        })
        .catch(error => {
            console.error('Auth verification error:', error);
            localStorage.removeItem('token');
        });
    }
}

function updateUIForAuthenticatedUser() {
    if (currentUser) {
        loginBtn.textContent = 'Dashboard';
        loginBtn.onclick = () => window.location.href = '/dashboard.html';
        registerBtn.textContent = 'Logout';
        registerBtn.onclick = logout;
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    location.reload();
}

// Category Functions
async function loadCategories() {
    try {
        const response = await fetch(API_BASE + '/api/categories');
        const data = await response.json();
        
        if (response.ok) {
            const categorySelect = document.getElementById('categoryFilter');
            data.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Product Functions
async function loadProducts() {
    try {
        const response = await fetch(API_BASE + '/api/products');
        const data = await response.json();
        
        if (response.ok) {
            products = data.products;
            displayProducts(products);
        } else {
            showMessage('Failed to load products', 'error');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        displaySampleProducts();
    }
}

async function performSearch() {
    const query = searchInput.value.trim();
    const category = categoryFilter.value;
    const minPriceVal = minPrice.value;
    const maxPriceVal = maxPrice.value;
    const sortValue = sortFilter.value;
    
    // Build search parameters
    const params = new URLSearchParams();
    
    if (query) params.append('q', query);
    if (category) params.append('category', category);
    if (minPriceVal) params.append('min_price', minPriceVal);
    if (maxPriceVal) params.append('max_price', maxPriceVal);
    
    // Handle sort parameter
    if (sortValue === 'price_asc') {
        params.append('sort', 'price');
        params.append('order', 'ASC');
    } else if (sortValue === 'price_desc') {
        params.append('sort', 'price');
        params.append('order', 'DESC');
    } else if (sortValue === 'name') {
        params.append('sort', 'name');
        params.append('order', 'ASC');
    } else {
        params.append('sort', 'created_at');
        params.append('order', 'DESC');
    }
    
    try {
        const response = await fetch(`${window.location.origin}/api/products/search?${params}`);
        const data = await response.json();
        
        if (response.ok) {
            products = data.products;
            displayProducts(products);
        } else {
            showMessage('Search failed', 'error');
        }
    } catch (error) {
        console.error('Search error:', error);
        showMessage('Search error', 'error');
    }
}

function displayProducts(productsToDisplay) {
    productsGrid.innerHTML = '';
    
    if (productsToDisplay.length === 0) {
        productsGrid.innerHTML = '<p>No products available yet. Be the first to sell!</p>';
        return;
    }
    
    productsToDisplay.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const imageUrl = product.image_url || `https://picsum.photos/seed/${product.id}/300/200.jpg`;
    const category = product.category_name || 'Uncategorized';
    
    card.innerHTML = `
        <div class="product-image">
            <img src="${imageUrl}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <div class="product-info">
            <h3 class="product-title">${escapeHtml(product.name)}</h3>
            <div class="product-category">${escapeHtml(category)}</div>
            <div class="product-price">$${product.price}</div>
            <p class="product-description">${escapeHtml(product.description)}</p>
            <p class="product-seller">Sold by: ${escapeHtml(product.seller_name)}</p>
            <button class="btn btn-primary btn-small" onclick="purchaseProduct(${product.id})">Buy Now</button>
        </div>
    `;
    
    return card;
}

async function purchaseProduct(productId) {
    if (!currentUser) {
        showMessage('Please login to purchase products', 'error');
        showModal('loginModal');
        return;
    }
    
    // Get product details first
    const product = products.find(p => p.id === productId);
    if (!product) {
        showMessage('Product not found', 'error');
        return;
    }
    
    // Create purchase modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>Purchase Product</h2>
            <div class="purchase-details">
                <h3>${escapeHtml(product.name)}</h3>
                <p><strong>Price:</strong> $${product.price}</p>
                <p><strong>Seller:</strong> ${escapeHtml(product.seller_name)}</p>
                <p><strong>Category:</strong> ${escapeHtml(product.category_name || 'Uncategorized')}</p>
                <div class="product-image" style="margin: 1rem 0;">
                    <img src="${product.image_url || `https://picsum.photos/seed/${product.id}/300/200.jpg`}" 
                         alt="${product.name}" style="width: 200px; height: 150px; object-fit: cover; border-radius: 8px;">
                </div>
            </div>
            <form id="purchaseForm">
                <div class="form-group">
                    <label for="buyerEmail">Your Email</label>
                    <input type="email" id="buyerEmail" value="${currentUser ? currentUser.email : ''}" required>
                </div>
                <div class="form-group">
                    <label>Payment Method</label>
                    <div class="payment-methods">
                        <button type="button" class="btn btn-primary" onclick="processStripePayment(${product.id})">
                            Pay with Card (Stripe)
                        </button>
                    </div>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.remove();
        }
    });
}

async function processStripePayment(productId) {
    const buyerEmail = document.getElementById('buyerEmail').value;
    
    if (!buyerEmail) {
        showMessage('Please enter your email', 'error');
        return;
    }
    
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
            // Redirect to Stripe Checkout (simplified for demo)
            showMessage('Payment gateway integration ready! In production, this would redirect to Stripe checkout.', 'success');
            
            // For demo purposes, simulate successful payment
            setTimeout(() => {
                simulateSuccessfulPayment(productId, buyerEmail);
            }, 2000);
        } else {
            showMessage('Payment setup failed', 'error');
        }
    } catch (error) {
        console.error('Payment error:', error);
        showMessage('Payment error', 'error');
    }
}

async function simulateSuccessfulPayment(productId, buyerEmail) {
    // Simulate successful payment
    const fakePaymentIntentId = 'pi_test_' + Date.now();
    
    try {
        const response = await fetch(API_BASE + '/api/sales', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                payment_intent_id: fakePaymentIntentId,
                product_id: productId,
                buyer_email: buyerEmail
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Purchase successful! Thank you for your order.', 'success');
            document.querySelector('.modal').remove();
            loadProducts(); // Refresh products
        } else {
            showMessage('Purchase failed', 'error');
        }
    } catch (error) {
        console.error('Purchase error:', error);
        showMessage('Purchase error', 'error');
    }
}

function displaySampleProducts() {
    const sampleProducts = [
        {
            id: 1,
            name: 'Premium Wireless Headphones',
            price: 89.99,
            description: 'High-quality wireless headphones with noise cancellation',
            seller_name: 'TechStore',
            image: null
        },
        {
            id: 2,
            name: 'Organic Coffee Beans',
            price: 24.99,
            description: 'Freshly roasted organic coffee beans from Colombia',
            seller_name: 'CoffeeLovers',
            image: null
        },
        {
            id: 3,
            name: 'Handmade Leather Wallet',
            price: 45.00,
            description: 'Genuine leather wallet with RFID protection',
            seller_name: 'CraftShop',
            image: null
        }
    ];
    
    displayProducts(sampleProducts);
}

// Utility Functions
function showMessage(message, type = 'info') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Insert at the top of the body
    document.body.insertBefore(messageDiv, document.body.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

function scrollToProducts() {
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

// Form validation helpers
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 8;
}

// Loading state management
function setLoading(button, loading = true) {
    if (loading) {
        button.disabled = true;
        button.innerHTML = '<span class="loading"></span> Loading...';
    } else {
        button.disabled = false;
        button.innerHTML = button.getAttribute('data-original-text') || 'Submit';
    }
}

// Export for use in other files
window.Nexteria = {
    showModal,
    hideModal,
    showMessage,
    currentUser,
    loadProducts
};