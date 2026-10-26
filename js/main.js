// Main JavaScript functionality for saba-dy website

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Global products array
let availableProducts = [];

// Initialize application
function initializeApp() {
    setupNavigation();
    fetchProducts();
    fetchDeliveryOptions();
    fetchContent();
    setupContactForm();
    setupMobileMenu();
    setupScrollEffects();
    cart.updateCartUI(); // Update cart UI on page load
    setupAdminLink();
}

// Fetch site content (Hero title/subtitle)
async function fetchContent() {
    try {
        const response = await fetch('/api/content');
        if (!response.ok) return;
        const result = await response.json();
        const content = result.data;
        
        if (content.hero_title) {
            const titleEl = document.querySelector('.hero-title');
            if (titleEl) titleEl.textContent = content.hero_title;
        }
        
        if (content.hero_subtitle) {
            const subtitleEl = document.querySelector('.hero-subtitle');
            if (subtitleEl) subtitleEl.textContent = content.hero_subtitle;
        }
    } catch (error) {
        console.error('Error fetching content:', error);
    }
}

// Fetch products from API
async function fetchProducts() {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Network response was not ok');
        const result = await response.json();
        availableProducts = result.data;
        renderProducts();
    } catch (error) {
        console.error('Error fetching products:', error);
        // Fallback to local data if available (optional)
        if (typeof products !== 'undefined') {
            availableProducts = products;
            renderProducts();
        }
    }
}

// Fetch delivery options from API
async function fetchDeliveryOptions() {
    try {
        const response = await fetch('/api/delivery-options');
        if (!response.ok) throw new Error('Network response was not ok');
        const result = await response.json();
        const options = result.data.filter(opt => opt.isActive);
        renderDeliveryOptions(options);
    } catch (error) {
        console.error('Error fetching delivery options:', error);
        // Fallback to local data is NOT handled here to encourage API usage, 
        // but existing static HTML serves as fallback if this fails completely (though we are replacing it).
        // Actually, we should probably check if deliveryOptions exists in global scope (from data.js) as fallback.
        if (typeof deliveryOptions !== 'undefined') {
             renderDeliveryOptions(deliveryOptions);
        }
    }
}

function renderDeliveryOptions(options) {
    const container = document.querySelector('.delivery-options');
    if (!container) return;

    const getIcon = (id) => {
        switch(id) {
            case 'pickup': return '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M17 21v-8H7v8"/></svg>';
            case 'courier': return '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>';
            case 'post': return '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z"/><polyline points="15,9 18,9 18,11"/><path d="M6.5 5C9 5 11 7 11 9.5V17a2 2 0 0 1-2 2v0"/></svg>';
            case 'cdek': return '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>';
            case 'ozon': return '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>';
            default: return '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>';
        }
    };

    container.innerHTML = options.map(opt => `
        <div class="delivery-card">
            <div class="delivery-icon">
                ${getIcon(opt.id)}
            </div>
            <h3>${opt.name}</h3>
            <p>${opt.description}</p>
            ${opt.price > 0 ? `<p style="font-weight: 500; margin-top: 5px;">${opt.price}₽</p>` : ''}
        </div>
    `).join('');
    
    // Update global variable for checkout
    window.availableDeliveryOptions = options;
}

