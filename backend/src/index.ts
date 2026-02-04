import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import seed functions
import { seedAdmin } from './seeds/seedAdmin';
import { seedProducts } from './seeds/seedProducts';
import * as voucherStore from './stores/voucher.store';

// Import stores
import * as kv from './stores/kv.store';
import * as userStore from './stores/user.store';
import * as verificationStore from './stores/verification.store';
import * as banStore from './stores/ban.store';
import * as deletedUserStore from './stores/deleted-user.store';

// Import types
import { User, Product, Order } from './types';
import { hashPassword } from './utils/crypto';

// Create Express app
const app: Application = express();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token', 'X-User-Token'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 600,
    credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

// Helper function to get user from token
async function getUserFromToken(token: string | undefined): Promise<User | null> {
    if (!token) {
        return null;
    }

    try {
        const user = await userStore.getUserFromToken(token);
        return user;
    } catch (error) {
        logger.error('Error getting user from token:', error);
        return null;
    }
}

// ==================== HEALTH CHECK ====================
app.get('/', (_req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'Backend API is running',
        timestamp: new Date().toISOString()
    });
});

// ==================== INITIALIZATION ROUTES ====================
app.post('/make-server-adb995ba/init', async (_req: Request, res: Response) => {
    try {
        logger.info('Initializing application...');

        // Seed admin
        await seedAdmin();

        // Seed products
        const productsResult = await seedProducts();

        // Seed public vouchers
        await voucherStore.seedPublicVouchers();

        res.json({
            success: true,
            message: 'Application initialized successfully',
            timestamp: new Date().toISOString(),
            productsCount: productsResult.count
        });
    } catch (error: any) {
        logger.error('Initialization error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to initialize application'
        });
    }
});

app.get('/make-server-adb995ba/init', async (_req: Request, res: Response) => {
    try {
        logger.info('Initializing application (GET)...');

        await seedAdmin();
        await seedProducts();
        await voucherStore.seedPublicVouchers();

        res.json({
            success: true,
            message: 'Application initialized successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        logger.error('Initialization error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to initialize application'
        });
    }
});

// ==================== AUTH ROUTES ====================

// Sign Up - Request verification code
app.post('/make-server-adb995ba/auth/signup', async (req: Request, res: Response) => {
    try {
        const { email, password, name } = req.body;

        logger.info('Signup attempt for:', email);

        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, dan nama harus diisi'
            });
        }

        // Check if user already exists
        const existingUser = await userStore.getUserByEmail(email);

        if (existingUser.success && existingUser.user) {
            logger.info('User already exists:', email);
            return res.status(400).json({
                success: false,
                error: 'Email sudah terdaftar'
            });
        }

        // Generate verification code
        const verificationCode = verificationStore.generateVerificationCode();

        // Store verification code
        await verificationStore.storeVerificationCode(email, verificationCode, 'signup', 10);

        // Store temporary signup data
        await kv.set(`signup_pending:${email}`, {
            email,
            password: await hashPassword(password),
            plainPassword: password,
            name,
            createdAt: new Date().toISOString()
        });

        // Pre-generate voucher
        let voucher = null;
        try {
            const tempUserId = `temp-${Date.now()}`;
            voucher = await voucherStore.createVoucherForUser(tempUserId, email);
            logger.success('Voucher pre-created:', voucher.code);
        } catch (voucherError) {
            logger.warn('Failed to generate voucher:', voucherError);
        }

        logger.info('Verification code ready:', verificationCode);

        res.json({
            success: true,
            message: 'Kode verifikasi telah dikirim ke email Anda',
            email: email,
            verificationCode: verificationCode,
            voucher: voucher ? {
                code: voucher.code,
                discountValue: voucher.discountValue
            } : null
        });

    } catch (error: any) {
        logger.error('Signup error:', error);
        res.status(500).json({
            success: false,
            error: 'Terjadi kesalahan saat mendaftar'
        });
    }
});

// Verify Signup Code
app.post('/make-server-adb995ba/auth/verify-signup', async (req: Request, res: Response) => {
    try {
        const { email, code } = req.body;

        logger.info('Verifying signup code for:', email);

        if (!email || !code) {
            return res.status(400).json({
                success: false,
                error: 'Email dan kode verifikasi harus diisi'
            });
        }

        // Verify code
        const verification = await verificationStore.verifyCode(email, code, 'signup');

        if (!verification.success) {
            return res.status(400).json({
                success: false,
                error: verification.error
            });
        }

        // Get pending signup data
        const pendingSignup = await kv.get(`signup_pending:${email}`);

        if (!pendingSignup) {
            return res.status(400).json({
                success: false,
                error: 'Data pendaftaran tidak ditemukan'
            });
        }

        // Create user in Supabase Auth
        const authResult = await userStore.createUserInAuth(
            pendingSignup.email,
            pendingSignup.plainPassword || '',
            pendingSignup.name
        );

        if (!authResult.success || !authResult.data) {
            logger.error('Failed to create user in Supabase Auth:', authResult.error);
            return res.status(500).json({
                success: false,
                error: 'Gagal membuat akun. Silakan coba lagi.'
            });
        }

        const userId = authResult.data.id;
        const metadata = authResult.data.user_metadata || {};

        const newUser: User = {
            id: userId,
            email: authResult.data.email || '',
            name: metadata.name || pendingSignup.name,
            role: metadata.role || 'user',
            status: metadata.status || 'active',
            avatar: metadata.avatar || null,
            phone: metadata.phone || null,
            addresses: metadata.addresses || [],
            createdAt: authResult.data.created_at,
            updatedAt: authResult.data.updated_at || authResult.data.created_at
        };

        // Update voucher with real userId
        const vouchers = await kv.getByPrefix('voucher:');
        const userVoucher = vouchers.find((v: any) => v.userEmail === email && v.status === 'active');

        if (userVoucher) {
            userVoucher.userId = userId;
            await kv.set(`voucher:${userVoucher.id}`, userVoucher);
            logger.success('Voucher updated with real userId:', userVoucher.code);
        }

        // Sign in to get access token
        const signInResult = await userStore.signInUser(pendingSignup.email, pendingSignup.plainPassword || '');

        if (!signInResult.success || !signInResult.accessToken) {
            logger.error('Failed to sign in after registration');
            return res.status(500).json({
                success: false,
                error: 'Akun berhasil dibuat tetapi gagal login otomatis. Silakan login manual.'
            });
        }

        // Cleanup
        await kv.del(`signup_pending:${email}`);
        await verificationStore.deleteVerificationCode(email, 'signup');

        logger.success('User verified and created in Supabase Auth:', userId);

        res.json({
            success: true,
            user: newUser,
            accessToken: signInResult.accessToken,
            voucher: userVoucher,
            message: '✅ Akun berhasil diverifikasi!'
        });

    } catch (error: any) {
        logger.error('Verify signup error:', error);
        res.status(500).json({
            success: false,
            error: 'Terjadi kesalahan saat verifikasi'
        });
    }
});

