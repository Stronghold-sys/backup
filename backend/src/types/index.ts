// User Types
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
    status: 'active' | 'suspended' | 'banned';
    avatar?: string | null;
    phone?: string | null;
    addresses?: Address[];
    createdAt: string;
    updatedAt: string;
}

export interface Address {
    id: string;
    label: string;
    recipientName: string;
    phone: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    isDefault: boolean;
}

// Product Types
export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    originalPrice?: number | null;
    stock: number;
    category: string;
    images: string[];
    isActive: boolean;
    isFlashSale?: boolean;
    discount?: number | null;
    flashSaleEndTime?: string | null;
    createdAt: string;
    updatedAt: string;
}

// Order Types
export interface Order {
    id: string;
    userId: string;
    items: OrderItem[];
    totalAmount: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: string;
    shippingAddress: Address;
    shippingMethod: ShippingMethod;
    voucherCode?: string | null;
    discount?: number;
    createdAt: string;
    updatedAt: string;
}

export interface OrderItem {
    productId: string;
    productName: string;
    productImage: string;
    quantity: number;
    price: number;
}

export type OrderStatus =
    | 'pending'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled';

export type PaymentStatus =
    | 'pending'
    | 'paid'
    | 'failed'
    | 'refunded';

export interface ShippingMethod {
    id: string;
    name: string;
    price: number;
    estimatedDays: string;
}

// Cart Types
export interface Cart {
    userId: string;
    items: CartItem[];
    updatedAt: string;
}

export interface CartItem {
    productId: string;
    quantity: number;
}

// Voucher Types
export interface Voucher {
    id: string;
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minPurchase?: number;
    maxDiscount?: number;
    expiresAt?: string | null;
    usageLimit?: number;
    usedCount: number;
    status: 'active' | 'expired' | 'used';
    userId?: string | null;
    userEmail?: string | null;
    isPublic: boolean;
    createdAt: string;
}

// Refund Types
export interface Refund {
    id: string;
    orderId: string;
    userId: string;
    reason: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    adminNote?: string | null;
    createdAt: string;
    updatedAt: string;
}

// Verification Types
export interface VerificationCode {
    email: string;
    code: string;
    type: 'signup' | 'forgot_password';
    expiresAt: string;
    createdAt: string;
}

// Ban Types
export interface BanRecord {
    userId: string;
    type: 'ban' | 'suspend';
    reason: string;
    duration?: number | null;
    expiresAt?: string | null;
    isActive: boolean;
    createdAt: string;
}

// Deleted User Types
export interface DeletedUser {
    email: string;
    userId: string;
    deletedAt: string;
    deletedBy: string;
    reason?: string;
}

// Chat Types
export interface Conversation {
    id: string;
    participants: string[];
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: { [userId: string]: number };
    createdAt: string;
    updatedAt: string;
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    isRead: boolean;
    createdAt: string;
}

// Notification Types
export interface Notification {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    data?: any;
    createdAt: string;
}

// Settings Types
export interface SystemSettings {
    maintenanceMode: boolean;
    maintenanceMessage?: string;
    startTime?: string | null;
    endTime?: string | null;
}

// Request/Response Types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface AuthResponse {
    success: boolean;
    user?: User;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
    message?: string;
}

// Express Request with User
export interface AuthRequest extends Express.Request {
    user?: User;
}
