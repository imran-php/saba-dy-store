// TypeScript interfaces for admin panel

export interface Order {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  delivery: {
    method: string;
    address?: string;
    city?: string;
    street?: string;
    house?: string;
    apartment?: string;
  };
  payment: {
    method: string;
  };
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  composition: string;
  usage: string;
  price: number;
  image: string;
  inStock: boolean;
  category?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSession {
  isAuthenticated: boolean;
  loginTime: string;
  expiresAt: string;
}

export interface AdminCredentials {
  pin: string;
  hashedPin: string;
}

export type OrderStatus = 'new' | 'pending_payment' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled';

export interface OrderFilters {
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  inStock?: boolean;
  isActive?: boolean;
}

export interface PaginationData {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
}