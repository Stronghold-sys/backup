// Simple React-based store implementation - v2.0
import { useState, useEffect, useCallback, useMemo } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended' | 'banned';
  avatar?: string;
  phone?: string;
  addresses?: Address[];
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault?: boolean;
  label?: 'home' | 'office';
}

export interface Product {
  id: string;
  name: string;
  description: string;
  fullDescription?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  category: string;
  images: string[];
  image?: string;
  stock: number;
  sold: number;
  rating: number;
  reviewCount: number;
  badge?: string;
  isFlashSale?: boolean;
  flashSaleEndTime?: string;
  specifications?: { key: string; value: string }[];
  reviews?: Review[];
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  images?: string[];
  createdAt: string;
  helpful: number;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  price?: number;
  selectedVariant?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  shippingAddress: Address;
  shippingMethod: string | {
    providerId: string;
    providerName: string;
    providerLogo: string;
    serviceId: string;
    serviceName: string;
    estimasi: string;
    price: number;
  };
  shippingProvider?: string;
  shippingService?: string;
  shippingCost: number;
  paymentMethod: string;
  voucher?: any;
  discount?: number;
  subtotal: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paidAt?: string;
  refundedAt?: string;
  trackingNumber: string;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    note: string;
  }>;
  createdAt: string;
  updatedAt: string;
  hasRefund?: boolean;
  refundId?: string;
}

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  siteEmail: string;
  sitePhone: string;
  minOrderAmount: number;
  maxOrderAmount: number;
  shippingCostPerKm: number;
  freeShippingMin: number;
  refundPeriod: number;
  termsAndConditions: string;
  privacyPolicy: string;
}

// Create singleton stores using plain JS objects with subscribers
class Store<T> {
  private state: T;
  private listeners: Set<(state: T) => void> = new Set();

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState = () => this.state;

  setState = (partial: Partial<T> | ((state: T) => Partial<T>)) => {
    const newState = typeof partial === 'function' ? partial(this.state) : partial;
    const nextState = { ...this.state, ...newState };
    
    // ✅ FIX v16.8: ALWAYS update state - NO SHALLOW COMPARISON
    // Shallow comparison was blocking critical auth updates
    this.state = nextState;
    
    // ✅ CRITICAL: Notify ALL listeners immediately
    this.listeners.forEach((listener) => listener(this.state));
  };

  subscribe = (listener: (state: T) => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  // ✅ REMOVED: shallowEqual - was blocking updates
}

// Auth Store
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null; // ✅ NEW: Add refresh token
  isAuthenticated: boolean;
}

const authStore = new Store<AuthState>({
  user: null,
  accessToken: null,
  refreshToken: null, // ✅ NEW: Initialize refresh token
  isAuthenticated: false,
});

// ✅ Export store instance for non-React usage (e.g., API calls)
export const authStoreInstance = authStore;

// ✅ Export helper functions for non-React usage
export const authStoreHelpers = {
  // ✅ Set user data and token (after successful login or session restoration)
  setUser: (user: User, token: string) => {
    console.info('🔑 [AuthStore] setUser called:', {
      userEmail: user.email,
      userRole: user.role,
      userId: user.id,
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenPreview: token ? `${token.substring(0, 30)}...` : 'NONE'
    });
    
    // ✅ CRITICAL: Verify token is valid before setting
    if (!token || token.length < 20) {
      console.error('❌ [AuthStore] Invalid token provided to setUser!', {
        token: token,
        length: token?.length
      });
      return;
    }
    
    authStore.setState({
      user,
      accessToken: token,
      isAuthenticated: true,
    });
    
    // ✅ VERIFY: Confirm state was set correctly
    const currentState = authStore.getState();
    console.info('✅ [AuthStore] State updated successfully:', {
      hasUser: !!currentState.user,
      hasToken: !!currentState.accessToken,
      tokenLength: currentState.accessToken?.length,
      isAuthenticated: currentState.isAuthenticated,
      userEmail: currentState.user?.email
    });
  },
  setToken: (accessToken: string | null) => {
    authStore.setState({
      accessToken,
    });
    
    // ✅ Token persistence is handled by Supabase Auth SDK automatically
    console.info('✅ [AuthStore] Access token updated in memory');
  },
  logout: async () => {
    console.info('🧹 [AuthStore] Clearing auth state...');
    
    // ✅ FIX v16.4: Clear state FIRST before Supabase logout
    // This ensures UI updates immediately
    authStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null, // ✅ NEW: Clear refresh token
      isAuthenticated: false,
    });
    
    console.info('✅ [AuthStore] State cleared - UI should update now');
    
    // ✅ Then sign out from Supabase Auth
    try {
      const { logoutSupabase } = await import('./supabase');
      const result = await logoutSupabase();
      
      if (result.success && !(result as any).aborted) {
        console.info('✅ [AuthStore] Logged out from Supabase Auth successfully');
      } else if (!result.success) {
        console.warn('⚠️ [AuthStore] Supabase logout warning:', result.error);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('❌ [AuthStore] Error during Supabase logout:', error);
      }
    }
    
    console.info('✅ [AuthStore] Logout completed');
  },
  // ✅ Alias for logout (for compatibility)
  clearUser: async () => {
    await authStoreHelpers.logout();
  },
  // ✅ NEW: Restore session from Supabase Auth (NOT localStorage) - OPTIMIZED VERSION
  restoreSession: async () => {
    try {
      // ✅ OPTIMIZED: Check if we already have valid session in store first
      const currentState = authStore.getState();
      if (currentState.user && currentState.accessToken) {
        console.info('⏭️ [AuthStore] Valid session already in store, skipping Supabase check');
        return true;
      }

      console.info('🔄 [AuthStore] Attempting to restore session from Supabase Auth...');
      
      // Import Supabase client dynamically to avoid circular dependency
      const { supabase } = await import('./supabase');
      
      // Get current session from Supabase Auth
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ [AuthStore] Error getting session:', error.message);
        return false;
      }
      
      if (session && session.user) {
        // ✅ OPTIMIZED: Use basic info from session first (fast)
        // Full profile will be fetched by useAuthListener if needed
        const userData = session.user.user_metadata;
        
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: userData?.name || session.user.email?.split('@')[0] || 'Unknown',
          role: userData?.role || 'user',
          status: userData?.status || 'active',
          avatar: userData?.avatar || undefined,
          phone: userData?.phone || undefined,
          addresses: userData?.addresses || [],
        };
        
        console.info('✅ [AuthStore] Session restored from Supabase Auth:', user.email);
        console.info('   - User role:', user.role);
        console.info('   - User status:', user.status);
        
        authStore.setState({
          user,
          accessToken: session.access_token,
          refreshToken: session.refresh_token, // ✅ NEW: Set refresh token
          isAuthenticated: true,
        });
        
        return true;
      } else {
        console.info('ℹ️ [AuthStore] No active session found in Supabase Auth');
        return false;
      }
    } catch (error) {
      console.error('❌ [AuthStore] Failed to restore session:', error);
      return false;
    }
  },
};

