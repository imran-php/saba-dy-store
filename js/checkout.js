// Checkout functionality for saba-dy

let selectedDeliveryOption = null;
let selectedPaymentMethod = null;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Handle return from YooKassa
    const urlParams = new URLSearchParams(window.location.search);
    const paymentFlow = urlParams.get('payment');
    const orderId = urlParams.get('orderId');

    if (paymentFlow === 'return' && orderId) {
        // Set flag to prevent redirect on empty cart
        window.isPaymentSuccess = true;
        handleReturnedPayment(orderId);
    }

    initializeCheckout();
});

async function fetchOrderStatus(orderId) {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`);
    if (!response.ok) {
        throw new Error('Failed to fetch order status');
    }
    const result = await response.json();
    return result.data;
}

function cleanPaymentParamsFromUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete('payment');
    url.searchParams.delete('orderId');
    window.history.replaceState({}, document.title, url.toString());
}

async function handleReturnedPayment(orderId) {
    try {
        // Webhook can arrive slightly later, so we retry a few times for final status.
        let statusData = null;
        for (let i = 0; i < 8; i++) {
            statusData = await fetchOrderStatus(orderId);
            if (statusData.status === 'paid' || statusData.status === 'cancelled' || statusData.status === 'canceled' || statusData.status === 'payment_error') {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 1200));
        }

        const status = (statusData && statusData.status) ? statusData.status : 'unknown';
        if (status === 'paid') {
            cart.clear();
            showOrderSuccess(orderId);
        } else if (status === 'cancelled' || status === 'canceled') {
            showNotification('Оплата отменена. Вы можете попробовать оплатить заказ снова.', 'warning');
        } else if (status === 'pending_payment' || status === 'new') {
            showNotification('Платеж еще обрабатывается. Обновите страницу через несколько секунд.', 'warning');
        } else {
            showNotification('Не удалось подтвердить оплату. Проверьте заказ позже или свяжитесь с нами.', 'error');
        }
    } catch (error) {
        console.error('Returned payment status error:', error);
        showNotification('Не удалось проверить статус оплаты. Попробуйте обновить страницу позже.', 'error');
    } finally {
        cleanPaymentParamsFromUrl();
    }
}

// Initialize checkout page
function initializeCheckout() {
    // Fetch delivery options first
    fetchDeliveryOptions().then(() => {
        renderOrderSummary();
        renderDeliveryOptions();
        renderPaymentOptions();
        setupCheckoutForm();
        setupMobileMenu();
        cart.updateCartUI();
        setupAdminLink();
    });
}

// Add Admin Link to Navigation (reused from main.js)
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

// Fetch delivery options from API
async function fetchDeliveryOptions() {
    try {
        // Fetch from API to get updated prices
        const response = await fetch('/api/delivery-options');
        if (!response.ok) throw new Error('Network response was not ok');
        const result = await response.json();
        // Update global variable used by checkout logic
        window.deliveryOptions = result.data.filter(opt => opt.isActive);
    } catch (error) {
        console.error('Error fetching delivery options:', error);
        // Fallback to local data (from data.js) if API fails
        if (typeof deliveryOptions === 'undefined') {
             // If data.js didn't load, define empty array or handle error
             window.deliveryOptions = [];
        } else {
             // If deliveryOptions exists (from data.js), use it as fallback but it might be stale
             window.deliveryOptions = deliveryOptions;
        }
    }
}

// Render order summary
function renderOrderSummary() {
    const orderItems = document.getElementById('orderItems');
    const itemsTotal = document.getElementById('itemsTotal');
    const deliveryCost = document.getElementById('deliveryCost');
    const finalTotal = document.getElementById('finalTotal');

    if ((!orderItems || cart.items.length === 0) && !window.isPaymentSuccess) {
        // Redirect to main page if cart is empty AND not a successful payment return
        window.location.href = 'index.html';
        return;
    }

    // Render cart items
    orderItems.innerHTML = cart.items.map(item => `
        <div class="order-item">
            <div class="order-item-info">
                <div class="order-item-image">
                    ${item.image && (item.image.startsWith('/') || item.image.startsWith('http')) 
                        ? `<img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">` 
                        : item.image}
                </div>
                <div class="order-item-details">
                    <h4>${item.name}</h4>
                    <p>${item.price}₽</p>
                </div>
            </div>
            <div class="order-item-quantity">x${item.quantity}</div>
        </div>
    `).join('');

    // Calculate totals
    const itemsTotalAmount = cart.getTotal();
    const deliveryAmount = selectedDeliveryOption ? selectedDeliveryOption.price : 0;
    const finalAmount = itemsTotalAmount + deliveryAmount;

    itemsTotal.textContent = itemsTotalAmount + '₽';
    deliveryCost.textContent = deliveryAmount + '₽';
    finalTotal.textContent = finalAmount + '₽';
}

// Render delivery options
function renderDeliveryOptions() {
    const deliveryOptionsContainer = document.getElementById('deliveryOptions');
    
    // Use window.deliveryOptions to ensure we use the updated data from API
    const options = window.deliveryOptions || [];
    
    deliveryOptionsContainer.innerHTML = options.map(option => `
        <div class="delivery-option" data-delivery-id="${option.id}">
            <input type="radio" name="deliveryMethod" value="${option.id}" id="delivery-${option.id}">
            <div class="delivery-option-info">
                <h4>${option.name}</h4>
                <p>${option.description}</p>
            </div>
            <div class="delivery-option-price">${option.price}₽</div>
        </div>
    `).join('');

    // Add event listeners
    const deliveryOptionElements = document.querySelectorAll('.delivery-option');
    deliveryOptionElements.forEach(element => {
        element.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            radio.checked = true;
            selectDeliveryOption(this);
        });
    });
}

// Render payment options
function renderPaymentOptions() {
    const paymentOptionsContainer = document.getElementById('paymentOptions');
    
    paymentOptionsContainer.innerHTML = paymentMethods.map(method => `
        <div class="payment-option" data-payment-id="${method.id}">
            <input type="radio" name="paymentMethod" value="${method.id}" id="payment-${method.id}">
            <div class="payment-option-info">
                <h4>${method.name}</h4>
                <p>${method.description}</p>
            </div>
        </div>
    `).join('');

    // Add event listeners
    const paymentOptionElements = document.querySelectorAll('.payment-option');
    paymentOptionElements.forEach(element => {
        element.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            radio.checked = true;
            selectPaymentMethod(this);
        });
    });

    // Auto-select single payment method (YooKassa)
    if (paymentMethods.length === 1 && paymentOptionElements[0]) {
        const el = paymentOptionElements[0];
        const radio = el.querySelector('input[type="radio"]');
        radio.checked = true;
        el.classList.add('selected');
        selectPaymentMethod(el);
    }
}

// Select delivery option
function selectDeliveryOption(element) {
    // Remove previous selection
    document.querySelectorAll('.delivery-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selection to clicked option
    element.classList.add('selected');
    
    // Get selected delivery option
    const deliveryId = element.dataset.deliveryId;
    // Use window.deliveryOptions to find the selected option
    const options = window.deliveryOptions || [];
    selectedDeliveryOption = options.find(opt => opt.id === deliveryId);
    
    // Show/hide address section
    const addressSection = document.getElementById('addressSection');
    if (deliveryId === 'pickup') {
        addressSection.style.display = 'none';
        // Clear address fields
        clearAddressFields();
    } else {
        addressSection.style.display = 'block';
    }
    
    // Update order summary
    renderOrderSummary();
}

// Select payment method
function selectPaymentMethod(element) {
    // Remove previous selection
    document.querySelectorAll('.payment-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selection to clicked option
    element.classList.add('selected');
    
    // Get selected payment method
    const paymentId = element.dataset.paymentId;
    selectedPaymentMethod = paymentMethods.find(method => method.id === paymentId);
}

// Clear address fields
function clearAddressFields() {
    const addressFields = ['deliveryFullAddress', 'deliveryCity', 'deliveryStreet', 'deliveryHouse', 'deliveryApartment'];
    addressFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
}

// Setup checkout form
function setupCheckoutForm() {
    const checkoutForm = document.getElementById('checkoutForm');
    if (!checkoutForm) return;

    checkoutForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateForm()) {
            processOrder();
        }
    });

    // Real-time validation
    const inputs = checkoutForm.querySelectorAll('input[required], textarea[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            clearError(this);
        });
    });
}

// Validate form
function validateForm() {
    let isValid = true;
    
    // Check required fields
    const requiredFields = [
        'customerName', 'customerPhone'
    ];
    
    // Add address fields if delivery is not pickup
    if (selectedDeliveryOption && selectedDeliveryOption.id !== 'pickup') {
        // Address can be provided as a single full address OR as structured fields
        const fullAddress = document.getElementById('deliveryFullAddress')?.value.trim();
        const needStructured = !fullAddress;
        if (needStructured) {
            requiredFields.push('deliveryCity', 'deliveryStreet', 'deliveryHouse');
        }
        // If neither provided, mark full address
        if (!fullAddress) {
            showFieldError('deliveryFullAddress', 'Укажите полный адрес или заполните поля ниже');
        }
    }
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !validateField(field)) {
            isValid = false;
        }
    });
    
    // Check delivery method
    if (!selectedDeliveryOption) {
        showNotification('Пожалуйста, выберите способ доставки', 'error');
        isValid = false;
    }
    
    // Check payment method
    if (!selectedPaymentMethod) {
        showNotification('Пожалуйста, выберите способ оплаты', 'error');
        isValid = false;
    }
    
    // Check terms acceptance
    const acceptTerms = document.getElementById('acceptTerms');
    if (!acceptTerms.checked) {
        showFieldError('acceptTerms', 'Необходимо принять условия');
        isValid = false;
    }
    
    return isValid;
}

// Validate individual field
function validateField(field) {
    const fieldId = field.id;
    const value = field.value.trim();
    
    // Clear previous error
    clearError(field);
    
    // Check if empty
    if (!value) {
        showFieldError(fieldId, 'Это поле обязательно');
        return false;
    }
    
    // Field-specific validation
    switch (fieldId) {
        case 'customerName':
            if (value.length < 2) {
                showFieldError(fieldId, 'Имя должно содержать минимум 2 символа');
                return false;
            }
            break;
            
        case 'customerPhone':
            const phoneRegex = /^\+?7?\s?\(?[0-9]{3}\)?\s?[0-9]{3}\s?[0-9]{2}\s?[0-9]{2}$/;
            if (!phoneRegex.test(value)) {
                showFieldError(fieldId, 'Введите корректный номер телефона');
                return false;
            }
            break;
            
        case 'customerEmail':
            if (value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    showFieldError(fieldId, 'Введите корректный email');
                    return false;
                }
            }
            break;
            
        case 'deliveryCity':
        case 'deliveryStreet':
            if (value.length < 2) {
                showFieldError(fieldId, 'Поле должно содержать минимум 2 символа');
                return false;
            }
            break;
            
        case 'deliveryHouse':
            if (!/^[0-9A-Za-z\-\s\/]+$/.test(value)) {
                showFieldError(fieldId, 'Введите корректный номер дома');
                return false;
            }
            break;
    }
    
    return true;
}

// Show field error
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + 'Error');
    
    if (field) {
        field.classList.add('error');
    }
    
    if (errorElement) {
        errorElement.textContent = message;
    }
}

// Clear field error
function clearError(field) {
    field.classList.remove('error');
    const errorElement = document.getElementById(field.id + 'Error');
    if (errorElement) {
        errorElement.textContent = '';
    }
}

// Process order
async function processOrder() {
    // Get form data
    const formData = new FormData(document.getElementById('checkoutForm'));
    
    // Show loading state
    const submitButton = document.querySelector('.submit-order-btn');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Оформление...';
    submitButton.disabled = true;
    submitButton.classList.add('loading');

    try {
        const orderData = {
            termsAccepted: document.getElementById('acceptTerms').checked,
            legalVersion: '2026-09-27',
            customerName: formData.get('customerName'),
            customerPhone: formData.get('customerPhone'),
            customerEmail: formData.get('customerEmail'),
            delivery: {
                method: selectedDeliveryOption.id,
                address: formData.get('deliveryFullAddress'),
                city: formData.get('deliveryCity'),
                street: formData.get('deliveryStreet'),
                house: formData.get('deliveryHouse'),
                apartment: formData.get('deliveryApartment')
            },
            payment: {
                method: selectedPaymentMethod.id // Use the object's ID property
            },
            items: cart.items,
            totalAmount: cart.getTotal() + selectedDeliveryOption.price,
            comment: formData.get('orderComment')
        };

        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();
        if (!response.ok) {
            const message = typeof result.error === 'string' && /[А-Яа-я]/.test(result.error)
                ? result.error : 'Не удалось оформить заказ. Попробуйте позже.';
            throw new Error(message);
        }

        // Check if there is a payment URL (YooKassa)
        if (result.data.paymentUrl) {
            // Show message before redirecting
            showNotification('Перенаправление на оплату...', 'success');
            
            // Redirect to payment page after a short delay
            setTimeout(() => {
                window.location.href = result.data.paymentUrl;
            }, 1000);
        } else {
            // If payment was supposedly YooKassa but no URL (maybe error or misconfig)
            // Ideally server should return error, but if success without URL for online payment...
            if (selectedPaymentMethod && selectedPaymentMethod.id === 'yookassa') {
                 // Fallback or error
                 console.warn('YooKassa selected but no payment URL returned');
            }

            // Clear cart
            cart.clear();
            
            // Show success message
            showOrderSuccess(result.data.id);
            
            // Log order data
            console.log('Order processed:', result.data);
        }

    } catch (error) {
        console.error('Order processing error:', error);
        showNotification(error.message || 'Произошла ошибка при оформлении заказа. Попробуйте позже.', 'error');
    } finally {
        // Restore button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        submitButton.classList.remove('loading');
    }
}

// Show order success modal
function showOrderSuccess(orderId) {
    const modal = document.getElementById('orderSuccessModal');
    const orderNumberSpan = document.getElementById('orderNumber');
    
    orderNumberSpan.textContent = orderId;
    modal.style.display = 'block';
}

// Setup mobile menu (reuse from main.js)
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

// Show notification (reuse from main.js)
function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
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

// Generate order ID (reuse from main.js)
function generateOrderId() {
    return 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
}

// Close modal functionality
document.addEventListener('DOMContentLoaded', function() {
    // Close modal when clicking the X
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
});
