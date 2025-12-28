// Nexteria Dashboard JavaScript

let currentUser = null;
let stats = null;

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
    : window.location.origin;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadDashboardData();
    setupEventListeners();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    // Verify token and get user info
    fetch(API_BASE + '/api/auth/verify', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.user) {
            currentUser = data.user;
            document.getElementById('sellerName').textContent = currentUser.name;
        } else {
            localStorage.removeItem('token');
            window.location.href = '/';
        }
    })
    .catch(error => {
        console.error('Auth error:', error);
        localStorage.removeItem('token');
        window.location.href = '/';
    });
}

function setupEventListeners() {
    // Add product form
    document.getElementById('addProductForm').addEventListener('submit', handleAddProduct);
}

async function loadCategories() {
    try {
        const response = await fetch(API_BASE + '/api/categories');
        const data = await response.json();
        
        if (response.ok) {
            const categorySelect = document.getElementById('productCategory');
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

   function loadPlatformStats() {
       fetch(API_BASE + '/api/stats')
           .then(response => response.json())
           .then(data => {
               document.getElementById('platformSellers').textContent = data.totalSellers;
               document.getElementById('platformProducts').textContent = data.totalProducts;
               document.getElementById('platformSales').textContent = data.totalSales;
               document.getElementById('platformRevenue').textContent = '$' + data.totalRevenue.toFixed(2);
           })
           .catch(error => console.error('Error loading platform stats:', error));
   }

function loadDashboardData() {
    loadCategories();
       loadPlatformStats();
    loadStats();
    loadProducts();
    loadSales();
    loadNotifications();
}

function loadStats() {
    fetch(API_BASE + '/api/seller/stats', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        stats = data;
        updateStatsDisplay();
    })
    .catch(error => {
        console.error('Error loading stats:', error);
    });
}

function updateStatsDisplay() {
    if (!stats) return;

    document.getElementById('totalProducts').textContent = stats.total_products || 0;
    document.getElementById('totalSales').textContent = `$${(stats.total_revenue || 0).toFixed(2)}`;
    document.getElementById('totalEarnings').textContent = `$${(stats.total_earnings || 0).toFixed(2)}`;
    document.getElementById('totalCommission').textContent = `$${(stats.total_commission || 0).toFixed(2)}`;
}

function loadProducts() {
    fetch(API_BASE + '/api/seller/products', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        displayProducts(data.products);
    })
    .catch(error => {
        console.error('Error loading products:', error);
    });
}

function displayProducts(products) {
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No products yet. Add your first product!</td></tr>';
        return;
    }

    products.forEach(product => {
        const row = document.createElement('tr');
        
        const imageHtml = product.image_url ? 
            `<img src="${product.image_url}" alt="${product.name}" class="product-image-thumb">` : 
            '<div style="width: 50px; height: 50px; background: #e0e0e0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999;">No Image</div>';

        row.innerHTML = `
            <td>${imageHtml}</td>
            <td><strong>${escapeHtml(product.name)}</strong></td>
            <td>$${product.price}</td>
            <td>${escapeHtml(product.description.substring(0, 100))}${product.description.length > 100 ? '...' : ''}</td>
            <td>${new Date(product.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-small btn-primary" onclick="simulateSale(${product.id})">Simulate Sale</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function loadSales() {
    fetch(API_BASE + '/api/seller/sales', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        displaySales(data.sales);
    })
    .catch(error => {
        console.error('Error loading sales:', error);
    });
}

function displaySales(sales) {
    const tbody = document.querySelector('#salesTable tbody');
    tbody.innerHTML = '';

    if (sales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No sales yet. Start by adding products!</td></tr>';
        return;
    }

    sales.forEach(sale => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(sale.sale_date).toLocaleDateString()}</td>
            <td>${escapeHtml(sale.product_name)}</td>
            <td>${escapeHtml(sale.buyer_email)}</td>
            <td>$${sale.sale_amount}</td>
            <td style="color: #4caf50; font-weight: 600;">$${sale.seller_amount}</td>
            <td style="color: #f44336;">$${sale.commission_amount}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function handleAddProduct(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('productName').value);
    formData.append('description', document.getElementById('productDescription').value);
    formData.append('price', document.getElementById('productPrice').value);
    formData.append('category_id', document.getElementById('productCategory').value);
    
    const imageInput = document.getElementById('productImage');
    if (imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Adding...';
    submitBtn.disabled = true;

    fetch(API_BASE + '/api/products', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            showMessage(data.message, 'success');
            document.getElementById('addProductForm').reset();
            
            // Refresh data
            loadStats();
            loadProducts();
            
            // Switch to products tab
            showTab('products');
        } else {
            showMessage('Failed to add product', 'error');
        }
    })
    .catch(error => {
        console.error('Error adding product:', error);
        showMessage('Error adding product', 'error');
    })
    .finally(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    });
}

function simulateSale(productId) {
    const buyerEmail = `buyer${Date.now()}@example.com`;
    
    fetch(API_BASE + '/api/sales', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            product_id: productId,
            buyer_email: buyerEmail
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            showMessage(`Sale simulated! You earned $${data.sale.seller_amount}`, 'success');
            
            // Refresh data
            loadStats();
            loadSales();
        } else {
            showMessage('Failed to simulate sale', 'error');
        }
    })
    .catch(error => {
        console.error('Error simulating sale:', error);
        showMessage('Error simulating sale', 'error');
    });
}

function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Set active button
    event.target.classList.add('active');
}

function goHome() {
    window.location.href = '/';
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}

function showMessage(message, type = 'info') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.zIndex = '9999';
    messageDiv.style.maxWidth = '300px';
    
    document.body.appendChild(messageDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

async function loadNotifications() {
    fetch(API_BASE + '/api/seller/notifications', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        displayNotifications(data.notifications);
        updateNotificationCount(data.notifications);
    })
    .catch(error => {
        console.error('Error loading notifications:', error);
    });
}

function displayNotifications(notifications) {
    const tbody = document.querySelector('#notificationsTable tbody');
    tbody.innerHTML = '';

    if (notifications.length === 0) {
        tbody.innerHTML = '
function displayNotifications(notifications) {
    const tbody = document.querySelector('#notificationsTable tbody');
    tbody.innerHTML = '';

    if (notifications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No notifications yet</td></tr>';
        return;
    }

    notifications.forEach(notification => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(notification.created_at).toLocaleDateString()}</td>
            <td>${notification.type}</td>
            <td><strong>${escapeHtml(notification.title)}</strong></td>
            <td>${escapeHtml(notification.message)}</td>
            <td>${notification.read ? 'Read' : 'Unread'}</td>
            <td>
                ${!notification.read ? `<button class="btn btn-small btn-primary" onclick="markAsRead(${notification.id})">Mark as Read</button>` : ''}
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function updateNotificationCount(notifications) {
    const unreadCount = notifications.filter(n => !n.read).length;
    const countElement = document.getElementById('notificationCount');
    if (countElement) {
        countElement.textContent = unreadCount > 0 ? `(${unreadCount})` : '(0)';
    }
}

async function markAsRead(notificationId) {
    fetch(`/api/seller/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            showMessage('Notification marked as read', 'success');
            loadNotifications();
        }
    })
    .catch(error => {
        console.error('Error marking notification as read:', error);
    });
}

function showNotifications() {
    showTab('notifications');
}