// Sign In
app.post('/make-server-adb995ba/auth/signin', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        logger.info('Login attempt received');

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email dan password harus diisi'
            });
        }

        // Check if user was deleted
        const deletedUser = await deletedUserStore.getDeletedUserByEmail(email);
        if (deletedUser) {
            logger.info('User was deleted by admin:', email);
            return res.status(403).json({
                success: false,
                deleted: true,
                deletedData: deletedUser,
                error: 'Akun Anda telah dihapus oleh administrator'
            });
        }

        // Sign in using Supabase Auth
        const signInResult = await userStore.signInUser(email, password);

        if (!signInResult.success || !signInResult.user || !signInResult.accessToken) {
            logger.info('Sign in failed:', signInResult.error);
            return res.status(401).json({
                success: false,
                error: 'Email atau password salah'
            });
        }

        const user = signInResult.user;

        // Check if user is banned
        const { banned, data: banData } = await banStore.isUserBanned(user.id);
        if (banned && banData) {
            logger.info(`User ${banData.type}ed:`, email);
            return res.status(403).json({
                success: false,
                banned: true,
                banData,
                error: `Akun Anda di-${banData.type} oleh admin`
            });
        }

        // Check user status
        if (user.status !== 'active') {
            logger.info('User account suspended/banned:', email);
            return res.status(403).json({
                success: false,
                status: user.status,
                error: 'Akun Anda sedang diblokir atau disuspend'
            });
        }

        logger.success('Login successful | Role:', user.role);

        res.json({
            success: true,
            user: user,
            accessToken: signInResult.accessToken,
            refreshToken: signInResult.refreshToken
        });

    } catch (error: any) {
        logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Terjadi kesalahan saat login'
        });
    }
});

// Get current user
app.get('/make-server-adb995ba/auth/me', async (req: Request, res: Response) => {
    try {
        const token = req.headers['x-session-token'] as string;
        const user = await getUserFromToken(token);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized'
            });
        }

        res.json({
            success: true,
            user: user
        });

    } catch (error: any) {
        logger.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Terjadi kesalahan'
        });
    }
});

// ==================== PRODUCT ROUTES ====================

// Get all products
app.get('/make-server-adb995ba/products', async (_req: Request, res: Response) => {
    try {
        const products = await kv.getByPrefix<Product>('product:');

        const activeProducts = products.filter(p => p.isActive !== false);

        activeProducts.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        logger.info(`Returning ${activeProducts.length} products`);

        res.json({
            success: true,
            products: activeProducts
        });

    } catch (error: any) {
        logger.error('Get products error:', error);
        res.status(500).json({
            success: false,
            error: 'Terjadi kesalahan saat mengambil produk',
            products: []
        });
    }
});

// Get single product
app.get('/make-server-adb995ba/products/:id', async (req: Request, res: Response) => {
    try {
        const productId = req.params.id;
        const product = await kv.get<Product>(`product:${productId}`);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Produk tidak ditemukan'
            });
        }

        res.json({
            success: true,
            product: product
        });

    } catch (error: any) {
        logger.error('Get product error:', error);
        res.status(500).json({
            success: false,
            error: 'Terjadi kesalahan'
        });
    }
});

// ==================== ORDER ROUTES ====================

// Get all orders
app.get('/make-server-adb995ba/orders', async (req: Request, res: Response) => {
    try {
        const token = req.headers['x-session-token'] as string;
        const user = await getUserFromToken(token);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized'
            });
        }

        const allOrders = await kv.getByPrefix<Order>('order:');

        let orders;
        if (user.role === 'admin') {
            orders = allOrders;
            logger.info(`Admin access - returning ALL ${allOrders.length} orders`);
        } else {
            orders = allOrders.filter(o => o.userId === user.id);
            logger.info(`User access - returning ${orders.length} of ${allOrders.length} orders`);
        }

        orders.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        res.json({
            success: true,
            orders: orders
        });

    } catch (error: any) {
        logger.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            error: 'Terjadi kesalahan saat mengambil pesanan',
            orders: []
        });
    }
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = env.PORT;

app.listen(PORT, () => {
    logger.success(`🚀 Server is running on port ${PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`Supabase URL: ${env.SUPABASE_URL}`);
});

export default app;
