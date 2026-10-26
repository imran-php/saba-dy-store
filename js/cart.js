// Shopping Cart Management
class ShoppingCart {
    constructor() {
        this.items = [];
        this.loadFromStorage();
    }

    // Load cart from localStorage
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('saba-dy-cart');
            const expires = Number(localStorage.getItem('saba-dy-cart-expires'));
            if (stored && expires && expires <= Date.now()) {
                localStorage.removeItem('saba-dy-cart');
                localStorage.removeItem('saba-dy-cart-expires');
                return;
            }
            const parsed = stored ? JSON.parse(stored) : [];
            this.items = Array.isArray(parsed) ? parsed.filter(item => item && Number.isFinite(Number(item.price)) && Number(item.quantity) > 0) : [];
            if (stored && !expires) this.saveToStorage();
        } catch (_) { this.items = []; }
    }

    saveToStorage() {
        try {
            if (!this.items.length) {
                localStorage.removeItem('saba-dy-cart');
                localStorage.removeItem('saba-dy-cart-expires');
                return;
            }
            localStorage.setItem('saba-dy-cart', JSON.stringify(this.items));
            localStorage.setItem('saba-dy-cart-expires', String(Date.now() + 30 * 86400000));
        } catch (_) { /* Keep the cart usable in memory if storage is unavailable. */ }
    }

    // Add item to cart
    addItem(product, quantity = 1) {
        const existingItem = this.items.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: quantity,
                image: product.image
            });
        }
        
        this.saveToStorage();
        this.updateCartUI();
        this.showNotification('Товар добавлен в корзину!');
    }

    // Remove item from cart
    removeItem(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.saveToStorage();
        this.updateCartUI();
        this.showNotification('Товар удален из корзины');
    }

    // Update item quantity
    updateQuantity(productId, quantity) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeItem(productId);
            } else {
                item.quantity = quantity;
                this.saveToStorage();
                this.updateCartUI();
            }
        }
    }

    // Get total price
    getTotal() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    // Get total items count
    getItemCount() {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    // Clear cart
    clear() {
        this.items = [];
        this.saveToStorage();
        this.updateCartUI();
    }

    // Update cart UI
    updateCartUI() {
        const cartCount = document.getElementById('cartCount');
        const cartTotal = document.getElementById('cartTotal');
        const cartItems = document.getElementById('cartItems');

        if (cartCount) {
            cartCount.textContent = this.getItemCount();
        }

        if (cartTotal) {
            cartTotal.textContent = this.getTotal() + '₽';
        }

        if (cartItems) {
            this.renderCartItems(cartItems);
        }
    }

    // Render cart items
    renderCartItems(container) {
        if (this.items.length === 0) {
            container.innerHTML = '<p>Корзина пуста</p>';
            return;
        }

        container.innerHTML = this.items.map(item => `
            <div class="cart-item">
                <div class="cart-item-left">
                    <div class="cart-thumb">
                        ${item.image && (item.image.startsWith('/') || item.image.startsWith('http')) 
                            ? `<img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">` 
                            : item.image}
                    </div>
                    <div class="cart-info">
                        <div class="cart-title">${item.name}</div>
                        <div class="cart-price">${item.price}₽</div>
                    </div>
                </div>
                <div class="cart-item-right">
                    <div class="quantity">
                        <button class="qty-btn" onclick="cart.updateQuantity(${item.id}, ${item.quantity - 1})">−</button>
                        <span class="qty">${item.quantity}</span>
                        <button class="qty-btn" onclick="cart.updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                    </div>
                    <div class="item-total">${item.price * item.quantity}₽</div>
                    <button class="remove-btn" onclick="cart.removeItem(${item.id})">Удалить</button>
                </div>
            </div>
        `).join('');
    }

    // Show notification
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 3000;
            animation: slideIn 0.3s ease;
        `;

        // Add animation
        const style = document.createElement('style');
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

        // Add to page
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
}

// Initialize cart
const cart = new ShoppingCart();

// Cart modal functionality
function openCartModal() {
    document.getElementById('cartModal').style.display = 'block';
    cart.updateCartUI();
}

function closeCartModal() {
    document.getElementById('cartModal').style.display = 'none';
}

// Add event listeners for cart modal
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

        // Initial UI update
        cart.updateCartUI();
    });

// Add to cart function
function addToCart(productId) {
    // Try to find product in availableProducts (fetched from API) or fallback to data.js products
    let product;
    if (typeof availableProducts !== 'undefined' && availableProducts.length > 0) {
        product = availableProducts.find(p => p.id === productId);
    } else if (typeof products !== 'undefined') {
        product = products.find(p => p.id === productId);
    }

    if (product) {
        cart.addItem(product);
    }
}

// Proceed to checkout
function proceedToCheckout() {
    if (cart.items.length === 0) {
        cart.showNotification('Корзина пуста!');
        return;
    }
    
    // Close cart modal
    closeCartModal();
    
    // Redirect to dedicated checkout page
    window.location.href = 'checkout.html';
    cart.showNotification('Переход к оформлению заказа...');
}