export function useAuthStore() {
  const [state, setState] = useState(authStore.getState());

  useEffect(() => {
    return authStore.subscribe(setState);
  }, []);

  // ✅ FIXED: Wrap helpers in useMemo to ensure stable references
  // This prevents infinite loops in useEffect dependencies
  const stableHelpers = useMemo(() => authStoreHelpers, []);

  return {
    ...state,
    ...stableHelpers, // ✅ Use memoized helpers for stable references
  };
}

// Cart Store
interface CartState {
  items: CartItem[];
}

const cartStore = new Store<CartState>({
  items: [],
});

// ✅ Export store instance for non-React usage
export const cartStoreInstance = cartStore;

// ✅ Export helper functions for non-React usage (e.g., API calls)
export const cartStoreHelpers = {
  setItems: (items: CartItem[]) => {
    cartStore.setState({ items });
  },
  addItem: (newItem: CartItem) => {
    const currentState = cartStore.getState();
    const existingItemIndex = currentState.items.findIndex(
      (item) => item.productId === newItem.productId
    );

    if (existingItemIndex > -1) {
      const updatedItems = [...currentState.items];
      updatedItems[existingItemIndex].quantity += newItem.quantity;
      cartStore.setState({ items: updatedItems });
    } else {
      cartStore.setState({ items: [...currentState.items, newItem] });
    }
  },
  removeItem: (productId: string) => {
    const currentState = cartStore.getState();
    cartStore.setState({
      items: currentState.items.filter((item) => item.productId !== productId),
    });
  },
  updateQuantity: (productId: string, quantity: number) => {
    const currentState = cartStore.getState();
    cartStore.setState({
      items: currentState.items.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      ),
    });
  },
  updateProductInCart: (productId: string, updatedProduct: Product) => {
    const currentState = cartStore.getState();
    cartStore.setState({
      items: currentState.items.map((item) =>
        item.productId === productId ? { ...item, product: updatedProduct } : item
      ),
    });
  },
  clearCart: () => {
    cartStore.setState({ items: [] });
  },
  getTotalItems: () => {
    const currentState = cartStore.getState();
    return currentState.items.reduce((total, item) => total + item.quantity, 0);
  },
  getTotalPrice: () => {
    const currentState = cartStore.getState();
    return currentState.items.reduce((total, item) => {
      const price = item.price || item.product?.price || 0;
      return total + (isNaN(price) ? 0 : price) * item.quantity;
    }, 0);
  },
};

export function useCartStore() {
  const [state, setState] = useState(cartStore.getState());

  useEffect(() => {
    return cartStore.subscribe(setState);
  }, []);

  // ✅ FIXED: Wrap helpers in useMemo to ensure stable references
  const stableHelpers = useMemo(() => cartStoreHelpers, []);

  return {
    ...state,
    ...stableHelpers, // ✅ Use memoized helpers for stable references
  };
}

// UI Store
interface UIState {
  isSidebarOpen: boolean;
  isCartOpen: boolean;
}

