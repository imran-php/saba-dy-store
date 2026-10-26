import { Order, Product, AdminSession, AdminCredentials } from '../types';

const API_BASE = '/api';

// Order Management
export const orderStorage = {
  async getOrders(): Promise<Order[]> {
    try {
      const response = await fetch(`${API_BASE}/orders`);
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  },

  async updateOrder(orderId: string, updates: Partial<Order>): Promise<void> {
    try {
      await fetch(`${API_BASE}/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Error updating order:', error);
    }
  },

  async deleteOrder(orderId: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/orders/${orderId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  },
};

// Product Management
export const productStorage = {
  async getProducts(): Promise<Product[]> {
    try {
      const response = await fetch(`${API_BASE}/products`);
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  },

  async addProduct(product: FormData): Promise<void> {
    try {
      await fetch(`${API_BASE}/products`, {
        method: 'POST',
        // headers: { 'Content-Type': 'multipart/form-data' }, // Do NOT set this manually when sending FormData
        body: product,
      });
    } catch (error) {
      console.error('Error adding product:', error);
    }
  },

  async updateProduct(productId: string, updates: FormData): Promise<void> {
    try {
      await fetch(`${API_BASE}/products/${productId}`, {
        method: 'PUT',
        body: updates,
      });
    } catch (error) {
      console.error('Error updating product:', error);
    }
  },

  async deleteProduct(productId: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/products/${productId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  },
};

// Admin Authentication
export const adminStorage = {
  async login(pin: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error logging in:', error);
      return false;
    }
  },

  async changePin(oldPin: string, newPin: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/change-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPin, newPin }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Ошибка при смене PIN-кода' };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error changing PIN:', error);
      return { success: false, error: 'Ошибка сети' };
    }
  },

  getSession(): AdminSession | null {
    try {
      const data = sessionStorage.getItem('saba-dy-admin-session');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading admin session:', error);
      return null;
    }
  },

  saveSession(session: AdminSession): void {
    try {
      sessionStorage.setItem('saba-dy-admin-session', JSON.stringify(session));
    } catch (error) {
      console.error('Error saving admin session:', error);
    }
  },

  clearSession(): void {
    try {
      sessionStorage.removeItem('saba-dy-admin-session');
    } catch (error) {
      console.error('Error clearing admin session:', error);
    }
  },

  isSessionValid(): boolean {
    const session = this.getSession();
    if (!session || !session.isAuthenticated) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    return now < expiresAt;
  },
};

// Utility functions
export const generateId = (prefix: string = ''): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 6);
  return `${prefix}${timestamp}-${random}`.toUpperCase();
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
  }).format(amount);
};