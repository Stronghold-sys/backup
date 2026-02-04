// BACKUP OF ZUSTAND IMPLEMENTATION
import { create } from 'zustand';

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

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null, accessToken?: string | null) => void;
  logout: () => void;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateProductInCart: (productId: string, updatedProduct: Product) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

interface UIState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isCartOpen: boolean;
  toggleCart: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setUser: (user, accessToken) =>
    set({
      user,
      accessToken: accessToken ?? get().accessToken,
      isAuthenticated: !!user,
    }),
  logout: () =>
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    }),
}));

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (newItem) =>
    set((state) => {
      const existingItemIndex = state.items.findIndex(
        (item) => item.productId === newItem.productId
      );

      if (existingItemIndex > -1) {
        const updatedItems = [...state.items];
        updatedItems[existingItemIndex].quantity += newItem.quantity;
        return { items: updatedItems };
      }

      return { items: [...state.items, newItem] };
    }),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
    })),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      ),
    })),
  updateProductInCart: (productId, updatedProduct) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId ? { ...item, product: updatedProduct } : item
      ),
    })),
  clearCart: () => set({ items: [] }),
  getTotalItems: () => {
    const items = get().items;
    return items.reduce((total, item) => total + item.quantity, 0);
  },
  getTotalPrice: () => {
    const items = get().items;
    return items.reduce(
      (total, item) => {
        const price = item.price || item.product?.price || 0;
        return total + (isNaN(price) ? 0 : price) * item.quantity;
      },
      0
    );
  },
}));

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  isCartOpen: false,
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
}));

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

interface SettingsState {
  settings: SiteSettings | null;
  isLoading: boolean;
  setSettings: (settings: SiteSettings) => void;
  setLoading: (loading: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: false,
  setSettings: (settings) => set({ settings }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

interface ProductState {
  products: Product[];
  isLoading: boolean;
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updatedProduct: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  clearProducts: () => void;
  getProductById: (id: string) => Product | undefined;
  setLoading: (loading: boolean) => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,
  setProducts: (products) => set({ products }),
  addProduct: (product) =>
    set((state) => ({
      products: [product, ...state.products],
    })),
  updateProduct: (id, updatedProduct) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, ...updatedProduct, updatedAt: new Date().toISOString() } : p
      ),
    })),
  deleteProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),
  clearProducts: () => set({ products: [] }),
  getProductById: (id) => {
    return get().products.find((p) => p.id === id);
  },
  setLoading: (loading) => set({ isLoading: loading }),
}));

interface OrderState {
  orders: Order[];
  isLoading: boolean;
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updatedOrder: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  clearOrders: () => void;
  getOrderById: (id: string) => Order | undefined;
  setLoading: (loading: boolean) => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  isLoading: false,
  setOrders: (orders) => set({ orders }),
  addOrder: (order) =>
    set((state) => ({
      orders: [order, ...state.orders],
    })),
  updateOrder: (id, updatedOrder) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === id ? { ...o, ...updatedOrder, updatedAt: new Date().toISOString() } : o
      ),
    })),
  deleteOrder: (id) =>
    set((state) => ({
      orders: state.orders.filter((o) => o.id !== id),
    })),
  clearOrders: () => set({ orders: [] }),
  getOrderById: (id) => {
    return get().orders.find((o) => o.id === id);
  },
  setLoading: (loading) => set({ isLoading: loading }),
}));