// Add Admin Link to Navigation
function setupAdminLink() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    // Check if admin link already exists
    if (navActions.querySelector('a[href="/admin/"]')) return;

    const adminLink = document.createElement('a');
    adminLink.href = "/admin/";
    adminLink.className = "nav-link admin-link";
    adminLink.title = "Вход в админ-панель";
    adminLink.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
    `;
    
    // Insert before hamburger
    const hamburger = navActions.querySelector('.hamburger');
    if (hamburger) {
        navActions.insertBefore(adminLink, hamburger);
    } else {
        navActions.appendChild(adminLink);
    }
}

// Setup navigation
function setupNavigation() {
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
}

// Scroll to products function
function scrollToProducts() {
    const productsSection = document.getElementById('products');
    if (productsSection) {
        productsSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Render products
function renderProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    if (availableProducts.length === 0) {
        productsGrid.innerHTML = '<p class="text-center">Загрузка товаров...</p>';
        return;
    }

    productsGrid.innerHTML = availableProducts.map(product => `
        <div class="product-card">
            <div class="product-image">
                ${product.image && (product.image.startsWith('/') || product.image.startsWith('http')) 
                    ? `<img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 10px;">` 
                    : product.image}
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">${formatPrice(product.price)}</div>
                <div class="product-actions">
                    <button class="btn btn-primary" onclick="addToCart(${product.id})">Купить</button>
                    <button class="btn btn-secondary" onclick="showProductDetails(${product.id})">Подробнее</button>
                </div>
            </div>
        </div>
    `).join('');

    // Re-initialize scroll animations for new elements
    observeElements();
}

// Show product details in modal
function showProductDetails(productId) {
    const product = availableProducts.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('productModal');
    const productDetails = document.getElementById('productDetails');
    
    productDetails.innerHTML = `
        <div class="product-detail">
            <div class="product-detail-image">
                ${product.image && (product.image.startsWith('/') || product.image.startsWith('http')) 
                    ? `<img src="${product.image}" alt="${product.name}">` 
                    : product.image}
            </div>
            <div class="product-detail-info">
                <h2>${product.name}</h2>
                <p class="product-description">${product.description}</p>
                <div class="product-composition">
                    <h3>Состав:</h3>
                    <p>${product.composition}</p>
                </div>
                <div class="product-usage">
                    <h3>Способ применения:</h3>
                    <p>${product.usage}</p>
                </div>
                <div class="product-price">${formatPrice(product.price)}</div>
                <div class="product-actions">
                    <button class="btn btn-primary" onclick="addToCart(${product.id}); closeProductModal();">Купить</button>
                    <button class="btn btn-secondary" onclick="closeProductModal()">Закрыть</button>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Close product modal
function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
}

// Setup contact form
function setupContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const name = formData.get('name');
        const email = formData.get('email');
        const message = formData.get('message');

        // Simple validation
        if (!name || !email || !message) {
            showNotification('Пожалуйста, заполните все поля!', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showNotification('Пожалуйста, введите корректный email!', 'error');
            return;
        }

        // Simulate form submission
        simulateFormSubmission(name, email, message);
        
        // Reset form
        this.reset();
    });
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Simulate form submission
function simulateFormSubmission(name, email, message) {
    // Show loading state
    const submitButton = document.querySelector('#contactForm button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Отправка...';
    submitButton.disabled = true;

    // Simulate API call
    setTimeout(() => {
        // Restore button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        
        // Show success message
        showNotification('Сообщение отправлено! Мы ответим вам в ближайшее время.', 'success');
        
        // In a real application, you would send this data to your backend
        console.log('Form submission:', { name, email, message });
    }, 1500);
}

// Setup mobile menu
function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (!hamburger || !navMenu) return;

    hamburger.addEventListener('click', function() {
        this.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// Setup scroll effects
let observer;

function setupScrollEffects() {
    // Add scroll-triggered animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe initial elements
    observeElements();

    // Header background change on scroll
    window.addEventListener('scroll', function() {
        const header = document.querySelector('.header');
        if (window.scrollY > 50) {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
            header.style.backdropFilter = 'blur(10px)';
        } else {
            header.style.background = '#fff';
            header.style.backdropFilter = 'none';
        }
    });
}

function observeElements() {
    if (!observer) return;
    const animateElements = document.querySelectorAll('.product-card, .delivery-card, .contact-item');
    animateElements.forEach(el => observer.observe(el));
}

// Show notification
function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Set colors based on type
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.success};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 3000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;

    // Add animation styles if not already present
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Utility functions
function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB'
    }).format(price);
}

function generateOrderId() {
    return 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
}

// Initialize animations CSS
function initializeAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            animation: fadeInUp 0.6s ease forwards;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .product-card {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .product-card.animate-in {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);
}

// Call animations initialization
initializeAnimations();

// Expose global functions for HTML onclick handlers
window.scrollToProducts = scrollToProducts;
window.showProductDetails = showProductDetails;
window.closeProductModal = closeProductModal;
window.addToCart = addToCart;