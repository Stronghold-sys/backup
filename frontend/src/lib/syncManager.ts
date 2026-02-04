/**
 * 🔄 Sync Manager - Centralized Data Synchronization
 * 
 * Mengelola sinkronisasi data antara:
 * - Frontend State (Custom React Store)
 * - Backend API (Supabase Edge Functions)
 * - Database (Supabase KV Store)
 * - Storage (Supabase Storage)
 */

import { supabase } from './supabase';
import { projectId, supabaseAnonKey } from '/utils/supabase';
import { authStoreInstance, authStoreHelpers, productStoreHelpers } from './store';
import { getAccessToken } from './authHelper'; // ✅ Import async getAccessToken

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba`;

// ✅ REMOVED: Old sync getAuthToken() - Now using async getAccessToken() from authHelper

/**
 * Make authenticated API request
 * ✅ UPDATED: Use async getAccessToken() for Supabase Auth session token
 */
async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  // ✅ CRITICAL FIX: Use async getAccessToken() from authHelper
  const token = await getAccessToken();
  
  // ✅ FIXED: Define public endpoints that don't require authentication
  const publicEndpoints = [
    '/products',
    '/init',
  ];
  
  // Check if endpoint is public (starts with any public endpoint)
  const isPublicEndpoint = publicEndpoints.some(publicPath => 
    endpoint === publicPath || endpoint.startsWith(publicPath + '/')
  );
  
  // ✅ OPTIMIZED: Only log/warn for non-public endpoints
  if (import.meta.env.DEV && !isPublicEndpoint) {
    if (!token) {
      console.warn(`⚠️ [apiRequest] No token available for protected endpoint: ${endpoint}`);
    } else {
      console.info(`🔑 [apiRequest] Token available for ${endpoint} (${token.substring(0, 20)}...)`);
    }
  }
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`,
    ...options.headers,
  };

  // Add session token if available
  if (token) {
    headers['X-Session-Token'] = token;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // ✅ OPTIMIZED: Only log for non-public endpoints
      if (import.meta.env.DEV && !isPublicEndpoint) {
        console.error(`❌ [apiRequest] ${endpoint} failed:`, {
          status: response.status,
          error: errorData,
          hasToken: !!token
        });
      }
      
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error(`❌ API Request failed [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * 🔄 Product Sync Manager
 */
export const ProductSync = {
  /**
   * Load all products from backend
   */
  async loadProducts(): Promise<void> {
    console.info('🔄 [ProductSync] Loading products...');
    try {
      const data = await apiRequest('/products', { method: 'GET' });

      if (data.success && data.products) {
        productStoreHelpers.setProducts(data.products);
        console.info(`✅ [ProductSync] Loaded ${data.products.length} products`);
      } else {
        throw new Error('Failed to load products');
      }
    } catch (error) {
      console.error('❌ [ProductSync] Load failed:', error);
      throw error;
    }
  },

  /**
   * Get single product
   */
  async getProduct(id: string): Promise<any> {
    console.info(`🔄 [ProductSync] Getting product ${id}...`);
    try {
      const data = await apiRequest(`/products/${id}`, { method: 'GET' });

      if (data.success && data.product) {
        console.info(`✅ [ProductSync] Got product ${id}`);
        return data.product;
      } else {
        throw new Error('Failed to get product');
      }
    } catch (error) {
      console.error(`❌ [ProductSync] Get failed for ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create product (Admin only)
   */
  async createProduct(productData: any): Promise<any> {
    console.info('🔄 [ProductSync] Creating product...');
    try {
      const data = await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });

      if (data.success && data.product) {
        // Reload products after create
        await this.loadProducts();
        console.info(`✅ [ProductSync] Created product ${data.product.id}`);
        return data.product;
      } else {
        throw new Error('Failed to create product');
      }
    } catch (error) {
      console.error('❌ [ProductSync] Create failed:', error);
      throw error;
    }
  },

  /**
   * Update product (Admin only)
   */
  async updateProduct(id: string, updates: any): Promise<any> {
    console.info(`🔄 [ProductSync] Updating product ${id}...`);
    try {
      const data = await apiRequest(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (data.success && data.product) {
        // Reload products after update
        await this.loadProducts();
        console.info(`✅ [ProductSync] Updated product ${id}`);
        return data.product;
      } else {
        throw new Error('Failed to update product');
      }
    } catch (error) {
      console.error(`❌ [ProductSync] Update failed for ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete product (Admin only)
   */
  async deleteProduct(id: string): Promise<void> {
    console.info(`🔄 [ProductSync] Deleting product ${id}...`);
    try {
      const data = await apiRequest(`/products/${id}`, { method: 'DELETE' });

      if (data.success) {
        // Reload products after delete
        await this.loadProducts();
        console.info(`✅ [ProductSync] Deleted product ${id}`);
      } else {
        throw new Error('Failed to delete product');
      }
    } catch (error) {
      console.error(`❌ [ProductSync] Delete failed for ${id}:`, error);
      throw error;
    }
  },

  /**
   * Upload product image (Admin only)
   */
  async uploadImage(file: File): Promise<string> {
    console.info('📤 [ProductSync] Uploading image...');
    try {
      const token = await getAccessToken(); // ✅ CRITICAL FIX: Use async getAccessToken
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE_URL}/admin/products/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'X-Session-Token': token || '',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      if (data.success && data.url) {
        console.info(`✅ [ProductSync] Image uploaded: ${data.url}`);
        return data.url;
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('❌ [ProductSync] Upload failed:', error);
      throw error;
    }
  },
};

/**
 * 🔄 Order Sync Manager
 */
export const OrderSync = {
  /**
   * Create new order
   */
  async createOrder(orderData: any): Promise<any> {
    console.info('🔄 [OrderSync] Creating order...');
    try {
      const data = await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });

      if (data.success && data.order) {
        console.info(`✅ [OrderSync] Created order ${data.order.id}`);
        return data.order;
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error) {
      console.error('❌ [OrderSync] Create failed:', error);
      throw error;
    }
  },

  /**
   * Get user's orders (Customer: only their orders, Admin: all orders)
   */
  async getUserOrders(): Promise<any[]> {
    console.info('🔄 [OrderSync] Getting user orders...');
    try {
      const data = await apiRequest('/orders', { method: 'GET' });

      if (data.success && data.orders) {
        console.info(`✅ [OrderSync] Got ${data.orders.length} orders`);
        return data.orders;
      } else {
        throw new Error('Failed to get orders');
      }
    } catch (error) {
      console.error('❌ [OrderSync] Get user orders failed:', error);
      throw error;
    }
  },

  /**
   * Get all orders (Admin only - same as getUserOrders but semantically clearer)
   */
  async getAllOrders(): Promise<any[]> {
    console.info('🔄 [OrderSync] Getting all orders (admin)...');
    try {
      // Admin sees all orders through regular /orders endpoint
      // Backend filters based on user role
      const data = await apiRequest('/orders', { method: 'GET' });

      if (data.success && data.orders) {
        console.info(`✅ [OrderSync] Got ${data.orders.length} orders`);
        return data.orders;
      } else {
        throw new Error('Failed to get orders');
      }
    } catch (error) {
      console.error('❌ [OrderSync] Get all orders failed:', error);
      throw error;
    }
  },

  /**
   * Get single order
   */
  async getOrder(orderId: string): Promise<any> {
    console.info(`🔄 [OrderSync] Getting order ${orderId}...`);
    try {
      const data = await apiRequest(`/orders/${orderId}`, { method: 'GET' });

      if (data.success && data.order) {
        console.info(`✅ [OrderSync] Got order ${orderId}`);
        return data.order;
      } else {
        throw new Error('Failed to get order');
      }
    } catch (error) {
      console.error(`❌ [OrderSync] Get failed for ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Update order status (Admin only)
   */
  async updateOrderStatus(orderId: string, status: string, note?: string): Promise<any> {
    console.info(`🔄 [OrderSync] Updating order ${orderId} to ${status}...`);
    try {
      // ✅ FIXED: Correct endpoint path (remove /admin prefix)
      const data = await apiRequest(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, note }),
      });

      if (data.success && data.order) {
        console.info(`✅ [OrderSync] Updated order ${orderId} to ${status}`);
        return data.order;
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error(`❌ [OrderSync] Update status failed for ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason: string): Promise<any> {
    console.info(`🔄 [OrderSync] Cancelling order ${orderId}...`);
    try {
      const data = await apiRequest(`/orders/${orderId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });

      if (data.success && data.order) {
        console.info(`✅ [OrderSync] Cancelled order ${orderId}`);
        return data.order;
      } else {
        throw new Error('Failed to cancel order');
      }
    } catch (error) {
      console.error(`❌ [OrderSync] Cancel failed for ${orderId}:`, error);
      throw error;
    }
  },
};

/**
 * 🔄 Refund Sync Manager
 */
export const RefundSync = {
  /**
   * Create refund request
   */
  async createRefund(refundData: any): Promise<any> {
    console.info('🔄 [RefundSync] Creating refund...');
    try {
      const data = await apiRequest('/refunds', {
        method: 'POST',
        body: JSON.stringify(refundData),
      });

      if (data.success && data.refund) {
        console.info(`✅ [RefundSync] Created refund ${data.refund.id}`);
        return data.refund;
      } else {
        throw new Error('Failed to create refund');
      }
    } catch (error) {
      console.error('❌ [RefundSync] Create failed:', error);
      throw error;
    }
  },

  /**
   * Get user's refunds
   */
  async getUserRefunds(): Promise<any[]> {
    console.info('🔄 [RefundSync] Getting user refunds...');
    try {
      const data = await apiRequest('/refunds', { method: 'GET' });

      if (data.success && data.refunds) {
        console.info(`✅ [RefundSync] Got ${data.refunds.length} refunds`);
        return data.refunds;
      } else {
        throw new Error('Failed to get refunds');
      }
    } catch (error) {
      console.error('❌ [RefundSync] Get user refunds failed:', error);
      throw error;
    }
  },

  /**
   * Get all refunds (Admin only)
   */
  async getAllRefunds(): Promise<any[]> {
    console.info('🔄 [RefundSync] Getting all refunds (admin)...');
    try {
      const data = await apiRequest('/admin/refunds', { method: 'GET' });

      if (data.success && data.refunds) {
        console.info(`✅ [RefundSync] Got ${data.refunds.length} refunds`);
        return data.refunds;
      } else {
        throw new Error('Failed to get all refunds');
      }
    } catch (error) {
      console.error('❌ [RefundSync] Get all refunds failed:', error);
      throw error;
    }
  },

  /**
   * Update refund status (Admin only)
   */
  async updateRefundStatus(refundId: string, status: string, adminNote?: string): Promise<any> {
    console.info(`🔄 [RefundSync] Updating refund ${refundId} to ${status}...`);
    try {
      const data = await apiRequest(`/admin/refunds/${refundId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, adminNote }),
      });

      if (data.success && data.refund) {
        console.info(`✅ [RefundSync] Updated refund ${refundId} to ${status}`);
        return data.refund;
      } else {
        throw new Error('Failed to update refund status');
      }
    } catch (error) {
      console.error(`❌ [RefundSync] Update status failed for ${refundId}:`, error);
      throw error;
    }
  },
};

/**
 * 🔄 User Sync Manager
 */
export const UserSync = {
  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<any> {
    console.info('🔄 [UserSync] Getting current user...');
    try {
      const data = await apiRequest('/profile', { method: 'GET' });

      if (data.success && data.user) {
        // Update auth store with user data
        authStoreHelpers.setUser(data.user);
        console.info(`✅ [UserSync] Got current user ${data.user.id}`);
        return data.user;
      } else {
        throw new Error('Failed to get current user');
      }
    } catch (error) {
      console.error('❌ [UserSync] Get current user failed:', error);
      throw error;
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(updates: any): Promise<any> {
    console.info('🔄 [UserSync] Updating profile...');
    try {
      const data = await apiRequest('/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (data.success && data.user) {
        // Update auth store with new data
        authStoreHelpers.setUser(data.user);
        console.info(`✅ [UserSync] Updated profile`);
        return data.user;
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('❌ [UserSync] Update profile failed:', error);
      throw error;
    }
  },

  /**
   * Upload profile photo
   */
  async uploadPhoto(file: File): Promise<string> {
    console.info('📤 [UserSync] Uploading photo...');
    try {
      const token = await getAccessToken(); // ✅ CRITICAL FIX: Use async getAccessToken
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`${API_BASE_URL}/profile/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'X-Session-Token': token || '',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      if (data.success && data.url) {
        console.info(`✅ [UserSync] Photo uploaded: ${data.url}`);
        return data.url;
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('❌ [UserSync] Upload photo failed:', error);
      throw error;
    }
  },

  /**
   * Get all users (Admin only)
   */
  async getAllUsers(): Promise<any[]> {
    console.info('🔄 [UserSync] Getting all users (admin)...');
    try {
      const data = await apiRequest('/admin/users', { method: 'GET' });

      if (data.success && data.users) {
        console.info(`✅ [UserSync] Got ${data.users.length} users`);
        return data.users;
      } else {
        throw new Error('Failed to get all users');
      }
    } catch (error) {
      console.error('❌ [UserSync] Get all users failed:', error);
      throw error;
    }
  },

  /**
   * Update user status (Admin only)
   */
  async updateUserStatus(userId: string, status: string): Promise<any> {
    console.info(`🔄 [UserSync] Updating user ${userId} to ${status}...`);
    try {
      const data = await apiRequest(`/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });

      if (data.success && data.user) {
        console.info(`✅ [UserSync] Updated user ${userId} to ${status}`);
        return data.user;
      } else {
        throw new Error('Failed to update user status');
      }
    } catch (error) {
      console.error(`❌ [UserSync] Update user status failed for ${userId}:`, error);
      throw error;
    }
  },
};

/**
 * 🔄 Initialize app data
 */
export async function initializeApp(): Promise<void> {
  console.info('🚀 [SyncManager] Initializing app...');
  
  try {
    // Load initial data
    await ProductSync.loadProducts();
    
    // Load user data if authenticated
    const token = await getAccessToken(); // ✅ CRITICAL FIX: Use async getAccessToken
    if (token) {
      try {
        await UserSync.getCurrentUser();
        
        // ✅ NEW: Load orders if user is authenticated (admin will see all, users see their own)
        const currentUser = authStoreInstance.getState().user;
        if (currentUser) {
          console.info('🔄 [SyncManager] Loading orders for authenticated user...');
          try {
            const orders = await OrderSync.getUserOrders();
            // Orders are returned but not stored in a global store yet
            // Individual components will fetch and store as needed
            console.info(`✅ [SyncManager] Loaded ${orders.length} orders`);
          } catch (orderError) {
            console.warn('⚠️ Failed to load orders (might not have any):', orderError);
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to load user data (might be logged out)');
      }
    }
    
    console.info('✅ [SyncManager] App initialized');
  } catch (error) {
    console.error('❌ [SyncManager] Initialization failed:', error);
    throw error;
  }
}

/**
 * 🔄 Sync all admin data (Admin only - comprehensive sync)
 */
export async function syncAdminData(): Promise<void> {
  console.info('🔄 [SyncManager] Syncing all admin data...');
  
  try {
    // Parallel loading for better performance
    const [products, orders, users] = await Promise.allSettled([
      ProductSync.loadProducts(),
      OrderSync.getAllOrders(),
      UserSync.getAllUsers()
    ]);
    
    if (products.status === 'fulfilled') {
      console.info('✅ [SyncManager] Products synced');
    } else {
      console.error('❌ [SyncManager] Failed to sync products:', products.reason);
    }
    
    if (orders.status === 'fulfilled') {
      console.info(`✅ [SyncManager] Orders synced: ${orders.value.length}`);
      // Import order store helpers to update store
      const { orderStoreHelpers } = await import('./store');
      orderStoreHelpers.setOrders(orders.value);
    } else {
      console.error('❌ [SyncManager] Failed to sync orders:', orders.reason);
    }
    
    if (users.status === 'fulfilled') {
      console.info(`✅ [SyncManager] Users synced: ${users.value.length}`);
    } else {
      console.error('❌ [SyncManager] Failed to sync users:', users.reason);
    }
    
    console.info('✅ [SyncManager] Admin data sync complete');
  } catch (error) {
    console.error('❌ [SyncManager] Admin data sync failed:', error);
    throw error;
  }
}