const uiStore = new Store<UIState>({
  isSidebarOpen: false,
  isCartOpen: false,
});

// ✅ Export store instance for non-React usage
export const uiStoreInstance = uiStore;

export function useUIStore() {
  const [state, setState] = useState(uiStore.getState());

  useEffect(() => {
    return uiStore.subscribe(setState);
  }, []);

  return {
    ...state,
    toggleSidebar: () => {
      const currentState = uiStore.getState();
      uiStore.setState({ isSidebarOpen: !currentState.isSidebarOpen });
    },
    toggleCart: () => {
      const currentState = uiStore.getState();
      uiStore.setState({ isCartOpen: !currentState.isCartOpen });
    },
  };
}

// Settings Store
interface SettingsState {
  settings: SiteSettings | null;
  isLoading: boolean;
}

const settingsStore = new Store<SettingsState>({
  settings: null,
  isLoading: false,
});

// ✅ Export store instance for non-React usage
export const settingsStoreInstance = settingsStore;

export function useSettingsStore() {
  const [state, setState] = useState(settingsStore.getState());

  useEffect(() => {
    return settingsStore.subscribe(setState);
  }, []);

  return {
    ...state,
    setSettings: (settings: SiteSettings) => {
      settingsStore.setState({ settings });
    },
    setLoading: (loading: boolean) => {
      settingsStore.setState({ isLoading: loading });
    },
  };
}

// Product Store
interface ProductState {
  products: Product[];
  isLoading: boolean;
}

const productStore = new Store<ProductState>({
  products: [],
  isLoading: false,
});

// ✅ Export store instance for non-React usage
export const productStoreInstance = productStore;

// ✅ Export helper functions for non-React usage (e.g., API calls)
export const productStoreHelpers = {
  setProducts: (products: Product[]) => {
    productStore.setState({ products });
  },
  addProduct: (product: Product) => {
    const currentState = productStore.getState();
    productStore.setState({ products: [product, ...currentState.products] });
  },
  updateProduct: (id: string, updatedProduct: Partial<Product>) => {
    const currentState = productStore.getState();
    productStore.setState({
      products: currentState.products.map((p) =>
        p.id === id ? { ...p, ...updatedProduct, updatedAt: new Date().toISOString() } : p
      ),
    });
  },
  deleteProduct: (id: string) => {
    const currentState = productStore.getState();
    productStore.setState({
      products: currentState.products.filter((p) => p.id !== id),
    });
  },
  clearProducts: () => {
    productStore.setState({ products: [] });
  },
  getProductById: (id: string) => {
    const currentState = productStore.getState();
    return currentState.products.find((p) => p.id === id);
  },
  setLoading: (loading: boolean) => {
    productStore.setState({ isLoading: loading });
  },
};

export function useProductStore() {
  const [state, setState] = useState(productStore.getState());

  useEffect(() => {
    return productStore.subscribe(setState);
  }, []);

  // ✅ FIXED: Wrap helpers in useMemo to ensure stable references
  const stableHelpers = useMemo(() => productStoreHelpers, []);

  return {
    ...state,
    ...stableHelpers, // ✅ Use memoized helpers for stable references
  };
}

// Order Store
interface OrderState {
  orders: Order[];
  isLoading: boolean;
}

const orderStore = new Store<OrderState>({
  orders: [],
  isLoading: false,
});

// ✅ Export store instance for non-React usage
export const orderStoreInstance = orderStore;

// ✅ Export helper functions for non-React usage (e.g., API calls)
export const orderStoreHelpers = {
  setOrders: (orders: Order[]) => {
    orderStore.setState({ orders });
  },
  addOrder: (order: Order) => {
    const currentState = orderStore.getState();
    orderStore.setState({ orders: [order, ...currentState.orders] });
  },
  updateOrder: (id: string, updatedOrder: Partial<Order>) => {
    const currentState = orderStore.getState();
    orderStore.setState({
      orders: currentState.orders.map((o) =>
        o.id === id ? { ...o, ...updatedOrder, updatedAt: new Date().toISOString() } : o
      ),
    });
  },
  deleteOrder: (id: string) => {
    const currentState = orderStore.getState();
    orderStore.setState({
      orders: currentState.orders.filter((o) => o.id !== id),
    });
  },
  clearOrders: () => {
    orderStore.setState({ orders: [] });
  },
  getOrderById: (id: string) => {
    const currentState = orderStore.getState();
    return currentState.orders.find((o) => o.id === id);
  },
  setLoading: (loading: boolean) => {
    orderStore.setState({ isLoading: loading });
  },
};

export function useOrderStore() {
  const [state, setState] = useState(orderStore.getState());

  useEffect(() => {
    return orderStore.subscribe(setState);
  }, []);

  // ✅ FIXED: Wrap helpers in useMemo to ensure stable references
  const stableHelpers = useMemo(() => orderStoreHelpers, []);

  return {
    ...state,
    ...stableHelpers, // ✅ Use memoized helpers for stable references
  };
}