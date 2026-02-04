import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { seedProducts } from "./seedProducts.tsx";
import { seedAdmin } from "./seedAdmin.tsx";
import profileRoutes from "./profile.tsx";
import profilePhotoRoutes from "./profilePhotoRoutes.tsx";
import productRoutes from "./productRoutes.tsx";
import { initializeBuckets } from "./storageHelper.tsx";
import * as voucherStore from "./voucher_store.tsx";
import * as verificationStore from "./verification_store.tsx";
import * as userStore from "./user_store.tsx";
import * as banStore from "./ban_store.tsx";
import * as refundStore from "./refund_store.tsx";
import * as deletedUserStore from "./deleted_user_store.tsx";
import * as cartStore from "./cart_store.tsx";
import chatRoutes from "./chatRoutes.tsx";

const app = new Hono();

// Enable CORS for all routes
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Session-Token', 'X-User-Token'], // ✅ Added X-User-Token
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 600,
  credentials: true,
}));

// Enable logger - logs to console only, doesn't affect response
app.use('*', logger(console.log));

// Get Supabase client
const getSupabase = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
};

// Simple hash function for password (for demo/prototype purposes)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate UUID v4
function generateUUID(): string {
  return crypto.randomUUID();
}

// Get user from session token
async function getUserFromToken(token: string | null) {
  if (!token) {
    console.log('⚠️ getUserFromToken: No token provided');
    return null;
  }
  
  try {
    console.log(`🔍 getUserFromToken: Validating token with Supabase Auth`);
    console.log(`📏 getUserFromToken: Token length: ${token.length}`);
    console.log(`🔑 getUserFromToken: Token preview: ${token.substring(0, 40)}...`);
    
    // Use Supabase Auth to validate token
    // ✅ FIXED: getUserFromToken returns user object directly (not wrapped in result)
    const user = await userStore.getUserFromToken(token);
    
    if (user) {
      console.log(`✅ getUserFromToken: Found user ${user.email} (${user.role})`);
      console.log(`   ✓ User ID: ${user.id}`);
      console.log(`   ✓ Role: ${user.role}`);
      console.log(`   ✓ Status: ${user.status}`);
      return user;
    } else {
      console.log(`❌ getUserFromToken: User not found or token invalid`);
      return null;
    }
  } catch (error) {
    console.error('❌ getUserFromToken: Error getting user from token:', error);
    return null;
  }
}

// ==================== DEBUG ROUTES ====================

// Debug: Get all users (no auth required - for debugging only)
app.get('/make-server-adb995ba/debug/users', async (c) => {
  try {
    console.log('🔍 DEBUG: Fetching all users from KV store');
    const users = await kv.getByPrefix('user:');
    
    // Remove passwords for security
    const safeUsers = users.map(u => {
      const { password, ...safe } = u;
      return {
        ...safe,
        hasAccessToken: !!u.accessToken,
        accessTokenPreview: u.accessToken ? u.accessToken.substring(0, 20) + '...' : 'NO TOKEN'
      };
    });
    
    console.log(`🔍 DEBUG: Found ${safeUsers.length} users`);
    safeUsers.forEach(u => {
      console.log(`  - ${u.email} (${u.role}) - Token: ${u.accessTokenPreview}`);
    });
    
    return c.json({
      success: true,
      count: safeUsers.length,
      users: safeUsers
    });
  } catch (error: any) {
    console.error('❌ DEBUG: Error fetching users:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// Debug: Test token validation
app.get('/make-server-adb995ba/debug/validate-token', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    console.log('🔍 DEBUG: Validating token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    
    const user = await getUserFromToken(token);
    
    return c.json({
      success: true,
      hasToken: !!token,
      userFound: !!user,
      user: user ? {
        email: user.email,
        role: user.role,
        status: user.status
      } : null
    });
  } catch (error: any) {
    console.error('❌ DEBUG: Error validating token:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// ==================== INITIALIZE ROUTES ====================
app.post('/make-server-adb995ba/init', async (c) => {
  try {
    console.log('🚀 Initializing application...');
    
    // 1. Initialize storage buckets - DISABLED (using base64 storage)
    console.log('📦 Skipping storage buckets (using base64)...');
    
    // 2. Initialize users table in Supabase (optional - won't fail init)
    console.log('🗄️  Setting up users table...');
    let tableInit = { success: false, needsManualSetup: false };
    try {
      tableInit = await userStore.initializeUsersTable();
      if (tableInit.needsManualSetup) {
        console.log('⚠️  Users table needs manual setup - check console for SQL');
      }
    } catch (tableError: any) {
      console.warn('⚠️  Could not check users table (optional):', tableError.message);
    }
    
    // 3. Seed SuperAdmin
    console.log('👤 Setting up SuperAdmin account...');
    try {
      await seedAdmin();
      console.log('✅ SuperAdmin setup complete');
    } catch (adminError: any) {
      console.error('❌ Failed to seed admin:', adminError.message);
      // Continue anyway - admin might already exist
    }
    
    // 4. Seed demo products
    console.log('📦 Seeding demo products...');
    let productsSeeded = { success: false, count: 0 };
    try {
      productsSeeded = await seedProducts();
      if (productsSeeded.skipped) {
        console.log('ℹ️  Products already exist, skipped seeding');
      } else {
        console.log(`✅ Products seeding complete (${productsSeeded.count} products)`);
      }
    } catch (productsError: any) {
      console.error('❌ Failed to seed products:', productsError.message);
      console.error('   This is not critical - app can still work without demo products');
      // Continue anyway - products might fail but app can still work
    }
    
    // 5. Seed public vouchers
    console.log('🎫 Seeding public vouchers...');
    try {
      await voucherStore.seedPublicVouchers();
      console.log('✅ Vouchers seeding complete');
    } catch (voucherError: any) {
      console.error('❌ Failed to seed vouchers:', voucherError.message);
      // Continue anyway - vouchers are optional
    }

    return c.json({ 
      success: true, 
      message: 'Application initialized successfully',
      timestamp: new Date().toISOString(),
      usersTableReady: tableInit.success,
      productsCount: productsSeeded.count || 0,
    });
  } catch (error: any) {
    console.error('❌ Initialization error:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to initialize application' 
    }, 500);
  }
});

// Support GET method for backwards compatibility
app.get('/make-server-adb995ba/init', async (c) => {
  try {
    console.log('🚀 Initializing application (via GET)...');
    
    // 1. Initialize storage buckets - DISABLED (using base64 storage)
    console.log('📦 Skipping storage buckets (using base64)...');
    
    // 2. Initialize users table in Supabase (optional - won't fail init)
    console.log('🗄️  Setting up users table...');
    let tableInit = { success: false, needsManualSetup: false };
    try {
      tableInit = await userStore.initializeUsersTable();
      if (tableInit.needsManualSetup) {
        console.log('⚠️  Users table needs manual setup - check console for SQL');
      }
    } catch (tableError: any) {
      console.warn('⚠️  Could not check users table (optional):', tableError.message);
    }
    
    // 3. Seed SuperAdmin
    console.log('👤 Setting up SuperAdmin account...');
    await seedAdmin();
    
    // 4. Seed demo products
    console.log('📦 Seeding demo products...');
    await seedProducts();
    
    // 5. Seed public vouchers
    console.log('🎫 Seeding public vouchers...');
    await voucherStore.seedPublicVouchers();

    return c.json({ 
      success: true, 
      message: 'Application initialized successfully',
      timestamp: new Date().toISOString(),
      usersTableReady: tableInit.success,
    });
  } catch (error: any) {
    console.error('❌ Initialization error:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to initialize application' 
    }, 500);
  }
});

// ==================== AUTH ROUTES ====================

// Sign Up - Step 1: Request verification code
app.post('/make-server-adb995ba/auth/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body;

    console.log('📝 Signup attempt for:', email);

    // Validate input
    if (!email || !password || !name) {
      return c.json({
        success: false,
        error: 'Email, password, dan nama harus diisi'
      }, 400);
    }

    // Check if user already exists in Supabase Auth
    const existingUserResult = await userStore.getUserByEmail(email);

    if (existingUserResult.success && existingUserResult.user) {
      console.log('❌ User already exists:', email);
      return c.json({
        success: false,
        error: 'Email sudah terdaftar'
      }, 400);
    }

    // Generate verification code
    const verificationCode = verificationStore.generateVerificationCode();
    
    // Store verification code (expires in 10 minutes)
    await verificationStore.storeVerificationCode(email, verificationCode, 'signup', 10);
    
    // Store temporary signup data (untuk digunakan setelah verifikasi)
    await kv.set(`signup_pending:${email}`, {
      email,
      password: await hashPassword(password), // Hashed for KV store
      plainPassword: password, // Plain password for Supabase Auth
      name,
      createdAt: new Date().toISOString()
    });
    
    // 🎫 Pre-generate voucher for new user (before verification)
    let voucher = null;
    try {
      console.log('🎁 Pre-generating welcome voucher...');
      const tempUserId = `temp-${Date.now()}`;
      voucher = await voucherStore.createVoucherForUser(tempUserId, email);
      console.log('✅ Voucher pre-created:', voucher.code, `(${voucher.discountValue}%)`);
    } catch (voucherError) {
      console.error('⚠️  Warning: Failed to generate voucher:', voucherError);
    }
    
    // 📧 Log verification code info (Frontend will send via EmailJS)
    console.log('📧 Verification email data ready:');
    console.log('   Email:', email);
    console.log('   Name:', name);
    console.log('   Verification Code:', verificationCode);
    console.log(`   Voucher Code: ${voucher?.code || 'N/A'}`);
    console.log(`   Voucher Discount: ${voucher?.discountValue || 0}%`);
    
    return c.json({
      success: true,
      message: 'Kode verifikasi telah dikirim ke email Anda',
      email: email,
      verificationCode: verificationCode, // Frontend akan kirim email
      voucher: voucher ? {
        code: voucher.code,
        discountValue: voucher.discountValue
      } : null
    });

  } catch (error: any) {
    console.error('❌ Signup error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat mendaftar'
    }, 500);
  }
});

// Verify Signup Code
app.post('/make-server-adb995ba/auth/verify-signup', async (c) => {
  try {
    const body = await c.req.json();
    const { email, code } = body;

    console.log('🔐 Verifying signup code for:', email);

    // Validate input
    if (!email || !code) {
      return c.json({
        success: false,
        error: 'Email dan kode verifikasi harus diisi'
      }, 400);
    }

    // Verify code
    const verification = await verificationStore.verifyCode(email, code, 'signup');
    
    if (!verification.success) {
      return c.json({
        success: false,
        error: verification.error
      }, 400);
    }

    // Get pending signup data
    const pendingSignup = await kv.get(`signup_pending:${email}`);
    
    if (!pendingSignup) {
      return c.json({
        success: false,
        error: 'Data pendaftaran tidak ditemukan'
      }, 400);
    }

    // 🔐 CREATE USER IN SUPABASE AUTH (official auth system)
    console.log('🔐 Creating user in Supabase Auth...');
    
    const authResult = await userStore.createUserInAuth(
      pendingSignup.email,
      pendingSignup.plainPassword || '',
      pendingSignup.name
    );
    
    if (!authResult.success || !authResult.data) {
      console.error('❌ Failed to create user in Supabase Auth:', authResult.error);
      return c.json({
        success: false,
        error: 'Gagal membuat akun. Silakan coba lagi.'
      }, 500);
    }

    const userId = authResult.data.id;
    const metadata = authResult.data.user_metadata || {};
    
    const newUser = {
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
    const userVoucher = vouchers.find(v => v.userEmail === email && v.status === 'active');
    
    if (userVoucher) {
      userVoucher.userId = userId;
      await kv.set(`voucher:${userVoucher.id}`, JSON.stringify(userVoucher));
      console.log('✅ Voucher updated with real userId:', userVoucher.code);
    }

    // Sign in to get access token
    const signInResult = await userStore.signInUser(pendingSignup.email, pendingSignup.plainPassword || '');
    
    if (!signInResult.success || !signInResult.accessToken) {
      console.error('❌ Failed to sign in after registration');
      return c.json({
        success: false,
        error: 'Akun berhasil dibuat tetapi gagal login otomatis. Silakan login manual.'
      }, 500);
    }

    // Cleanup
    await kv.del(`signup_pending:${email}`);
    await verificationStore.deleteVerificationCode(email, 'signup');

    console.log('✅ User verified and created in Supabase Auth:', userId);

    return c.json({
      success: true,
      user: newUser,
      accessToken: signInResult.accessToken,
      voucher: userVoucher,
      message: '✅ Akun berhasil diverifikasi!'
    });

  } catch (error: any) {
    console.error('❌ Verify signup error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat verifikasi'
    }, 500);
  }
});

// Resend Verification Code
app.post('/make-server-adb995ba/auth/resend-verification', async (c) => {
  try {
    const body = await c.req.json();
    const { email, type } = body;

    console.log('📧 Resending verification code to:', email);

    if (!email || !type) {
      return c.json({
        success: false,
        error: 'Email dan tipe verifikasi harus diisi'
      }, 400);
    }

    // Resend code
    const result = await verificationStore.resendVerificationCode(email, type);
    
    if (!result.success) {
      return c.json({
        success: false,
        error: result.error
      }, 400);
    }

    // Get voucher info if signup
    let voucher = null;
    if (type === 'signup') {
      const vouchers = await kv.getByPrefix('voucher:');
      voucher = vouchers.find(v => v.userEmail === email && v.status === 'active');
    }

    return c.json({
      success: true,
      message: 'Kode verifikasi baru telah dikirim',
      verificationCode: result.code,
      voucher: voucher ? {
        code: voucher.code,
        discountValue: voucher.discountValue
      } : null
    });

  } catch (error: any) {
    console.error('❌ Resend verification error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat mengirim ulang kode'
    }, 500);
  }
});

// Sign In
app.post('/make-server-adb995ba/auth/signin', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    console.log('🔐 Login attempt received (credentials hidden for security)');

    // Validate input
    if (!email || !password) {
      return c.json({
        success: false,
        error: 'Email dan password harus diisi'
      }, 400);
    }

      // ✅ FIX: Check if user was deleted by admin FIRST (before attempting login)
    const deletedUser = await deletedUserStore.getDeletedUserByEmail(email);
    if (deletedUser) {
      console.log('❌ User was deleted by admin:', email);
      console.log('🗑️  Deleted user data:', deletedUser);
      return c.json({
        success: false,
        deleted: true,
        deletedData: deletedUser,
        error: 'Akun Anda telah dihapus oleh administrator'
      }, 403);
    }

    // Sign in using Supabase Auth
    const signInResult = await userStore.signInUser(email, password);

    if (!signInResult.success || !signInResult.user || !signInResult.accessToken) {
      console.log('❌ Sign in failed:', signInResult.error);
      
      // ✅ FIX: Double-check if account was deleted (in case storeDeletedUser was called but check above missed it)
      const deletedCheck = await deletedUserStore.getDeletedUserByEmail(email);
      if (deletedCheck) {
        console.log('🗑️  Account was deleted, showing deleted notification');
        return c.json({
          success: false,
          deleted: true,
          deletedData: deletedCheck,
          error: 'Akun Anda telah dihapus oleh administrator'
        }, 403);
      }
      
      return c.json({
        success: false,
        error: 'Email atau password salah'
      }, 401);
    }

    const user = signInResult.user;

    // Check if user is banned/suspended
    const { banned, data: banData } = await banStore.isUserBanned(user.id);
    if (banned && banData) {
      console.log(`❌ User ${banData.type}ed:`, email);
      console.log('🚫 Ban data:', banData);
      return c.json({
        success: false,
        banned: true,
        banData,
        error: `Akun Anda di-${banData.type} oleh admin`
      }, 403);
    }

    // Check user status from metadata
    if (user.status !== 'active') {
      console.log('❌ User account suspended/banned:', email);
      console.log('📊 User status:', user.status);
      
      // ✅ FIX: Get ban data if status is banned/suspended but not in ban store
      const statusBanData = await banStore.getUserBan(user.id);
      if (statusBanData && statusBanData.isActive) {
        return c.json({
          success: false,
          banned: true,
          banData: statusBanData,
          error: 'Akun Anda sedang diblokir atau disuspend'
        }, 403);
      }
      
      return c.json({
        success: false,
        status: user.status,
        error: 'Akun Anda sedang diblokir atau disuspend'
      }, 403);
    }

    console.log('✅ Login successful | Role:', user.role);

    return c.json({
      success: true,
      user: user,
      accessToken: signInResult.accessToken,
      refreshToken: signInResult.refreshToken // ✅ CRITICAL: Return refresh token for session persistence
    });

  } catch (error: any) {
    console.error('❌ Login error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat login'
    }, 500);
  }
});

// ✅ NEW: Check user endpoint for ban/delete status (used by frontend after Supabase sign in)
app.post('/make-server-adb995ba/auth/check-user', async (c) => {
  try {
    const body = await c.req.json();
    const { email, userId } = body;

    console.log('🔍 Checking user status for:', email);

    if (!email) {
      return c.json({
        success: false,
        error: 'Email is required'
      }, 400);
    }

    // Check if user was deleted
    const deletedUser = await deletedUserStore.getDeletedUserByEmail(email);
    if (deletedUser) {
      console.log('🗑️ User was deleted:', deletedUser);
      return c.json({
        success: false,
        deleted: true,
        deletedData: deletedUser,
        error: 'User account was deleted'
      });
    }

    // Check if user is banned (if userId provided)
    if (userId) {
      const { banned, data: banData } = await banStore.isUserBanned(userId);
      if (banned && banData) {
        console.log('🚫 User is banned:', banData);
        return c.json({
          success: false,
          banned: true,
          banData,
          error: `User is ${banData.type}ed`
        });
      }
    }

    // User is OK
    return c.json({
      success: true,
      deleted: false,
      banned: false
    });

  } catch (error: any) {
    console.error('❌ Check user error:', error);
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
});

// ✅ DEBUG: Check admin user metadata (no auth required for debugging)
app.get('/make-server-adb995ba/admin/check-metadata', async (c) => {
  try {
    console.log('🔍 Checking admin user metadata...');
    const supabase = getSupabase();
    
    // Get admin user
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const adminUser = usersData.users.find(u => u.email === 'utskelompok03@gmail.com');
    
    if (!adminUser) {
      console.error('❌ Admin user not found');
      return c.json({ success: false, error: 'Admin user not found' }, 404);
    }
    
    console.log('👤 Found admin user:', adminUser.email);
    console.log('📝 Current metadata:', adminUser.user_metadata);
    console.log('🔑 User ID:', adminUser.id);
    console.log('📅 Created at:', adminUser.created_at);
    console.log('📅 Last sign in:', adminUser.last_sign_in_at);
    
    const metadata = adminUser.user_metadata || {};
    const hasCorrectRole = metadata.role === 'admin';
    
    return c.json({ 
      success: true, 
      user: {
        id: adminUser.id,
        email: adminUser.email,
        metadata: adminUser.user_metadata,
        created_at: adminUser.created_at,
        last_sign_in_at: adminUser.last_sign_in_at,
      },
      hasCorrectRole,
      needsFix: !hasCorrectRole,
      message: hasCorrectRole 
        ? 'Admin metadata is correct' 
        : 'Admin metadata needs to be fixed - please call POST /admin/fix-metadata'
    });
  } catch (error: any) {
    console.error('❌ Error checking metadata:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ✅ TEMP FIX: Update admin user metadata
app.post('/make-server-adb995ba/admin/fix-metadata', async (c) => {
  try {
    console.log('🔧 Fixing admin user metadata...');
    const supabase = getSupabase();
    
    // Get admin user
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const adminUser = usersData.users.find(u => u.email === 'utskelompok03@gmail.com');
    
    if (!adminUser) {
      console.error('❌ Admin user not found');
      return c.json({ success: false, error: 'Admin user not found' }, 404);
    }
    
    console.log('👤 Found admin user:', adminUser.email);
    console.log('📝 Current metadata:', adminUser.user_metadata);
    
    // ✅ ENHANCED: Preserve existing metadata and only update necessary fields
    const currentMetadata = adminUser.user_metadata || {};
    const updatedMetadata = {
      ...currentMetadata, // Preserve existing fields like addresses
      name: 'Admin', // ✅ FORCE: Always set to 'Admin'
      role: 'admin', // ✅ CRITICAL: Ensure role is admin
      status: 'active', // ✅ CRITICAL: Ensure status is active
      display_name: 'Admin', // ✅ FORCE: Always set to 'Admin'
    };
    
    // Update metadata
    const { data, error } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      {
        user_metadata: updatedMetadata
      }
    );
    
    if (error) {
      console.error('❌ Failed to update metadata:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log('✅ Admin metadata updated successfully!');
    console.log('📝 New metadata:', data.user.user_metadata);
    
    return c.json({ 
      success: true, 
      user: data.user,
      message: 'Admin metadata updated. Please login again to see changes.' 
    });
  } catch (error: any) {
    console.error('❌ Error fixing metadata:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get current user
app.get('/make-server-adb995ba/auth/me', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({
        success: false,
        error: 'Unauthorized'
      }, 401);
    }

    return c.json({
      success: true,
      user: user
    });

  } catch (error: any) {
    console.error('❌ Get user error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan'
    }, 500);
  }
});

// ✅ NEW: Check user status (for real-time ban/delete detection)
app.get('/make-server-adb995ba/auth/check-status', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({
        success: false,
        error: 'Unauthorized'
      }, 401);
    }

    console.log('🔍 Checking status for user:', user.email);

    // Check if user was deleted
    const deletedUser = await deletedUserStore.getDeletedUserByEmail(user.email);
    if (deletedUser) {
      console.log('🗑️ User was deleted:', deletedUser);
      return c.json({
        success: false,
        deleted: true,
        deletedData: deletedUser,
        error: 'User account deleted'
      }, 403);
    }

    // Check if user is banned/suspended
    const { banned, data: banData } = await banStore.isUserBanned(user.id);
    if (banned && banData) {
      console.log('🚫 User is banned/suspended:', banData);
      return c.json({
        success: false,
        banned: true,
        banData,
        error: 'User account banned or suspended'
      }, 403);
    }

    // Check user status from metadata
    if (user.status !== 'active') {
      console.log('⚠️ User status is not active:', user.status);
      return c.json({
        success: false,
        status: user.status,
        error: 'User account inactive'
      }, 403);
    }

    console.log('✅ User status OK');
    return c.json({
      success: true,
      status: 'active',
      user: user
    });

  } catch (error: any) {
    console.error('❌ Check status error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat memeriksa status'
    }, 500);
  }
});

// Forgot Password - Request Reset Code
app.post('/make-server-adb995ba/auth/forgot-password', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    console.log('📧 Password reset requested for:', email);

    // Validate input
    if (!email) {
      return c.json({
        success: false,
        error: 'Email harus diisi'
      }, 400);
    }

    // Find user by email in Supabase Auth
    const userResult = await userStore.getUserByEmail(email);

    if (!userResult.success || !userResult.user) {
      console.log('❌ User not found:', email);
      return c.json({
        success: false,
        error: 'Email tidak terdaftar',
        message: 'Email yang Anda masukkan tidak terdaftar dalam sistem. Silakan periksa kembali atau daftar akun baru.'
      }, 404);
    }
    
    const user = userResult.user;

    // Check if user account is deleted
    const deletedUser = await deletedUserStore.getDeletedUserByEmail(email);
    if (deletedUser) {
      console.log('❌ Cannot reset password for deleted account:', email);
      return c.json({
        success: false,
        error: 'Akun telah dihapus',
        message: 'Akun dengan email ini telah dihapus oleh administrator. Silakan hubungi admin untuk informasi lebih lanjut.'
      }, 403);
    }

    // Check if user is banned
    const { banned: isBannedUser, data: bannedUser } = await banStore.isUserBanned(user.id);
    if (isBannedUser && bannedUser) {
      console.log('❌ Cannot reset password for banned account:', email);
      return c.json({
        success: false,
        error: 'Akun diblokir',
        message: 'Akun Anda telah diblokir oleh administrator. Silakan hubungi admin untuk informasi lebih lanjut.'
      }, 403);
    }

    // Generate verification code using verification_store
    const resetCode = verificationStore.generateVerificationCode();
    
    // Store verification code (expires in 10 minutes)
    await verificationStore.storeVerificationCode(email, resetCode, 'forgot_password', 10);

    console.log('✅ Reset code generated for:', email);
    console.log('📧 Reset code ready to send:', resetCode);

    // Frontend will send email via EmailJS
    return c.json({
      success: true,
      message: 'Kode reset telah dikirim ke email Anda',
      email: email,
      name: user.name,
      verificationCode: resetCode, // Frontend akan kirim email
    });

  } catch (error: any) {
    console.error('❌ Forgot password error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat memproses permintaan'
    }, 500);
  }
});

// Reset Password - Verify Code and Change Password
app.post('/make-server-adb995ba/auth/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const { email, code, newPassword } = body;

    console.log('🔐 Password reset attempt for:', email);

    // Validate input
    if (!email || !code || !newPassword) {
      return c.json({
        success: false,
        error: 'Semua field harus diisi'
      }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({
        success: false,
        error: 'Password minimal 6 karakter'
      }, 400);
    }

    // Find user by email
    const userResult = await userStore.getUserByEmail(email);

    if (!userResult.success || !userResult.user) {
      console.log('❌ User not found:', email);
      return c.json({
        success: false,
        error: 'Kode reset salah atau sudah kadaluarsa'
      }, 400);
    }
    
    const user = userResult.user;

    // Verify code using verification_store
    const verification = await verificationStore.verifyCode(email, code, 'forgot_password');
    
    if (!verification.success) {
      console.log('❌ Invalid reset code for:', email);
      return c.json({
        success: false,
        error: verification.error
      }, 400);
    }

    // Update password in Supabase Auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword
    });
    
    if (updateError) {
      console.error('❌ Failed to update password:', updateError.message);
      return c.json({
        success: false,
        error: 'Gagal mengubah password'
      }, 500);
    }

    // Cleanup verification code
    await verificationStore.deleteVerificationCode(email, 'forgot_password');

    console.log('✅ Password reset successful for:', email);

    return c.json({
      success: true,
      message: 'Password berhasil diubah. Silakan login dengan password baru Anda.'
    });

  } catch (error: any) {
    console.error('❌ Reset password error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat mengubah password'
    }, 500);
  }
});

// Logout (invalidate token)
app.post('/make-server-adb995ba/auth/logout', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (user) {
      console.log('✅ Logout successful');
      // Note: Supabase Auth sessions are managed client-side
      // Token will be invalid after expiration
    }

    return c.json({
      success: true,
      message: 'Logout berhasil'
    });

  } catch (error: any) {
    console.error('❌ Logout error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan'
    }, 500);
  }
});

// ==================== PRODUCT IMAGE UPLOAD ====================

// Upload product image (Admin only)
app.post('/make-server-adb995ba/admin/products/upload-image', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user || user.role !== 'admin') {
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    // Parse multipart form data
    const formData = await c.req.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return c.json({
        success: false,
        error: 'No image file provided'
      }, 400);
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return c.json({
        success: false,
        error: 'File must be an image'
      }, 400);
    }

    // Validate file size (max 10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      return c.json({
        success: false,
        error: 'File size must be less than 10MB'
      }, 400);
    }

    // Generate unique filename
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${generateUUID()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    console.log('📤 Uploading product image:', filePath);

    // ✅ FIXED: Use safe base64 conversion (no spread operator for large arrays)
    console.log('💾 Using base64 storage method (guaranteed to work)');
    
    // Convert File to base64 safely (no stack overflow)
    const arrayBuffer = await imageFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // ✅ CRITICAL FIX: Use loop instead of spread to avoid stack overflow
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binaryString);
    const imageUrl = `data:${imageFile.type};base64,${base64}`;
    
    console.log('✅ Image converted to base64 data URL');

    return c.json({
      success: true,
      data: {
        imageUrl,
        fileName,
        filePath,
      }
    });

  } catch (error: any) {
    console.error('❌ Upload image error:', error);
    return c.json({
      success: false,
      error: `Failed to upload image: ${error.message}`
    }, 500);
  }
});

// ==================== PRODUCTS ROUTES ====================

// Get all products
app.get('/make-server-adb995ba/products', async (c) => {
  try {
    const products = await kv.getByPrefix('product:');
    
    // Filter only active products for regular users
    const activeProducts = products.filter(p => p.isActive !== false);
    
    // Sort by created date (newest first)
    activeProducts.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    console.log(`📦 Returning ${activeProducts.length} products`);

    return c.json({
      success: true,
      products: activeProducts
    });

  } catch (error: any) {
    console.error('❌ Get products error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat mengambil produk',
      products: []
    }, 500);
  }
});

// Get single product
app.get('/make-server-adb995ba/products/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    const product = await kv.get(`product:${productId}`);

    if (!product) {
      return c.json({
        success: false,
        error: 'Produk tidak ditemukan'
      }, 404);
    }

    return c.json({
      success: true,
      product: product
    });

  } catch (error: any) {
    console.error('❌ Get product error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan'
    }, 500);
  }
});

// Create product (Admin only)
app.post('/make-server-adb995ba/products', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    console.log('📦 Create product request received');
    console.log('📦 Token:', token ? 'Present' : 'Missing');
    console.log('📦 User:', user ? `${user.email} (${user.role})` : 'Not found');

    if (!user || user.role !== 'admin') {
      console.error('❌ Unauthorized: User is not admin');
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    const body = await c.req.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));
    
    const productId = body.id || generateUUID();
    console.log('📦 Product ID to use:', productId);
    console.log('📦 ID source:', body.id ? 'From frontend' : 'Generated by backend');

    const newProduct = {
      ...body,
      id: productId,
      // ✅ FIX: Produk baru default TIDAK masuk Flash Sale
      isFlashSale: body.isFlashSale || false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('📦 Saving product to KV store:', productId);
    console.log('📦 Product data:', JSON.stringify(newProduct, null, 2));
    
    await kv.set(`product:${productId}`, newProduct);

    console.log('✅ Product created and saved successfully:', productId);
    
    // Verify the save
    const verifyProduct = await kv.get(`product:${productId}`);
    console.log('✅ Verification - Product retrieved from KV:', verifyProduct ? 'SUCCESS' : 'FAILED');
    
    if (verifyProduct) {
      console.log('✅ Verified product ID:', verifyProduct.id);
      console.log('✅ Verified product name:', verifyProduct.name);
      console.log('✅ Verified product images count:', verifyProduct.images?.length || 0);
    }

    return c.json({
      success: true,
      product: newProduct
    });

  } catch (error: any) {
    console.error('❌ Create product error:', error);
    console.error('❌ Error stack:', error.stack);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat membuat produk'
    }, 500);
  }
});

// Update product (Admin only)
app.put('/make-server-adb995ba/products/:id', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user || user.role !== 'admin') {
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    const productId = c.req.param('id');
    const existingProduct = await kv.get(`product:${productId}`);

    if (!existingProduct) {
      return c.json({
        success: false,
        error: 'Produk tidak ditemukan'
      }, 404);
    }

    const body = await c.req.json();
    
    // Handle Flash Sale logic
    let updatedProduct = {
      ...existingProduct,
      ...body,
      id: productId,
      updatedAt: new Date().toISOString()
    };

    // If adding to flash sale
    if (body.isFlashSale === true && existingProduct.isFlashSale !== true) {
      console.log('📦 Adding product to flash sale');
      console.log('📦 Existing product:', JSON.stringify(existingProduct, null, 2));
      console.log('📦 Request body:', JSON.stringify(body, null, 2));
      
      // Save original price if not already saved
      if (!existingProduct.originalPrice) {
        updatedProduct.originalPrice = existingProduct.price;
        console.log('💾 Saved originalPrice:', existingProduct.price);
      } else {
        console.log('💾 Original price already exists:', existingProduct.originalPrice);
      }
      
      // Calculate discounted price
      if (body.discount && body.discount > 0) {
        const originalPrice = updatedProduct.originalPrice || existingProduct.price;
        const discountedPrice = Math.round(originalPrice * (1 - body.discount / 100));
        updatedProduct.price = discountedPrice;
        console.log(`💰 Calculated new price: ${originalPrice} - ${body.discount}% = ${discountedPrice}`);
      }
      
      console.log('📦 Updated product after flash sale logic:', JSON.stringify(updatedProduct, null, 2));
    }
    
    // If removing from flash sale
    if (body.isFlashSale === false && existingProduct.isFlashSale === true) {
      console.log('🔄 Removing product from flash sale');
      
      // Restore original price
      if (existingProduct.originalPrice) {
        updatedProduct.price = existingProduct.originalPrice;
        console.log('💰 Restored originalPrice:', existingProduct.originalPrice);
      }
      
      // Clear flash sale data
      updatedProduct.originalPrice = null;
      updatedProduct.discount = null;
      updatedProduct.flashSaleEndTime = null;
    }

    await kv.set(`product:${productId}`, updatedProduct);

    console.log('✅ Product updated:', productId);
    console.log('✅ Final isFlashSale value:', updatedProduct.isFlashSale);
    console.log('✅ Final product data:', JSON.stringify(updatedProduct, null, 2));
    
    // Verify save by reading back
    const verifyProduct = await kv.get(`product:${productId}`);
    console.log('🔍 Verification - Product read from KV:', verifyProduct ? 'SUCCESS' : 'FAILED');
    if (verifyProduct) {
      console.log('🔍 Verified isFlashSale:', verifyProduct.isFlashSale);
    }

    return c.json({
      success: true,
      product: updatedProduct
    });

  } catch (error: any) {
    console.error('❌ Update product error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat mengupdate produk'
    }, 500);
  }
});

// Delete product (Admin only)
app.delete('/make-server-adb995ba/products/:id', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user || user.role !== 'admin') {
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    const productId = c.req.param('id');
    const existingProduct = await kv.get(`product:${productId}`);

    if (!existingProduct) {
      return c.json({
        success: false,
        error: 'Produk tidak ditemukan'
      }, 404);
    }

    // Hard delete - completely remove from database
    await kv.del(`product:${productId}`);

    console.log('✅ Product deleted (hard delete) from KV store:', productId);
    
    // TODO: If product has images in Supabase Storage, delete them here
    // Example:
    // if (existingProduct.imageUrl && existingProduct.imageUrl.includes('supabase')) {
    //   const supabase = getSupabase();
    //   await supabase.storage.from('products').remove([productId]);
    // }

    return c.json({
      success: true,
      message: 'Produk berhasil dihapus'
    });

  } catch (error: any) {
    console.error('❌ Delete product error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat menghapus produk'
    }, 500);
  }
});

// ==================== CHECKOUT ROUTES ====================

// Checkout and voucher routes are integrated directly into index.tsx
// No separate route files needed

// ==================== ORDER ROUTES ====================

// Get all orders
app.get('/make-server-adb995ba/orders', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const authHeader = c.req.header('Authorization');
    
    // ✅ ENHANCED DEBUG: Log all auth-related headers
    console.log(`🔍 [GET /orders] Auth Headers:`);
    console.log(`   - X-Session-Token: ${token ? `✓ (${token.length} chars, preview: ${token.substring(0, 30)}...)` : '✗ MISSING'}`);
    console.log(`   - Authorization: ${authHeader ? `✓ (${authHeader.length} chars)` : '✗ MISSING'}`);
    
    // ✅ ENHANCED: Early return if no token provided
    if (!token) {
      console.error('❌ [GET /orders] No X-Session-Token header found in request');
      return c.json({
        success: false,
        error: 'Unauthorized - No session token provided'
      }, 401);
    }
    
    console.log(`🔐 [GET /orders] Calling getUserFromToken with token...`);
    
    const user = await getUserFromToken(token);

    if (!user) {
      console.error('❌ [GET /orders] No user found from token');
      console.error('   Token was provided but validation failed');
      console.error('   This could mean:');
      console.error('   1. Token is expired');
      console.error('   2. Token is invalid/malformed');
      console.error('   3. User was deleted from Supabase Auth');
      console.error('   4. Token JWT signature verification failed');
      return c.json({
        success: false,
        error: 'Unauthorized'
      }, 401);
    }
    
    console.log(`✅ [GET /orders] Authenticated user: ${user.email} (${user.role})`);

    const allOrders = await kv.getByPrefix('order:');

    // Filter orders based on user role
    let orders;
    if (user.role === 'admin') {
      // Admin can see all orders
      orders = allOrders;
      console.log(`📦 [GET /orders] Admin access - returning ALL ${allOrders.length} orders`);
    } else {
      // Regular users can only see their own orders
      orders = allOrders.filter(o => o.userId === user.id);
      console.log(`📦 [GET /orders] User access - returning ${orders.length} of ${allOrders.length} orders`);
    }

    // Sort by created date (newest first)
    orders.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    console.log(`✅ [GET /orders] Success - Returning ${orders.length} orders for user ${user.id} (${user.role})`);

    return c.json({
      success: true,
      orders: orders
    });

  } catch (error: any) {
    console.error('❌ [GET /orders] Exception caught:', error.message);
    console.error('   Error stack:', error.stack);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat mengambil pesanan',
      orders: []
    }, 500);
  }
});

// Get single order by ID
app.get('/make-server-adb995ba/orders/:id', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({
        success: false,
        error: 'Unauthorized'
      }, 401);
    }

    const orderId = c.req.param('id');
    const order = await kv.get(`order:${orderId}`);

    if (!order) {
      return c.json({
        success: false,
        error: 'Pesanan tidak ditemukan'
      }, 404);
    }

    // Check if user has permission to view this order
    if (user.role !== 'admin' && order.userId !== user.id) {
      return c.json({
        success: false,
        error: 'Unauthorized - Cannot view other user\'s orders'
      }, 403);
    }

    return c.json({
      success: true,
      order: order
    });

  } catch (error: any) {
    console.error('❌ Get order error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan'
    }, 500);
  }
});

// Create order
app.post('/make-server-adb995ba/orders', async (c) => {
  try {
    // ✅ CRITICAL: Check maintenance mode FIRST before any transaction
    const maintenance = await kv.get('system:maintenance');
    if (maintenance && maintenance.enabled) {
      // Check if scheduled maintenance is active
      const now = new Date();
      const isScheduled = maintenance.startTime && maintenance.endTime;
      
      if (isScheduled) {
        const start = new Date(maintenance.startTime);
        const end = new Date(maintenance.endTime);
        
        if (now >= start && now <= end) {
          console.log('🔧 [Create Order] BLOCKED - Scheduled maintenance is active');
          return c.json({
            success: false,
            error: 'Sistem sedang dalam pemeliharaan. Transaksi tidak dapat dilakukan saat ini.',
            maintenance: true
          }, 503);
        }
      } else {
        // Immediate maintenance
        console.log('🔧 [Create Order] BLOCKED - Immediate maintenance is active');
        return c.json({
          success: false,
          error: 'Sistem sedang dalam pemeliharaan. Transaksi tidak dapat dilakukan saat ini.',
          maintenance: true
        }, 503);
      }
    }
    
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({
        success: false,
        error: 'Unauthorized'
      }, 401);
    }

    const body = await c.req.json();
    const orderId = generateUUID();

    console.log('📦 Creating order for user:', user.email);
    console.log('📦 Order items:', JSON.stringify(body.items, null, 2));

    // 🔍 DEBUG: List all products in database
    const allProducts = await kv.getByPrefix('product:');
    console.log('🔍 DEBUG: Total products in database:', allProducts.length);
    console.log('🔍 DEBUG: Product IDs in database:', allProducts.map(p => p.id));

    // Enrich order items with full product data
    const enrichedItems = await Promise.all(
      body.items.map(async (item: any) => {
        console.log(`🔍 Looking up product: ${item.productId}`);
        const product = await kv.get(`product:${item.productId}`);
        
        if (!product) {
          console.warn(`⚠️ Product not found in database: ${item.productId} - Using fallback data`);
          console.log('🔍 Available products:', allProducts.map(p => ({ id: p.id, name: p.name })));
        } else {
          console.log(`✅ Product FOUND: ${product.name}, images:`, product.images);
          // ✅ Ensure 'image' field exists for backward compatibility
          if (!product.image && product.images && product.images.length > 0) {
            product.image = product.images[0];
          }
        }

        return {
          productId: item.productId,
          product: product || {
            id: item.productId,
            name: 'Product Not Found',
            price: item.price || 0,
            images: [],
            image: '', // Add fallback image field
          },
          quantity: item.quantity || 1,
          price: item.price || product?.price || 0,
        };
      })
    );

    console.log('✅ Enriched items:', JSON.stringify(enrichedItems, null, 2));

    // 🎫 Handle voucher if provided
    let voucherData = null;
    let voucherDiscount = 0;
    
    if (body.voucherCode) {
      console.log('🎫 Processing voucher:', body.voucherCode);
      
      // Validate voucher one more time with total amount
      const subtotal = body.subtotal || body.totalAmount || 0;
      const validation = await voucherStore.validateVoucher(body.voucherCode, user.id, subtotal);
      
      if (validation.valid && validation.voucher) {
        voucherData = validation.voucher;
        
        // ✅ FIXED: Calculate discount based on type (percentage or fixed)
        if (voucherData.discountType === 'percentage') {
          voucherDiscount = Math.round(subtotal * (voucherData.discountValue / 100));
          // Apply max discount limit if set
          if (voucherData.maxDiscount && voucherDiscount > voucherData.maxDiscount) {
            voucherDiscount = voucherData.maxDiscount;
          }
        } else if (voucherData.discountType === 'fixed') {
          voucherDiscount = voucherData.discountValue;
        }
        
        console.log('✅ Voucher applied:', {
          code: voucherData.code,
          type: voucherData.discountType,
          value: voucherData.discountValue,
          subtotal,
          discountAmount: voucherDiscount
        });
      } else {
        console.warn('⚠️  Voucher validation failed during order creation:', validation.message);
      }
    }

    // ✅ COD FIX: Set order status based on payment method (case-insensitive)
    const isCOD = body.paymentMethod?.toLowerCase() === 'cod';
    const orderStatus = isCOD ? 'processing' : 'waiting_payment';
    const paymentStatus = isCOD ? 'cod_pending' : 'waiting_payment'; // ✅ NEW: COD has special status
    const statusNote = isCOD ? 'Pesanan berhasil dibuat - Bayar saat barang tiba (COD)' : 'Menunggu pembayaran';

    console.log(`💳 Payment method: ${body.paymentMethod}, isCOD: ${isCOD}, status: ${orderStatus}, paymentStatus: ${paymentStatus}`);

    const newOrder = {
      id: orderId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      items: enrichedItems,
      totalAmount: body.totalAmount || 0,
      subtotal: body.subtotal || body.totalAmount || 0,
      shippingCost: body.shippingCost || 0,
      shippingAddress: body.shippingAddress,
      shippingMethod: body.shippingMethod || 'jne-reg',
      paymentMethod: body.paymentMethod,
      voucherCode: voucherData?.code || null,
      voucherDiscount: voucherDiscount,
      voucherId: voucherData?.id || null,
      status: orderStatus, // ✅ COD = 'processing', Others = 'waiting_payment'
      paymentStatus: paymentStatus, // ✅ COD = 'paid', Others = 'unpaid'
      trackingNumber: `TRK${Date.now()}`,
      statusHistory: [
        {
          status: orderStatus,
          timestamp: new Date().toISOString(),
          note: statusNote
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await kv.set(`order:${orderId}`, newOrder);

    // 🎫 Mark voucher as used for COD (already paid) or will be done in payment status update endpoint
    if (isCOD && voucherData) {
      console.log('🎫 COD order - Marking voucher as used:', voucherData.code);
      // ✅ FIX: Use markVoucherAsUsed instead of useVoucher (which doesn't exist)
      await voucherStore.markVoucherAsUsed(voucherData.id, orderId, user.id);
    }

    console.log('✅ Order created:', orderId);

    return c.json({
      success: true,
      order: newOrder
    });

  } catch (error: any) {
    console.error('❌ Create order error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat membuat pesanan'
    }, 500);
  }
});

// Update order status (Admin only)
app.put('/make-server-adb995ba/orders/:id/status', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user || user.role !== 'admin') {
      console.error('❌ Unauthorized: User is not admin', { user });
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    const orderId = c.req.param('id');
    console.log('📦 Updating order status:', orderId);
    
    const order = await kv.get(`order:${orderId}`);

    if (!order) {
      console.error('❌ Order not found:', orderId);
      return c.json({
        success: false,
        error: 'Pesanan tidak ditemukan'
      }, 404);
    }

    const { status, note } = await c.req.json();
    console.log('📝 Request data:', { status, note, currentStatus: order.status });

    // ✅ NEW: Check if current status is final (delivered or cancelled)
    if (order.status === 'delivered' || order.status === 'cancelled') {
      console.error('❌ Cannot update final status:', {
        currentStatus: order.status,
        requestedStatus: status
      });
      return c.json({
        success: false,
        error: order.status === 'delivered' 
          ? 'Pesanan sudah diterima customer dan tidak dapat diubah lagi.'
          : 'Pesanan sudah dibatalkan dan tidak dapat diubah lagi.'
      }, 400);
    }

    // Validate status flow
    const validStatusFlow: Record<string, string[]> = {
      waiting_payment: ['cancelled'],
      processing: ['packed', 'cancelled'],
      packed: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: [],
    };

    // ✅ FIX: Allow admin to process paid orders
    // Check if payment is paid OR it's COD
    const isPaid = order.paymentStatus === 'paid';
    const isCOD = order.paymentMethod === 'cod' || order.paymentMethod === 'COD';
    
    if ((isPaid || isCOD) && order.status === 'waiting_payment') {
      validStatusFlow.waiting_payment = ['processing', 'cancelled'];
      console.log('✅ Order can be processed - Payment paid or COD:', { isPaid, isCOD, paymentStatus: order.paymentStatus, paymentMethod: order.paymentMethod });
    }

    const allowedStatuses = validStatusFlow[order.status] || [];
    console.log('✅ Allowed statuses:', allowedStatuses);
    
    if (!allowedStatuses.includes(status)) {
      console.error('❌ Invalid status transition:', {
        currentStatus: order.status,
        requestedStatus: status,
        allowedStatuses
      });
      return c.json({
        success: false,
        error: allowedStatuses.length > 0
          ? `Status tidak valid. Dari "${order.status}" hanya dapat diubah ke: ${allowedStatuses.join(', ')}`
          : `Pesanan dengan status "${order.status}" tidak dapat diubah lagi.`
      }, 400);
    }

    // Prevent duplicate status (check if last status is the same)
    const lastStatus = order.statusHistory?.[order.statusHistory.length - 1]?.status;
    if (lastStatus === status) {
      console.error('❌ Duplicate status:', { lastStatus, requestedStatus: status });
      return c.json({
        success: false,
        error: `Status "${status}" sudah tercatat sebelumnya. Tidak perlu update duplikat.`
      }, 400);
    }

    // Update order
    const updatedOrder = {
      ...order,
      status: status,
      statusHistory: [
        ...order.statusHistory,
        {
          status: status,
          timestamp: new Date().toISOString(),
          note: note || `Status diubah menjadi ${status}`
        }
      ],
      updatedAt: new Date().toISOString()
    };

    // ✅ FIX: For COD orders, mark payment as 'paid' when delivered
    if (isCOD && status === 'delivered' && order.paymentStatus !== 'paid') {
      updatedOrder.paymentStatus = 'paid';
      updatedOrder.paidAt = new Date().toISOString();
      console.log('✅ COD order delivered - marking payment as paid');
    }

    await kv.set(`order:${orderId}`, updatedOrder);

    console.log('✅ Order status updated successfully:', {
      orderId,
      oldStatus: order.status,
      newStatus: status,
      timestamp: new Date().toISOString()
    });
    
    // ✅ NEW: Auto-refund when admin cancels order (except COD)
    if (status === 'cancelled' && order.paymentMethod !== 'COD' && order.paymentStatus === 'paid') {
      console.log('💰 Processing auto-refund for cancelled order:', orderId);
      
      try {
        // Check if refund already exists
        const existingRefund = await refundStore.getRefundByOrderId(orderId);
        
        if (!existingRefund) {
          // Create auto-refund
          const refundResult = await refundStore.createRefund({
            orderId: orderId,
            userId: order.userId,
            userName: order.userName,
            userEmail: order.userEmail,
            type: 'admin_cancel',
            reason: 'Pesanan dibatalkan oleh admin',
            description: note || 'Pesanan dibatalkan oleh admin. Dana akan dikembalikan sesuai metode pembayaran.',
            amount: order.totalAmount,
          });
          
          if (refundResult.success && refundResult.refund) {
            // Auto-approve the refund since it's admin-initiated
            await refundStore.updateRefundStatus(
              refundResult.refund.id,
              'approved',
              'Auto-approved: Refund otomatis karena pembatalan admin',
              user.id,
              user.name
            );
            
            console.log('✅ Auto-refund created and approved:', refundResult.refund.id);
            
            // Update order payment status to refunded
            const refundedOrder = {
              ...updatedOrder,
              paymentStatus: 'refunded',
              refundedAt: new Date().toISOString(),
            };
            await kv.set(`order:${orderId}`, refundedOrder);
          } else {
            console.error('⚠️ Failed to create auto-refund:', refundResult.error);
          }
        } else {
          console.log('ℹ️ Refund already exists for this order:', existingRefund.id);
        }
      } catch (refundError: any) {
        console.error('⚠️ Auto-refund error (non-critical):', refundError);
        // Don't fail the order cancellation if refund creation fails
      }
    }
    
    // 🎫 Revert voucher if order is cancelled
    if (status === 'cancelled' && order.voucherId) {
      try {
        await voucherStore.revertVoucherUsage(order.voucherId, order.userId);
        console.log('🔄 Voucher usage reverted for cancelled order:', order.voucherCode);
      } catch (voucherError) {
        console.error('⚠️  Warning: Failed to revert voucher:', voucherError);
      }
    }
    
    // ✅ Verify the save by reading it back (get latest version with refund status)
    const verifyOrder = await kv.get(`order:${orderId}`);
    console.log('✅ Verification - Status after save:', verifyOrder?.status, '| Payment:', verifyOrder?.paymentStatus);

    return c.json({
      success: true,
      order: verifyOrder || updatedOrder // Return latest version if available
    });

  } catch (error: any) {
    console.error('❌ Update order status error:', error);
    return c.json({
      success: false,
      error: error.message || 'Terjadi kesalahan'
    }, 500);
  }
});

// Update order payment status (User & Admin) - ✅ NEW ENDPOINT
app.put('/make-server-adb995ba/orders/:id/payment-status', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({
        success: false,
        error: 'Unauthorized'
      }, 401);
    }

    const orderId = c.req.param('id');
    const order = await kv.get(`order:${orderId}`);

    if (!order) {
      return c.json({
        success: false,
        error: 'Pesanan tidak ditemukan'
      }, 404);
    }

    // Check if user has permission (owner or admin)
    if (user.role !== 'admin' && order.userId !== user.id) {
      return c.json({
        success: false,
        error: 'Unauthorized - Cannot update other user\'s orders'
      }, 403);
    }

    const { paymentStatus, status, statusNote, paidAt } = await c.req.json();

    console.log('💰 Updating payment status for order:', orderId);
    console.log('💰 New payment status:', paymentStatus);
    console.log('💰 New order status:', status);
    console.log('💰 Status note:', statusNote);

    // 🎫 Mark voucher as used if payment is successful
    if (paymentStatus === 'paid' && order.voucherId) {
      try {
        await voucherStore.markVoucherAsUsed(order.voucherId, orderId, order.userId); // ✅ Pass userId for public voucher tracking
        console.log('✅ Voucher marked as used:', order.voucherCode);
      } catch (voucherError) {
        console.error('⚠️  Warning: Failed to mark voucher as used:', voucherError);
        // Don't fail the payment update if voucher update fails
      }
    }
    
    // 🎫 Revert voucher if payment is cancelled
    if ((paymentStatus === 'cancelled' || paymentStatus === 'failed') && order.voucherId) {
      try {
        await voucherStore.revertVoucherUsage(order.voucherId, order.userId); // ✅ Pass userId for public voucher tracking
        console.log('🔄 Voucher usage reverted:', order.voucherCode);
      } catch (voucherError) {
        console.error('⚠️  Warning: Failed to revert voucher:', voucherError);
      }
    }

    // Update order with payment status
    const updatedOrder = {
      ...order,
      paymentStatus: paymentStatus,
      status: status || order.status, // Update order status if provided
      paidAt: paidAt || order.paidAt,
      statusHistory: [
        ...(order.statusHistory || []),
        {
          status: status || order.status,
          timestamp: new Date().toISOString(),
          note: statusNote || (paymentStatus === 'paid' 
            ? 'Pembayaran berhasil - Menunggu diproses admin' 
            : `Status pembayaran: ${paymentStatus}`)
        }
      ],
      updatedAt: new Date().toISOString()
    };

    await kv.set(`order:${orderId}`, updatedOrder);

    console.log('✅ Order payment status updated:', orderId, '→', paymentStatus, '| Order status:', status);

    return c.json({
      success: true,
      order: updatedOrder
    });

  } catch (error: any) {
    console.error('❌ Update payment status error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan'
    }, 500);
  }
});

// Cancel order (User can cancel if waiting_payment, Admin can cancel anytime)
app.post('/make-server-adb995ba/orders/:id/cancel', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({
        success: false,
        error: 'Unauthorized'
      }, 401);
    }

    const orderId = c.req.param('id');
    const order = await kv.get(`order:${orderId}`);

    if (!order) {
      return c.json({
        success: false,
        error: 'Pesanan tidak ditemukan'
      }, 404);
    }

    // Check ownership
    if (user.role !== 'admin' && order.userId !== user.id) {
      return c.json({
        success: false,
        error: 'Unauthorized - Cannot cancel other user\'s orders'
      }, 403);
    }

    // ✅ Validation: User can only cancel if waiting_payment or pending
    // Admin can cancel anytime
    if (user.role !== 'admin') {
      if (order.status !== 'waiting_payment' && order.status !== 'pending') {
        return c.json({
          success: false,
          error: 'Pesanan tidak dapat dibatalkan. Silakan hubungi admin jika ada masalah.'
        }, 400);
      }
    }

    // Check if already cancelled or delivered
    if (order.status === 'cancelled' || order.status === 'delivered') {
      return c.json({
        success: false,
        error: `Pesanan sudah ${order.status === 'cancelled' ? 'dibatalkan' : 'terkirim'}`
      }, 400);
    }

    console.log('🚫 Cancelling order:', orderId, 'by user:', user.email);

    // Update order status to cancelled
    const updatedOrder = {
      ...order,
      status: 'cancelled',
      paymentStatus: 'cancelled', // Also cancel payment status
      statusHistory: [
        ...(order.statusHistory || []),
        {
          status: 'Dibatalkan',
          timestamp: new Date().toISOString(),
          note: user.role === 'admin' 
            ? 'Pesanan dibatalkan oleh admin' 
            : 'Pesanan dibatalkan oleh customer'
        }
      ],
      updatedAt: new Date().toISOString()
    };

    await kv.set(`order:${orderId}`, updatedOrder);

    console.log('✅ Order cancelled successfully:', orderId);
    
    // ✅ NEW: Auto-refund if order was already paid (except COD)
    if (order.paymentMethod !== 'COD' && order.paymentStatus === 'paid') {
      console.log('💰 Processing auto-refund for cancelled paid order:', orderId);
      
      try {
        // Check if refund already exists
        const existingRefund = await refundStore.getRefundByOrderId(orderId);
        
        if (!existingRefund) {
          // Create auto-refund
          const refundResult = await refundStore.createRefund({
            orderId: orderId,
            userId: order.userId,
            userName: order.userName,
            userEmail: order.userEmail,
            type: user.role === 'admin' ? 'admin_cancel' : 'user_request',
            reason: user.role === 'admin' 
              ? 'Pesanan dibatalkan oleh admin'
              : 'Pesanan dibatalkan oleh customer',
            description: user.role === 'admin'
              ? 'Pesanan dibatalkan oleh admin. Dana akan dikembalikan sesuai metode pembayaran.'
              : 'Pesanan dibatalkan. Dana akan dikembalikan sesuai metode pembayaran.',
            amount: order.totalAmount,
          });
          
          if (refundResult.success && refundResult.refund) {
            // Auto-approve refund if cancelled by admin
            if (user.role === 'admin') {
              await refundStore.updateRefundStatus(
                refundResult.refund.id,
                'approved',
                'Auto-approved: Refund otomatis karena pembatalan admin',
                user.id,
                user.name
              );
            }
            
            console.log('✅ Auto-refund created:', refundResult.refund.id);
            
            // Update order payment status to refunded (only if admin auto-approved)
            if (user.role === 'admin') {
              const refundedOrder = {
                ...updatedOrder,
                paymentStatus: 'refunded',
                refundedAt: new Date().toISOString(),
              };
              await kv.set(`order:${orderId}`, refundedOrder);
            }
          } else {
            console.error('⚠️ Failed to create auto-refund:', refundResult.error);
          }
        } else {
          console.log('ℹ️ Refund already exists for this order:', existingRefund.id);
        }
      } catch (refundError: any) {
        console.error('⚠️ Auto-refund error (non-critical):', refundError);
        // Don't fail the order cancellation if refund creation fails
      }
    }
    
    // 🎫 Revert voucher if order is cancelled
    if (order.voucherId) {
      try {
        await voucherStore.revertVoucherUsage(order.voucherId, order.userId);
        console.log('🔄 Voucher usage reverted for cancelled order:', order.voucherCode);
      } catch (voucherError) {
        console.error('⚠️  Warning: Failed to revert voucher:', voucherError);
      }
    }
    
    // ✅ Get latest order version (with refund status if auto-refunded)
    const finalOrder = await kv.get(`order:${orderId}`) || updatedOrder;

    return c.json({
      success: true,
      order: finalOrder,
      message: 'Pesanan berhasil dibatalkan'
    });

  } catch (error: any) {
    console.error('❌ Cancel order error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat membatalkan pesanan'
    }, 500);
  }
});

// Delete ALL orders (Admin only) - ✅ EMERGENCY CLEANUP ENDPOINT
app.delete('/make-server-adb995ba/orders/all', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user || user.role !== 'admin') {
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    console.log('🗑️ [EMERGENCY] Deleting ALL orders by admin:', user.email);

    // Get all orders
    const allOrders = await kv.getByPrefix('order:');
    console.log('🗑️ Found', allOrders.length, 'orders to delete');

    // Delete all orders
    const deletePromises = allOrders.map(order => kv.del(`order:${order.id}`));
    await Promise.all(deletePromises);

    console.log('✅ All orders deleted successfully:', allOrders.length);

    return c.json({
      success: true,
      deletedCount: allOrders.length,
      message: `${allOrders.length} pesanan berhasil dihapus`
    });

  } catch (error: any) {
    console.error('❌ Delete all orders error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat menghapus pesanan'
    }, 500);
  }
});

// ==================== USER MANAGEMENT (Admin) ====================

// Get all users (Admin only)
app.get('/make-server-adb995ba/users', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user || user.role !== 'admin') {
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    const users = await kv.getByPrefix('user:');
    
    // Remove passwords from response
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);

    return c.json({
      success: true,
      users: usersWithoutPasswords
    });

  } catch (error: any) {
    console.error('❌ Get users error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan',
      users: []
    }, 500);
  }
});

// Update user status (Admin only)
app.put('/make-server-adb995ba/users/:id/status', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const adminUser = await getUserFromToken(token);

    if (!adminUser || adminUser.role !== 'admin') {
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    const userId = c.req.param('id');
    const { status } = await c.req.json();

    // Update status in Supabase Auth
    const updateResult = await userStore.updateUserStatus(userId, status);

    if (!updateResult.success) {
      return c.json({
        success: false,
        error: updateResult.error || 'Gagal memperbarui status'
      }, 404);
    }

    console.log('✅ User status updated:', userId, '→', status);

    // Get updated user
    const userResult = await userStore.getUserById(userId);
    
    return c.json({
      success: true,
      user: userResult.user
    });

  } catch (error: any) {
    console.error('❌ Update user status error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan'
    }, 500);
  }
});

// Delete own profile (User endpoint)
app.delete('/make-server-adb995ba/profile', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const currentUser = await getUserFromToken(token);

    if (!currentUser) {
      return c.json({
        success: false,
        error: 'Unauthorized'
      }, 401);
    }

    const userId = currentUser.id;

    console.log('🗑️ User deleting own account:', userId);

    // 🔥 Delete user from Supabase Auth, Storage, and KV store
    const deleteResult = await userStore.deleteUserFromAuth(userId);
    
    if (!deleteResult.success) {
      console.error('❌ Failed to delete user:', deleteResult.error);
      return c.json({
        success: false,
        error: deleteResult.error || 'Terjadi kesalahan saat menghapus akun'
      }, 500);
    }

    console.log('✅ User account deleted successfully from all systems:', userId);

    return c.json({
      success: true,
      message: 'Akun berhasil dihapus dari sistem dan Supabase'
    });

  } catch (error: any) {
    console.error('❌ Delete profile error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat menghapus akun'
    }, 500);
  }
});

// Delete user account (User can delete own account, Admin can delete any account)
app.delete('/make-server-adb995ba/users/:id', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const currentUser = await getUserFromToken(token);

    if (!currentUser) {
      return c.json({
        success: false,
        error: 'Unauthorized'
      }, 401);
    }

    const userId = c.req.param('id');
    
    // Get target user from Supabase Auth
    const targetUserResult = await userStore.getUserById(userId);

    if (!targetUserResult.success || !targetUserResult.user) {
      return c.json({
        success: false,
        error: 'User tidak ditemukan'
      }, 404);
    }
    
    const targetUser = targetUserResult.user;

    // Check permission: user can delete own account, admin can delete any account
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      return c.json({
        success: false,
        error: 'Unauthorized - Anda hanya bisa menghapus akun sendiri'
      }, 403);
    }

    // Prevent admin from deleting their own account if they're the only admin
    if (currentUser.role === 'admin' && currentUser.id === userId) {
      const allUsersResult = await userStore.getAllUsersFromAuth();
      const adminCount = allUsersResult.users.filter(u => u.role === 'admin').length;
      
      if (adminCount <= 1) {
        return c.json({
          success: false,
          error: 'Tidak dapat menghapus akun admin terakhir'
        }, 400);
      }
    }

    console.log('🗑️ Deleting user account:', userId);
    console.log('🗑️ Deleted by:', currentUser.id, '(', currentUser.role, ')');

    // 🔥 Delete user from Supabase Auth, Storage, and KV store
    const deleteResult = await userStore.deleteUserFromAuth(userId);
    
    if (!deleteResult.success) {
      console.error('❌ Failed to delete user:', deleteResult.error);
      return c.json({
        success: false,
        error: deleteResult.error || 'Terjadi kesalahan saat menghapus akun'
      }, 500);
    }

    console.log('✅ User account deleted successfully from all systems:', userId);

    return c.json({
      success: true,
      message: 'Akun berhasil dihapus dari sistem dan Supabase'
    });

  } catch (error: any) {
    console.error('❌ Delete user error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat menghapus akun'
    }, 500);
  }
});

// ==================== ADMIN USER MANAGEMENT ROUTES ====================

// Get all users (Admin only) - Fetch from Supabase Auth
app.get('/make-server-adb995ba/admin/users', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    console.log('🔐 Admin users request - Token:', token ? `${token.substring(0, 20)}...` : 'Missing');
    
    const adminUser = await getUserFromToken(token);
    console.log('🔐 Admin user found:', adminUser ? `${adminUser.email} (${adminUser.role})` : 'Not found');

    if (!adminUser || adminUser.role !== 'admin') {
      console.error('❌ Unauthorized - User is not admin or not found');
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    console.log('👥 Admin requesting all users from Supabase Auth');

    // Fetch users from Supabase Auth
    const authResult = await userStore.getAllUsersFromAuth();
    
    if (!authResult.success) {
      console.warn('⚠️  Could not fetch from Supabase Auth, falling back to KV store');
      // Fallback to KV store if Supabase Auth fails
      const kvUsers = await kv.getByPrefix('user:');
      const usersWithoutPasswords = kvUsers.map(user => {
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      return c.json({
        success: true,
        users: usersWithoutPasswords,
        source: 'kv_store',
        count: usersWithoutPasswords.length
      });
    }

    // Merge with KV store data for additional info (addresses, etc)
    const kvUsers = await kv.getByPrefix('user:');
    const mergedUsers = authResult.users.map(authUser => {
      const kvUser = kvUsers.find(u => u.id === authUser.id || u.email === authUser.email);
      
      return {
        ...authUser,
        addresses: kvUser?.addresses || [],
        accessToken: kvUser?.accessToken,
      };
    });

    console.log(`✅ Returning ${mergedUsers.length} users from Supabase Auth`);

    return c.json({
      success: true,
      users: mergedUsers,
      source: 'supabase_auth',
      count: mergedUsers.length
    });

  } catch (error: any) {
    console.error('❌ Get users error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat mengambil data pengguna'
    }, 500);
  }
});

// Update user role (Admin only)
app.put('/make-server-adb995ba/admin/users/:id/role', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const adminUser = await getUserFromToken(token);

    if (!adminUser || adminUser.role !== 'admin') {
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    const userId = c.req.param('id');
    const { role } = await c.req.json();

    if (!role || (role !== 'user' && role !== 'admin')) {
      return c.json({
        success: false,
        error: 'Invalid role'
      }, 400);
    }

    console.log(`👤 Admin ${adminUser.id} updating role for user ${userId} to ${role}`);

    // Update role in Supabase Auth
    const updateResult = await userStore.updateUserRole(userId, role);

    if (!updateResult.success) {
      return c.json({
        success: false,
        error: updateResult.error || 'Gagal memperbarui role'
      }, 404);
    }

    console.log('✅ User role updated successfully');

    // Get updated user
    const userResult = await userStore.getUserById(userId);

    return c.json({
      success: true,
      message: 'Role berhasil diperbarui',
      user: userResult.user
    });

  } catch (error: any) {
    console.error('❌ Update role error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat memperbarui role'
    }, 500);
  }
});

// Update user status (Admin only)
app.put('/make-server-adb995ba/admin/users/:id/status', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const adminUser = await getUserFromToken(token);

    if (!adminUser || adminUser.role !== 'admin') {
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    const userId = c.req.param('id');
    const { status } = await c.req.json();

    if (!status || !['active', 'suspended', 'banned'].includes(status)) {
      return c.json({
        success: false,
        error: 'Invalid status'
      }, 400);
    }

    console.log(`👤 Admin ${adminUser.id} updating status for user ${userId} to ${status}`);

    // Update status in Supabase Auth
    const updateResult = await userStore.updateUserStatus(userId, status);

    if (!updateResult.success) {
      return c.json({
        success: false,
        error: updateResult.error || 'Gagal memperbarui status'
      }, 404);
    }

    console.log('✅ User status updated successfully');

    // Get updated user
    const userResult = await userStore.getUserById(userId);

    return c.json({
      success: true,
      message: 'Status berhasil diperbarui',
      user: userResult.user
    });

  } catch (error: any) {
    console.error('❌ Update status error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat memperbarui status'
    }, 500);
  }
});

// Delete user (Admin only) - Deletes from Supabase Auth, Storage, and KV
app.delete('/make-server-adb995ba/admin/users/:id', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const adminUser = await getUserFromToken(token);

    if (!adminUser || adminUser.role !== 'admin') {
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    const userId = c.req.param('id');

    console.log(`[Admin] Deleting user ${userId}`);

    // Prevent admin from deleting themselves
    if (adminUser.id === userId) {
      return c.json({
        success: false,
        error: 'Tidak dapat menghapus akun sendiri'
      }, 400);
    }

    // Get user info before deletion (to store in deleted_user_store)
    const userResult = await userStore.getUserById(userId);

    if (!userResult.success || !userResult.user) {
      return c.json({
        success: false,
        error: 'User tidak ditemukan'
      }, 404);
    }
    
    const userToDelete = userResult.user;

    // Store deleted user record for notification on next login attempt
    await deletedUserStore.storeDeletedUser({
      userId: userToDelete.id,
      email: userToDelete.email,
      name: userToDelete.name,
      deletedBy: adminUser.id,
      deletedByName: adminUser.name,
      deletedAt: new Date().toISOString(),
      reason: 'Dihapus oleh administrator'
    });

    // Delete user using userStore function (deletes from Auth, Storage, KV)
    const deleteResult = await userStore.deleteUserFromAuth(userId);

    if (!deleteResult.success) {
      return c.json({
        success: false,
        error: deleteResult.error || 'Gagal menghapus user'
      }, 500);
    }

    console.log('✅ User deleted successfully by admin');

    return c.json({
      success: true,
      message: 'User berhasil dihapus dari sistem dan Supabase'
    });

  } catch (error: any) {
    console.error('❌ Admin delete user error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat menghapus user'
    }, 500);
  }
});

// ==================== BAN/SUSPEND USER ROUTES ====================

// Ban/Suspend a user (Admin only)
app.post('/make-server-adb995ba/users/:id/ban', async (c) => {
  console.log('🚫 [POST /users/:id/ban] Request received');
  try {
    const token = c.req.header('X-Session-Token');
    const adminUser = await getUserFromToken(token);

    if (!adminUser || adminUser.role !== 'admin') {
      console.log('❌ [POST /users/:id/ban] Unauthorized - Admin only');
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    const userId = c.req.param('id');
    console.log('🔍 [POST /users/:id/ban] User ID from URL:', userId);
    
    const { type, reason, duration, unit } = await c.req.json();
    console.log('📋 [POST /users/:id/ban] Ban details:', { type, reason, duration, unit });

    // Validate input
    if (!type || !reason) {
      console.log('❌ [POST /users/:id/ban] Missing type or reason');
      return c.json({
        success: false,
        error: 'Type dan reason wajib diisi'
      }, 400);
    }

    // Get user from Supabase Auth
    console.log('🔍 [POST /users/:id/ban] Fetching user from Supabase Auth...');
    const userResult = await userStore.getUserById(userId);
    
    if (!userResult.success || !userResult.user) {
      console.error('❌ [POST /users/:id/ban] User not found:', userResult.error);
      return c.json({
        success: false,
        error: 'User tidak ditemukan di sistem'
      }, 404);
    }
    
    const user = userResult.user;
    console.log('👤 [POST /users/:id/ban] User found:', `${user.email} (${user.id})`);

    // Prevent admin from banning themselves
    if (adminUser.id === userId) {
      console.log('❌ [POST /users/:id/ban] Admin trying to ban themselves');
      return c.json({
        success: false,
        error: 'Tidak dapat mem-ban akun sendiri'
      }, 400);
    }

    // Calculate end date
    let endDate: string | 'permanent';
    if (unit === 'permanent') {
      endDate = 'permanent';
    } else {
      endDate = banStore.calculateEndDate(duration, unit);
    }

    // Create ban data
    const banData: banStore.UserBan = {
      userId,
      type,
      reason,
      startDate: new Date().toISOString(),
      endDate,
      bannedBy: adminUser.id,
      bannedByName: adminUser.name,
      bannedAt: new Date().toISOString(),
      isActive: true
    };

    // Save ban
    await banStore.banUser(banData);

    // Update user status in Supabase Auth
    const newStatus = type === 'ban' ? 'banned' : 'suspended';
    const updateResult = await userStore.updateUserStatus(userId, newStatus);
    
    if (!updateResult.success) {
      console.error('⚠️  Failed to update status in Supabase Auth, but ban record saved');
    }

    console.log(`✅ [POST /users/:id/ban] User ${userId} has been ${type}ed by ${adminUser.name}`);
    console.log(`✅ [POST /users/:id/ban] User status updated to: ${newStatus}`);

    return c.json({
      success: true,
      message: `User berhasil di-${type}`,
      banData
    });

  } catch (error: any) {
    console.error('❌ [POST /users/:id/ban] Error:', error);
    console.error('❌ [POST /users/:id/ban] Error stack:', error.stack);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat mem-ban user'
    }, 500);
  }
});

// Unban a user (Admin only)
app.post('/make-server-adb995ba/users/:id/unban', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const adminUser = await getUserFromToken(token);

    if (!adminUser || adminUser.role !== 'admin') {
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    const userId = c.req.param('id');

    // Get user from Supabase Auth
    const userResult = await userStore.getUserById(userId);
    if (!userResult.success || !userResult.user) {
      return c.json({
        success: false,
        error: 'User tidak ditemukan di sistem'
      }, 404);
    }

    // Unban user
    await banStore.unbanUser(userId);

    // Update user status back to active in Supabase Auth
    const updateResult = await userStore.updateUserStatus(userId, 'active');
    
    if (!updateResult.success) {
      console.error('⚠️  Failed to update status in Supabase Auth, but unban record saved');
    }

    console.log(`✅ User ${userId} has been unbanned by ${adminUser.name}`);
    console.log(`✅ User status updated to: active`);

    return c.json({
      success: true,
      message: 'User berhasil di-unban'
    });

  } catch (error: any) {
    console.error('❌ Unban user error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat meng-unban user'
    }, 500);
  }
});

// Auto-unsuspend when time expires (No auth required - self-service)
app.post('/make-server-adb995ba/users/:id/auto-unsuspend', async (c) => {
  console.log('⏰ [POST /users/:id/auto-unsuspend] Request received');
  try {
    const userId = c.req.param('id');
    console.log('🔍 [POST /users/:id/auto-unsuspend] User ID:', userId);

    // Get ban data
    const banData = await banStore.getUserBan(userId);
    
    if (!banData) {
      console.log('ℹ️  [POST /users/:id/auto-unsuspend] No ban record found');
      return c.json({
        success: false,
        error: 'Tidak ada data ban ditemukan'
      }, 404);
    }

    // Check if it's permanent ban (should not be auto-unsuspended)
    if (banData.endDate === 'permanent') {
      console.log('❌ [POST /users/:id/auto-unsuspend] Cannot auto-unsuspend permanent ban');
      return c.json({
        success: false,
        error: 'Ban permanen tidak bisa di-unsuspend otomatis'
      }, 400);
    }

    // Check if ban time has actually expired
    const now = new Date();
    const endDate = new Date(banData.endDate);
    
    if (now < endDate) {
      console.log('⏳ [POST /users/:id/auto-unsuspend] Ban time not expired yet');
      return c.json({
        success: false,
        error: 'Waktu ban belum berakhir',
        remainingMs: endDate.getTime() - now.getTime()
      }, 400);
    }

    // Unban user
    await banStore.unbanUser(userId);
    console.log('✅ [POST /users/:id/auto-unsuspend] User ban deactivated');

    // Update user status back to active in Supabase Auth
    const updateResult = await userStore.updateUserStatus(userId, 'active');
    
    if (!updateResult.success) {
      console.error('⚠️  [POST /users/:id/auto-unsuspend] Failed to update status in Supabase Auth');
    } else {
      console.log('✅ [POST /users/:id/auto-unsuspend] User status updated to: active');
    }

    console.log(`✅ [POST /users/:id/auto-unsuspend] User ${userId} has been auto-unsuspended`);

    return c.json({
      success: true,
      message: 'Masa suspend telah berakhir. Akun Anda aktif kembali.',
      wasType: banData.type
    });

  } catch (error: any) {
    console.error('❌ [POST /users/:id/auto-unsuspend] Error:', error);
    console.error('❌ [POST /users/:id/auto-unsuspend] Error stack:', error.stack);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat auto-unsuspend'
    }, 500);
  }
});

// Get ban status for a user
app.get('/make-server-adb995ba/users/:id/ban-status', async (c) => {
  try {
    const userId = c.req.param('id');
    
    const { banned, data } = await banStore.isUserBanned(userId);

    return c.json({
      success: true,
      banned,
      banData: data
    });

  } catch (error: any) {
    console.error('❌ Get ban status error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan',
      banned: false,
      banData: null
    }, 500);
  }
});

// Check ban status during login
app.post('/make-server-adb995ba/check-ban', async (c) => {
  try {
    const { userId } = await c.req.json();
    
    if (!userId) {
      return c.json({
        success: false,
        error: 'User ID wajib diisi'
      }, 400);
    }

    const { banned, data } = await banStore.isUserBanned(userId);

    return c.json({
      success: true,
      banned,
      banData: data
    });

  } catch (error: any) {
    console.error('❌ Check ban error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan',
      banned: false,
      banData: null
    }, 500);
  }
});

// ==================== SETTINGS ROUTES ====================

// Get site settings
app.get('/make-server-adb995ba/settings', async (c) => {
  try {
    const settings = await kv.get('settings:site');
    
    if (!settings) {
      // Return default settings
      const defaultSettings = {
        siteName: 'MarketHub',
        siteDescription: 'Marketplace terpercaya untuk semua kebutuhan Anda',
        siteEmail: 'support@markethub.com',
        sitePhone: '+62 812-3456-7890',
        minOrderAmount: 10000,
        maxOrderAmount: 10000000,
        shippingCostPerKm: 2000,
        freeShippingMin: 100000,
        refundPeriod: 7,
        termsAndConditions: 'Syarat dan ketentuan...',
        privacyPolicy: 'Kebijakan privasi...'
      };
      
      return c.json({
        success: true,
        settings: defaultSettings
      });
    }

    return c.json({
      success: true,
      settings: settings
    });

  } catch (error: any) {
    console.error('❌ Get settings error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan'
    }, 500);
  }
});

// Update site settings (Admin only)
app.put('/make-server-adb995ba/settings', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user || user.role !== 'admin') {
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    const body = await c.req.json();
    
    await kv.set('settings:site', body);

    console.log('✅ Settings updated');

    return c.json({
      success: true,
      settings: body
    });

  } catch (error: any) {
    console.error('❌ Update settings error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan'
    }, 500);
  }
});

// ==================== STATISTICS (Admin) ====================

// Get dashboard statistics (Admin only)
app.get('/make-server-adb995ba/stats', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user || user.role !== 'admin') {
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    const products = await kv.getByPrefix('product:');
    const orders = await kv.getByPrefix('order:');
    const users = await kv.getByPrefix('user:');

    const activeProducts = products.filter(p => p.isActive !== false);
    const totalRevenue = orders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const stats = {
      totalProducts: activeProducts.length,
      totalOrders: orders.length,
      totalUsers: users.filter(u => u.role === 'user').length,
      totalRevenue: totalRevenue,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      processingOrders: orders.filter(o => o.status === 'processing').length,
      shippedOrders: orders.filter(o => o.status === 'shipped').length,
      completedOrders: orders.filter(o => o.status === 'completed').length,
    };

    return c.json({
      success: true,
      stats: stats
    });

  } catch (error: any) {
    console.error('❌ Get stats error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan'
    }, 500);
  }
});

// ==================== PROFILE ROUTES ====================

// Mount profile routes
app.route('/make-server-adb995ba', profileRoutes);

// ✅ DEBUG ENDPOINT: Verify current user token using Supabase Auth
app.get('/make-server-adb995ba/debug/verify-token', async (c) => {
  console.log('🔍 DEBUG: Verify Token Endpoint Hit');
  
  try {
    const token = c.req.header('X-User-Token');
    console.log('Token received:', token ? token.substring(0, 30) + '...' : 'NONE');
    
    if (!token) {
      return c.json({ success: false, error: 'No token provided' }, 400);
    }
    
    // Use auth helper to verify token
    const { verifyUserToken } = await import('./auth_helper.tsx');
    const user = await verifyUserToken(token);
    
    if (!user) {
      console.log('❌ Token verification failed');
      return c.json({
        success: false,
        message: 'Invalid token - Supabase Auth verification failed',
        tokenSent: token.substring(0, 30) + '...'
      }, 401);
    }
    
    console.log('✅ User verified:', user.email);
    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hasAvatar: !!user.avatar
      },
      tokenMatch: true
    });
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ✅ DEBUG ENDPOINT: Check user avatar data from KV
app.get('/make-server-adb995ba/debug/check-avatar', async (c) => {
  console.log('��️  DEBUG: Check Avatar Endpoint Hit');
  
  try {
    const token = c.req.header('X-User-Token');
    if (!token) {
      return c.json({ success: false, error: 'No token provided' }, 400);
    }
    
    // Verify token and get user
    const { verifyUserToken } = await import('./auth_helper.tsx');
    const user = await verifyUserToken(token);
    
    if (!user) {
      return c.json({ success: false, error: 'Invalid token' }, 401);
    }
    
    // Get user data from KV
    const userData = await kv.get(`user:${user.id}`);
    
    const avatarInfo = {
      hasAvatar: !!userData?.avatar,
      avatarLength: userData?.avatar?.length || 0,
      avatarPrefix: userData?.avatar?.substring(0, 100) || 'NONE',
      avatarType: userData?.avatar?.startsWith('data:') ? 'data-url' : 'unknown',
      userId: user.id,
      userEmail: user.email
    };
    
    console.log('🖼️  Avatar info:', avatarInfo);
    
    return c.json({
      success: true,
      avatar: avatarInfo
    });
  } catch (error: any) {
    console.error('Check avatar error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DIRECT UPLOAD PHOTO ROUTE (Inline for debugging)
app.post('/make-server-adb995ba/profile/upload-photo', async (c) => {
  console.log('');
  console.log('════════════════════════════════════════════════════════');
  console.log('📸 DIRECT UPLOAD PHOTO ENDPOINT HIT');
  console.log('════════════════��═══════════════════════════════════════');
  
  try {
    // Get authorization header
    const authHeader = c.req.header('Authorization');
    console.log('🔑 Auth Header:', authHeader ? 'Present' : 'MISSING');
    
    // ✅ FIX: Read user token from X-User-Token header instead of Authorization
    // Authorization header contains publicAnonKey to pass Supabase Edge Functions validation
    const token = c.req.header('X-User-Token');
    console.log('🎫 User Token (from X-User-Token):', token ? `${token.substring(0, 20)}...` : 'MISSING');
    
    if (!token) {
      console.log('❌ No user token in X-User-Token header');
      return c.json({ success: false, error: 'No user token provided' }, 401);
    }
    
    console.log('🎫 Token length:', token.length);
    console.log('🎫 Token preview:', token.substring(0, 30) + '...');
    
    // ✅ FIX: Use Supabase Auth for verification instead of KV token lookup
    console.log('🔐 Verifying token with Supabase Auth...');
    
    // Import auth helper dynamically
    const { verifyUserToken } = await import('./auth_helper.tsx');
    const user = await verifyUserToken(token);
    
    if (!user) {
      console.log('❌ Token verification failed');
      console.log('════════════════════════════════════════════════════════');
      return c.json({ success: false, error: 'Unauthorized - Invalid token' }, 401);
    }
    
    /* OLD CODE - REMOVED - was using KV token lookup instead of Supabase Auth
    // ✅ ENHANCED DEBUG: Log all user tokens for debugging
    console.log('🔍 All user tokens in database:');
    users.forEach(u => {
      const dbTokenPreview = u.accessToken ? u.accessToken.substring(0, 30) + '...' : 'NO TOKEN';
      const matches = u.accessToken === token;
      console.log(`  - ${u.email}:`);
      console.log(`    DB Token: ${dbTokenPreview}`);
      console.log(`    Matches: ${matches ? '✅ YES' : '❌ NO'}`);
      if (u.accessToken && token) {
        console.log(`    DB Length: ${u.accessToken.length} | Sent Length: ${token.length}`);
      }
    });
    
    // ✅ Also log the sent token for comparison
    console.log('📤 Token sent from frontend:');
    console.log(`  Full Token: ${token}`);
    console.log(`  Length: ${token.length}`);
    
    const user = users.find(u => u.accessToken === token);
    
    if (!user) {
      console.log('❌ No user found with accessToken:', token);
      console.log('══════════════════════════════════════���═════════════════');
      return c.json({ success: false, error: 'Unauthorized - Invalid token' }, 401);
    }
    
    console.log('✅ User authenticated:', {
      id: user.id,
      email: user.email,
      role: user.role
    });
    */
    
    // ✅ CHECK CONTENT TYPE: Support both JSON (base64) and FormData
    const contentType = c.req.header('Content-Type') || '';
    console.log('📦 Content-Type:', contentType);
    
    let photoBuffer: Uint8Array;
    let fileName: string;
    let fileType: string;
    
    if (contentType.includes('application/json')) {
      // ✅ JSON REQUEST: Base64 from frontend (Figma iframe friendly)
      console.log('📸 Processing JSON base64 upload...');
      const body = await c.req.json();
      
      if (!body.photoBase64) {
        console.log('❌ No photoBase64 in request');
        return c.json({ success: false, error: 'No photo provided' }, 400);
      }
      
      console.log('📷 Photo received (base64):', {
        fileName: body.fileName,
        fileSize: body.fileSize,
        fileType: body.fileType,
        base64Length: body.photoBase64.length
      });
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(body.fileType)) {
        return c.json({ 
          success: false, 
          error: 'Invalid file type. Use JPEG, PNG, WebP, or GIF' 
        }, 400);
      }
      
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (body.fileSize > maxSize) {
        return c.json({ 
          success: false, 
          error: 'File too large. Max 5MB' 
        }, 400);
      }
      
      // ✅ CONVERT BASE64 TO BUFFER for Supabase Storage
      const base64Data = body.photoBase64.replace(/^data:image\/\w+;base64,/, '');
      const binaryString = atob(base64Data);
      photoBuffer = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        photoBuffer[i] = binaryString.charCodeAt(i);
      }
      
      fileName = body.fileName || `profile-${user.id}-${Date.now()}.jpg`;
      fileType = body.fileType;
      
    } else {
      // ✅ FORMDATA REQUEST: Traditional file upload
      console.log('📸 Processing FormData upload...');
      const formData = await c.req.formData();
      const photo = formData.get('photo') as File;
      
      if (!photo) {
        console.log('❌ No photo in FormData');
        return c.json({ success: false, error: 'No photo provided' }, 400);
      }
      
      console.log('📷 Photo received:', {
        name: photo.name,
        size: photo.size,
        type: photo.type
      });
    
      // Validate file
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(photo.type)) {
        return c.json({ 
          success: false, 
          error: 'Invalid file type. Use JPEG, PNG, WebP, or GIF' 
        }, 400);
      }
      
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (photo.size > maxSize) {
        return c.json({ 
          success: false, 
          error: 'File too large. Max 5MB' 
        }, 400);
      }
      
      // Convert to buffer
      const arrayBuffer = await photo.arrayBuffer();
      photoBuffer = new Uint8Array(arrayBuffer);
      fileName = photo.name;
      fileType = photo.type;
    }
    
    // ✅ NEW: UPLOAD TO SUPABASE STORAGE
    console.log('☁️ Uploading to Supabase Storage...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const bucketName = 'make-adb995ba-profile-photos';
    const filePath = `${user.id}/${Date.now()}-${fileName}`;
    
    // ✅ Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log('📦 Creating bucket:', bucketName);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true, // ✅ Make bucket public so photos are accessible
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
      });
      
      if (createError) {
        console.error('❌ Failed to create bucket:', createError);
        throw new Error('Failed to create storage bucket');
      }
      console.log('✅ Bucket created successfully');
    }
    
    // ✅ Delete old photo if exists
    if (user.avatar && user.avatar.includes('/storage/v1/object/public/')) {
      try {
        // Extract file path from URL
        const urlParts = user.avatar.split(`/storage/v1/object/public/${bucketName}/`);
        if (urlParts.length > 1) {
          const oldPath = urlParts[1];
          console.log('🗑️ Deleting old photo:', oldPath);
          await supabase.storage.from(bucketName).remove([oldPath]);
        }
      } catch (err) {
        console.warn('⚠️ Failed to delete old photo (non-critical):', err);
      }
    }
    
    // ✅ Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, photoBuffer, {
        contentType: fileType,
        upsert: true
      });
    
    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    console.log('✅ Uploaded to storage:', uploadData.path);
    
    // ✅ Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    const photoUrl = publicUrlData.publicUrl;
    console.log('✅ Public URL:', photoUrl);
    
    // Update user avatar in KV
    user.avatar = photoUrl;
    user.updatedAt = new Date().toISOString();
    await kv.set(`user:${user.id}`, user);
    
    // ✅ VERIFY: Read back from KV to ensure it was saved correctly
    console.log('🔍 Verifying avatar was saved correctly...');
    const verifiedUser = await kv.get(`user:${user.id}`);
    const avatarSaved = verifiedUser?.avatar && verifiedUser.avatar.length > 0;
    const avatarMatches = verifiedUser?.avatar === photoUrl;
    
    console.log('✅ Verification result:', {
      userFound: !!verifiedUser,
      avatarExists: avatarSaved,
      avatarLength: verifiedUser?.avatar?.length || 0,
      avatarMatches: avatarMatches,
      avatarPrefix: verifiedUser?.avatar?.substring(0, 50) || 'NONE'
    });
    
    if (!avatarSaved || !avatarMatches) {
      console.error('❌ Avatar verification failed! Data may not have been saved correctly.');
      return c.json({
        success: false,
        error: 'Failed to save avatar. Data integrity check failed.'
      }, 500);
    }
    
    console.log('[ProfilePhoto] User updated in KV');
    console.log('[ProfilePhoto] Upload method: Supabase Storage');


    console.log('��� Upload completed successfully');
    console.log('');
    
    return c.json({
      success: true,
      photoUrl: photoUrl,
      uploadMethod: 'supabase_storage',
      message: 'Profile photo uploaded successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    console.log('═════════════════════════════════════════════════════��══');
    return c.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, 500);
  }
});

// Mount profile photo routes (keep as fallback)
app.route('', profilePhotoRoutes);

// ==================== PRODUCT ROUTES (Admin with Image Upload) ====================

// Mount product routes
app.route('/make-server-adb995ba', productRoutes);

// ==================== CHAT ROUTES ====================

// Mount chat routes
app.route('/make-server-adb995ba/chat', chatRoutes);

// ==================== IMAGE MIGRATION ====================

// Migrate product images to Supabase Storage (Admin only)
app.post('/make-server-adb995ba/migrate-images', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user || user.role !== 'admin') {
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    console.log('🖼️  Product image migration placeholder - No action needed');
    
    return c.json({
      success: true,
      migrated: 0,
      errors: [],
      message: 'Migration feature not implemented'
    });

  } catch (error: any) {
    console.error('❌ Migration error:', error);
    return c.json({
      success: false,
      error: error.message || 'Migration failed'
    }, 500);
  }
});

// ==================== CART ROUTES ====================

// Add item to cart
app.post('/make-server-adb995ba/cart/items', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const { productId, quantity } = await c.req.json();

    if (!productId || !quantity || quantity <= 0) {
      return c.json({ 
        success: false, 
        error: 'Product ID and valid quantity are required' 
      }, 400);
    }

    const cartItem = await cartStore.addCartItem(user.id, productId, quantity);

    return c.json({
      success: true,
      data: cartItem,
    });
  } catch (error: any) {
    console.error('❌ Error adding cart item:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to add item to cart',
    }, 500);
  }
});

// Get user's cart items
app.get('/make-server-adb995ba/cart/items', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    
    if (!token) {
      console.error('❌ [GET /cart/items] No token provided');
      return c.json({ success: false, error: 'No authentication token' }, 401);
    }
    
    console.log(`🔍 [GET /cart/items] Token: ${token.substring(0, 20)}...`);
    const user = await getUserFromToken(token);

    if (!user) {
      console.error('❌ [GET /cart/items] User not found with token');
      return c.json({ success: false, error: 'Unauthorized - user not found' }, 401);
    }

    console.log(`✅ [GET /cart/items] User authenticated: ${user.email} (${user.id})`);
    const cartItems = await cartStore.getCartItems(user.id);
    console.log(`📦 [GET /cart/items] Returning ${cartItems.length} cart items`);

    return c.json({
      success: true,
      data: cartItems,
    });
  } catch (error: any) {
    console.error('❌ [GET /cart/items] Error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get cart items',
    }, 500);
  }
});

// Update cart item quantity
app.put('/make-server-adb995ba/cart/items/:productId', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const productId = c.req.param('productId');
    const { quantity } = await c.req.json();

    if (!quantity || quantity <= 0) {
      return c.json({ 
        success: false, 
        error: 'Valid quantity is required' 
      }, 400);
    }

    const cartItem = await cartStore.updateCartItemQuantity(user.id, productId, quantity);

    if (!cartItem) {
      return c.json({ 
        success: false, 
        error: 'Cart item not found' 
      }, 404);
    }

    return c.json({
      success: true,
      data: cartItem,
    });
  } catch (error: any) {
    console.error('❌ Error updating cart item:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to update cart item',
    }, 500);
  }
});

// Remove item from cart
app.delete('/make-server-adb995ba/cart/items/:productId', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const productId = c.req.param('productId');
    await cartStore.removeCartItem(user.id, productId);

    return c.json({
      success: true,
      message: 'Item removed from cart',
    });
  } catch (error: any) {
    console.error('❌ Error removing cart item:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to remove item from cart',
    }, 500);
  }
});

// Clear all cart items
app.delete('/make-server-adb995ba/cart/clear', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    await cartStore.clearCart(user.id);

    return c.json({
      success: true,
      message: 'Cart cleared successfully',
    });
  } catch (error: any) {
    console.error('❌ Error clearing cart:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to clear cart',
    }, 500);
  }
});

// Get cart item count
app.get('/make-server-adb995ba/cart/count', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const count = await cartStore.getCartItemCount(user.id);

    return c.json({
      success: true,
      count,
    });
  } catch (error: any) {
    console.error('❌ Error getting cart count:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get cart count',
    }, 500);
  }
});

// ✅ NEW: Sync cart items (for real-time sync)
app.post('/make-server-adb995ba/cart/sync', async (c) => {
  try {
    const sessionToken = c.req.header('X-Session-Token');
    const user = await getUserFromToken(sessionToken);

    if (!user) {
      console.error('❌ [POST /cart/sync] User not authenticated');
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return c.json({ 
        success: false, 
        error: 'Invalid items format - must be array' 
      }, 400);
    }

    console.log(`🔄 [POST /cart/sync] Syncing ${items.length} items for user ${user.email}`);

    // Clear existing cart and add new items
    await cartStore.clearCart(user.id);

    for (const item of items) {
      await cartStore.addCartItem(user.id, {
        productId: item.productId,
        quantity: item.quantity,
        product: item.product,
      });
    }

    console.log(`✅ [POST /cart/sync] Cart synced successfully`);

    return c.json({
      success: true,
      message: 'Cart synced successfully',
      itemCount: items.length,
    });
  } catch (error: any) {
    console.error('❌ [POST /cart/sync] Error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to sync cart',
    }, 500);
  }
});

// Get full cart (alias for /cart/items for compatibility)
app.get('/make-server-adb995ba/cart', async (c) => {
  try {
    const sessionToken = c.req.header('X-Session-Token');
    const user = await getUserFromToken(sessionToken);

    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const cartItems = await cartStore.getCartItems(user.id);

    return c.json({
      success: true,
      cart: cartItems,
    });
  } catch (error: any) {
    console.error('❌ [GET /cart] Error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get cart',
    }, 500);
  }
});

// ==================== VOUCHER ROUTES ====================

// Validate voucher code (User)
app.post('/make-server-adb995ba/vouchers/validate', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({
        success: false,
        error: 'Unauthorized'
      }, 401);
    }

    const { code, totalAmount } = await c.req.json();

    if (!code || !code.trim()) {
      return c.json({
        success: false,
        error: 'Kode voucher harus diisi'
      }, 400);
    }

    console.log('🎫 Validating voucher:', code, 'for user:', user.email, 'totalAmount:', totalAmount);

    const validationResult = await voucherStore.validateVoucher(code.trim().toUpperCase(), user.id, totalAmount);

    if (!validationResult.valid) {
      console.log('❌ Voucher validation failed:', validationResult.message);
      return c.json({
        success: false,
        error: validationResult.message
      }, 400);
    }

    // ✅ Calculate discount amount based on voucher type
    let discountAmount = 0;
    if (validationResult.voucher && totalAmount) {
      if (validationResult.voucher.discountType === 'percentage') {
        discountAmount = Math.round(totalAmount * (validationResult.voucher.discountValue / 100));
        // Apply max discount limit if set
        if (validationResult.voucher.maxDiscount && discountAmount > validationResult.voucher.maxDiscount) {
          discountAmount = validationResult.voucher.maxDiscount;
        }
      } else if (validationResult.voucher.discountType === 'fixed') {
        discountAmount = validationResult.voucher.discountValue;
      }
    }

    console.log('✅ Voucher valid:', validationResult.voucher?.code, `(${validationResult.voucher?.discountType === 'percentage' ? validationResult.voucher?.discountValue + '%' : 'Rp ' + validationResult.voucher?.discountValue})`, `= Rp ${discountAmount}`);

    return c.json({
      success: true,
      message: validationResult.message,
      voucher: {
        ...validationResult.voucher,
        discount: discountAmount, // ✅ Include calculated discount
      }
    });

  } catch (error: any) {
    console.error('❌ Validate voucher error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat validasi voucher'
    }, 500);
  }
});

// Get user vouchers (User)
app.get('/make-server-adb995ba/vouchers/my', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({
        success: false,
        error: 'Unauthorized'
      }, 401);
    }

    const vouchers = await voucherStore.getUserVouchersWithData(user.id);

    console.log(`🎫 Returning ${vouchers.length} vouchers for user:`, user.email);

    return c.json({
      success: true,
      vouchers: vouchers
    });

  } catch (error: any) {
    console.error('❌ Get user vouchers error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan',
      vouchers: []
    }, 500);
  }
});

// Get all vouchers (Admin only)
app.get('/make-server-adb995ba/vouchers', async (c) => {
  console.log('🎫 [GET /vouchers] Request received');
  try {
    const token = c.req.header('X-Session-Token');
    console.log('🔑 [GET /vouchers] Token present:', !!token);
    
    const user = await getUserFromToken(token);
    console.log('👤 [GET /vouchers] User:', user?.email, 'Role:', user?.role);

    if (!user || user.role !== 'admin') {
      console.log('❌ [GET /vouchers] Unauthorized - Admin only');
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    console.log('📋 [GET /vouchers] Fetching vouchers from store...');
    const vouchers = await voucherStore.getAllVouchers();
    console.log(`✅ [GET /vouchers] Returning ${vouchers.length} vouchers for admin:`, user.email);

    return c.json({
      success: true,
      vouchers: vouchers
    });

  } catch (error: any) {
    console.error('❌ [GET /vouchers] Error:', error);
    console.error('❌ [GET /vouchers] Error stack:', error.stack);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan: ' + error.message,
      vouchers: []
    }, 500);
  }
});

// Get voucher statistics (Admin only)
app.get('/make-server-adb995ba/vouchers/stats', async (c) => {
  console.log('📊 [GET /vouchers/stats] Request received');
  try {
    const token = c.req.header('X-Session-Token');
    console.log('🔑 [GET /vouchers/stats] Token present:', !!token);
    
    const user = await getUserFromToken(token);
    console.log('👤 [GET /vouchers/stats] User:', user?.email, 'Role:', user?.role);

    if (!user || user.role !== 'admin') {
      console.log('❌ [GET /vouchers/stats] Unauthorized - Admin only');
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    console.log('📊 [GET /vouchers/stats] Fetching stats from store...');
    const stats = await voucherStore.getVoucherStats();
    console.log('✅ [GET /vouchers/stats] Stats:', stats);

    return c.json({
      success: true,
      stats: stats
    });

  } catch (error: any) {
    console.error('❌ [GET /vouchers/stats] Error:', error);
    console.error('❌ [GET /vouchers/stats] Error stack:', error.stack);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan: ' + error.message
    }, 500);
  }
});

// Create new voucher (Admin only)
app.post('/make-server-adb995ba/vouchers/create', async (c) => {
  try {
    console.log('🎫 [CreateVoucher] Starting voucher creation...');
    
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    console.log('👤 [CreateVoucher] User:', user?.email, 'Role:', user?.role);

    if (!user || user.role !== 'admin') {
      console.log('❌ [CreateVoucher] Unauthorized - Admin only');
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    const body = await c.req.json();
    const { code, discountValue, userEmail } = body;

    console.log('📝 [CreateVoucher] Request data:', { code, discountValue, userEmail });

    // Validate input
    if (!code || !discountValue || !userEmail) {
      console.log('❌ [CreateVoucher] Missing required fields');
      return c.json({
        success: false,
        error: 'Kode voucher, diskon, dan email pengguna wajib diisi'
      }, 400);
    }

    if (discountValue <= 0 || discountValue > 100) {
      console.log('❌ [CreateVoucher] Invalid discount value:', discountValue);
      return c.json({
        success: false,
        error: 'Diskon harus antara 1-100%'
      }, 400);
    }

    // Check if voucher code already exists
    console.log('🔍 [CreateVoucher] Checking for existing voucher code...');
    const existingVouchers = await voucherStore.getAllVouchers();
    const codeExists = existingVouchers.some(v => v.code.toUpperCase() === code.toUpperCase());
    
    if (codeExists) {
      console.log('❌ [CreateVoucher] Voucher code already exists:', code);
      return c.json({
        success: false,
        error: 'Kode voucher sudah digunakan'
      }, 400);
    }

    // ✅ FIX: Create Supabase client with service role key
    console.log('🔧 [CreateVoucher] Creating Supabase client...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get or find user by email
    console.log('🔍 [CreateVoucher] Finding user by email:', userEmail);
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ [CreateVoucher] Error listing users:', userError);
      return c.json({
        success: false,
        error: 'Gagal mengambil data pengguna: ' + userError.message
      }, 500);
    }
    
    let targetUser = null;
    if (userData && userData.users) {
      targetUser = userData.users.find(u => u.email?.toLowerCase() === userEmail.toLowerCase());
    }

    if (!targetUser) {
      console.log('❌ [CreateVoucher] User not found:', userEmail);
      return c.json({
        success: false,
        error: 'Pengguna dengan email tersebut tidak ditemukan'
      }, 404);
    }

    console.log('✅ [CreateVoucher] Target user found:', targetUser.email);

    // Create voucher
    const voucherId = crypto.randomUUID();
    const newVoucher = {
      id: voucherId,
      code: code.toUpperCase(),
      discountType: 'percentage' as const,
      discountValue: discountValue,
      status: 'active' as const,
      userId: targetUser.id,
      userEmail: targetUser.email!,
      createdAt: new Date().toISOString(),
    };

    console.log('💾 [CreateVoucher] Saving voucher to store...');
    await voucherStore.createVoucher(newVoucher);

    console.log(`✅ [CreateVoucher] Admin ${user.email} created voucher ${code} for ${userEmail}`);

    return c.json({
      success: true,
      message: 'Voucher berhasil dibuat',
      voucher: newVoucher
    });

  } catch (error: any) {
    console.error('❌ [CreateVoucher] Error:', error);
    console.error('❌ [CreateVoucher] Error stack:', error.stack);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat membuat voucher: ' + (error.message || 'Unknown error')
    }, 500);
  }
});

// Delete voucher (Admin only)
app.delete('/make-server-adb995ba/vouchers/:id', async (c) => {
  try {
    console.log('🗑️ [DeleteVoucher] Starting voucher deletion...');
    
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    console.log('👤 [DeleteVoucher] User:', user?.email, 'Role:', user?.role);

    if (!user || user.role !== 'admin') {
      console.log('❌ [DeleteVoucher] Unauthorized - Admin only');
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    const voucherId = c.req.param('id');
    console.log('🎫 [DeleteVoucher] Voucher ID:', voucherId);

    if (!voucherId) {
      return c.json({
        success: false,
        error: 'Voucher ID is required'
      }, 400);
    }

    // Get voucher first to check if it exists
    const voucher = await kv.get(`voucher:${voucherId}`);

    if (!voucher) {
      console.log('❌ [DeleteVoucher] Voucher not found:', voucherId);
      return c.json({
        success: false,
        error: 'Voucher tidak ditemukan'
      }, 404);
    }

    console.log('📋 [DeleteVoucher] Found voucher:', voucher);

    // Delete voucher
    await kv.del(`voucher:${voucherId}`);

    console.log(`✅ [DeleteVoucher] Admin ${user.email} deleted voucher ${voucher.code} (${voucherId})`);

    return c.json({
      success: true,
      message: 'Voucher berhasil dihapus'
    });

  } catch (error: any) {
    console.error('❌ [DeleteVoucher] Error:', error);
    console.error('❌ [DeleteVoucher] Error stack:', error.stack);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat menghapus voucher: ' + (error.message || 'Unknown error')
    }, 500);
  }
});

// ==================== HEALTH CHECK ====================

app.get('/make-server-adb995ba/health', (c) => {
  return c.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ==================== START SERVER ====================

console.log('');
console.log('══════════���════════════════════════════════════════════');
console.log('🚀 MarketHub API Server Starting...');
console.log('═══════════════════════════════════════════════════════');
console.log('');

// ✅ DISABLED: Auto-initialize buckets (not needed with base64 storage)
// Using base64 storage directly, no Supabase Storage buckets needed
console.log('💾 Using base64 storage - No bucket initialization needed');

// ==================== STORAGE UPLOAD ROUTES ====================

// Upload refund evidence to Supabase Storage
app.post('/make-server-adb995ba/storage/refund-evidence', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({
        success: false,
        error: 'Unauthorized - Login required'
      }, 403);
    }

    const body = await c.req.json();
    const { fileName, fileData, contentType } = body;

    if (!fileName || !fileData || !contentType) {
      return c.json({
        success: false,
        error: 'fileName, fileData, and contentType required'
      }, 400);
    }

    // Import storage helper
    const { uploadImage, BUCKETS } = await import('./storageHelper.tsx');

    // Convert base64 to Uint8Array
    const binaryString = atob(fileData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to Supabase Storage
    const uploadResult = await uploadImage(
      BUCKETS.REFUND_EVIDENCE,
      fileName,
      bytes,
      contentType
    );

    if (!uploadResult.success) {
      return c.json({
        success: false,
        error: uploadResult.error || 'Upload failed'
      }, 500);
    }

    console.log(`✅ Refund evidence uploaded: ${fileName}`);

    return c.json({
      success: true,
      url: uploadResult.url
    });

  } catch (error: any) {
    console.error('❌ Upload refund evidence error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat upload file'
    }, 500);
  }
});

// ==================== REFUND & RETURN ROUTES ====================

// Create refund (User or Auto)
app.post('/make-server-adb995ba/refunds', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({
        success: false,
        error: 'Unauthorized - Login required'
      }, 403);
    }

    const body = await c.req.json();
    const { orderId, type, reason, description, amount, evidence } = body;

    // Validate
    if (!orderId || !type || !reason || !amount) {
      return c.json({
        success: false,
        error: 'Missing required fields'
      }, 400);
    }

    // Check if order exists
    const order = await kv.get(`order:${orderId}`);
    if (!order) {
      return c.json({
        success: false,
        error: 'Order tidak ditemukan'
      }, 404);
    }

    // Check if refund already exists for this order
    const existingRefund = await refundStore.getRefundByOrderId(orderId);
    if (existingRefund) {
      return c.json({
        success: false,
        error: 'Refund sudah pernah diajukan untuk pesanan ini'
      }, 400);
    }

    // Validate based on refund type
    if (type === 'user_request') {
      // For user_request type, order must be delivered
      if (order.status !== 'delivered') {
        return c.json({
          success: false,
          error: 'Refund hanya dapat diajukan untuk pesanan yang sudah terkirim'
        }, 400);
      }
    } else if (type === 'admin_cancel') {
      // For admin_cancel type, order must be cancelled
      if (order.status !== 'cancelled') {
        return c.json({
          success: false,
          error: 'Auto-refund hanya dapat dibuat untuk pesanan yang sudah dibatalkan'
        }, 400);
      }
    }

    // Create refund
    const result = await refundStore.createRefund({
      orderId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      type,
      reason,
      description: description || '',
      amount,
      evidence: evidence || [],
    });

    if (!result.success) {
      return c.json({
        success: false,
        error: result.error || 'Gagal membuat refund'
      }, 500);
    }

    console.log(`✅ Refund created: ${result.refund?.id} by ${user.name}`);

    return c.json({
      success: true,
      refund: result.refund
    });

  } catch (error: any) {
    console.error('❌ Create refund error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat membuat refund'
    }, 500);
  }
});

// Get user's refunds
app.get('/make-server-adb995ba/refunds/user', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({
        success: false,
        error: 'Unauthorized - Login required'
      }, 403);
    }

    const refunds = await refundStore.getUserRefunds(user.id);

    return c.json({
      success: true,
      refunds
    });

  } catch (error: any) {
    console.error('❌ Get user refunds error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan'
    }, 500);
  }
});

// Get all refunds (Admin only)
app.get('/make-server-adb995ba/refunds', async (c) => {
  try {
    console.log('📋 GET /refunds - Admin fetch all refunds');
    
    const token = c.req.header('X-Session-Token');
    console.log('🔑 Token present:', token ? 'YES' : 'NO');
    console.log('🔑 Token preview:', token ? token.substring(0, 30) + '...' : 'NO TOKEN');
    
    const user = await getUserFromToken(token);
    console.log('👤 User found:', user ? `${user.email} (${user.role})` : 'NO');

    if (!user) {
      console.log('⛔ Access denied: Token validation failed');
      return c.json({
        success: false,
        error: 'Unauthorized - Login required'
      }, 401); // ✅ Return 401 for invalid token
    }

    if (user.role !== 'admin') {
      console.log('⛔ Access denied: User is not admin');
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403); // ✅ Return 403 for non-admin
    }

    console.log('🔍 Fetching all refunds from store...');
    const refunds = await refundStore.getAllRefunds();
    console.log(`✅ Found ${refunds.length} refunds`);

    return c.json({
      success: true,
      refunds
    });

  } catch (error: any) {
    console.error('❌ Get all refunds error:', error);
    return c.json({
      success: false,
      error: error.message || 'Terjadi kesalahan'
    }, 500);
  }
});

// Get refund by ID
app.get('/make-server-adb995ba/refunds/:id', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({
        success: false,
        error: 'Unauthorized - Login required'
      }, 403);
    }

    const refundId = c.req.param('id');
    const refund = await refundStore.getRefund(refundId);

    if (!refund) {
      return c.json({
        success: false,
        error: 'Refund tidak ditemukan'
      }, 404);
    }

    // User can only see their own refunds, admin can see all
    if (user.role !== 'admin' && refund.userId !== user.id) {
      return c.json({
        success: false,
        error: 'Unauthorized'
      }, 403);
    }

    return c.json({
      success: true,
      refund
    });

  } catch (error: any) {
    console.error('❌ Get refund error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan'
    }, 500);
  }
});

// ✅ NEW: Get refund by order ID (for customer to check refund status)
app.get('/make-server-adb995ba/refunds/order/:orderId', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({
        success: false,
        error: 'Unauthorized - Login required'
      }, 403);
    }

    const orderId = c.req.param('orderId');
    const refund = await refundStore.getRefundByOrderId(orderId);

    if (!refund) {
      return c.json({
        success: false,
        error: 'Refund tidak ditemukan untuk pesanan ini'
      }, 404);
    }

    // User can only see their own refunds, admin can see all
    if (user.role !== 'admin' && refund.userId !== user.id) {
      return c.json({
        success: false,
        error: 'Unauthorized'
      }, 403);
    }

    return c.json({
      success: true,
      refund
    });

  } catch (error: any) {
    console.error('❌ Get refund by order ID error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan'
    }, 500);
  }
});

// Update refund status (Admin only for certain statuses, User can update to 'shipping')
app.put('/make-server-adb995ba/refunds/:id/status', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    console.log('🔄 [RefundStatus] Request received:', {
      refundId: c.req.param('id'),
      userId: user?.id,
      userRole: user?.role
    });

    if (!user) {
      console.error('❌ [RefundStatus] No user found from token');
      return c.json({
        success: false,
        error: 'Unauthorized - Login required'
      }, 403);
    }

    const refundId = c.req.param('id');
    const { status, note, statusNote, adminNote, returnShipping, refundMethod } = await c.req.json();

    console.log('📦 [RefundStatus] Request body:', { status, note, statusNote });

    if (!status) {
      console.error('❌ [RefundStatus] No status provided');
      return c.json({
        success: false,
        error: 'Status is required'
      }, 400);
    }

    // ✅ Get refund to verify ownership
    const refund = await refundStore.getRefund(refundId);
    
    console.log('🔍 [RefundStatus] Refund lookup result:', {
      found: !!refund,
      currentStatus: refund?.status,
      userId: refund?.userId
    });
    
    if (!refund) {
      console.error('❌ [RefundStatus] Refund not found:', refundId);
      return c.json({
        success: false,
        error: 'Refund not found'
      }, 404);
    }

    // ✅ Check authorization based on status being updated
    if (status === 'shipping') {
      console.log('📦 [RefundStatus] Processing shipping confirmation...');
      
      // ✅ User can update to 'shipping' (confirming they've shipped the item)
      if (user.id !== refund.userId) {
        console.error('❌ [RefundStatus] User ID mismatch:', { userId: user.id, refundUserId: refund.userId });
        return c.json({
          success: false,
          error: 'Unauthorized - You can only update your own refunds'
        }, 403);
      }

      // ✅ User can only update from 'approved' to 'shipping'
      if (refund.status !== 'approved') {
        console.error('❌ [RefundStatus] Invalid status transition:', { 
          currentStatus: refund.status, 
          targetStatus: 'shipping' 
        });
        return c.json({
          success: false,
          error: `Can only confirm shipment when refund is approved. Current status: ${refund.status}`
        }, 400);
      }

      console.log('✅ [RefundStatus] Validation passed, updating status...');

      // ✅ Update status with user's note
      const result = await refundStore.updateRefundStatus(
        refundId,
        'shipping',
        statusNote || note || 'Barang telah dikirim oleh user, menunggu konfirmasi diterima dari admin',
        user.id,
        user.name,
        {
          shippedAt: new Date().toISOString(),
        }
      );

      console.log('📊 [RefundStatus] Update result:', { success: result.success, error: result.error });

      if (!result.success) {
        console.error('❌ [RefundStatus] Update failed:', result.error);
        return c.json({
          success: false,
          error: result.error || 'Gagal memperbarui status refund'
        }, 500);
      }

      console.log(`✅ Refund ${refundId} confirmed shipped by user ${user.name}`);

      // ✅ Broadcast update to all connected clients
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabase.channel(`refund:${refundId}`).send({
          type: 'broadcast',
          event: 'refund_update',
          payload: {
            refundId,
            status: 'shipping',
            userId: user.id,
            userName: user.name,
          },
        });
        console.log('📡 [RefundStatus] Broadcast sent successfully');
      } catch (broadcastError) {
        console.error('❌ Failed to broadcast refund update:', broadcastError);
        // Don't fail the request if broadcast fails
      }

      return c.json({
        success: true,
        refund: result.refund
      });
    } else {
      // ✅ For other statuses, only admin can update
      if (user.role !== 'admin') {
        return c.json({
          success: false,
          error: 'Unauthorized - Admin only'
        }, 403);
      }

      if (!note) {
        return c.json({
          success: false,
          error: 'Note is required'
        }, 400);
      }

      const additionalData: Partial<refundStore.Refund> = {
        reviewedBy: user.id,
        reviewedByName: user.name,
        reviewedAt: new Date().toISOString(),
      };

      if (adminNote) additionalData.adminNote = adminNote;
      if (returnShipping) additionalData.returnShipping = returnShipping;
      if (refundMethod) additionalData.refundMethod = refundMethod;
      if (status === 'refunded') additionalData.refundedAt = new Date().toISOString();

      const result = await refundStore.updateRefundStatus(
        refundId,
        status,
        note,
        user.id,
        user.name,
        additionalData
      );

      if (!result.success) {
        return c.json({
          success: false,
          error: result.error || 'Gagal memperbarui status refund'
        }, 500);
      }

      console.log(`✅ Refund ${refundId} status updated to ${status} by admin ${user.name}`);

      // ✅ Broadcast update to all connected clients
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabase.channel(`refund:${refundId}`).send({
          type: 'broadcast',
          event: 'refund_update',
          payload: {
            refundId,
            status,
            userId: user.id,
            userName: user.name,
            isAdmin: true,
          },
        });
      } catch (broadcastError) {
        console.error('❌ Failed to broadcast refund update:', broadcastError);
        // Don't fail the request if broadcast fails
      }

      return c.json({
        success: true,
        refund: result.refund
      });
    }

  } catch (error: any) {
    console.error('❌ Update refund status error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan'
    }, 500);
  }
});

// Upload refund evidence (User only)
app.post('/make-server-adb995ba/refunds/:id/evidence', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user) {
      return c.json({
        success: false,
        error: 'Unauthorized - Login required'
      }, 403);
    }

    const refundId = c.req.param('id');
    const refund = await refundStore.getRefund(refundId);

    if (!refund) {
      return c.json({
        success: false,
        error: 'Refund tidak ditemukan'
      }, 404);
    }

    // Only the owner can upload evidence
    if (refund.userId !== user.id) {
      return c.json({
        success: false,
        error: 'Unauthorized'
      }, 403);
    }

    const { evidence } = await c.req.json();

    if (!evidence || !evidence.url) {
      return c.json({
        success: false,
        error: 'Evidence data required'
      }, 400);
    }

    const result = await refundStore.addRefundEvidence(refundId, evidence);

    if (!result.success) {
      return c.json({
        success: false,
        error: result.error || 'Gagal menambahkan bukti'
      }, 500);
    }

    console.log(`✅ Evidence added to refund ${refundId}`);

    return c.json({
      success: true,
      message: 'Bukti berhasil ditambahkan'
    });

  } catch (error: any) {
    console.error('❌ Add evidence error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan'
    }, 500);
  }
});

// Get refund statistics (Admin only)
app.get('/make-server-adb995ba/refunds/stats/summary', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const user = await getUserFromToken(token);

    if (!user || user.role !== 'admin') {
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only'
      }, 403);
    }

    const stats = await refundStore.getRefundStats();

    return c.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('❌ Get refund stats error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan'
    }, 500);
  }
});

// ==================== RESET DATA ENDPOINTS ====================

// Helper function to check if user is admin
async function checkAdminAuth(c: any) {
  try {
    const token = c.req.header('X-Session-Token');
    
    if (!token) {
      console.error('❌ [checkAdminAuth] No token provided in request');
      return { isAdmin: false, error: 'No token provided' };
    }

    console.log('🔐 [checkAdminAuth] Validating admin token...');
    const user = await getUserFromToken(token);
    
    if (!user) {
      console.error('❌ [checkAdminAuth] No user found from token');
      return { isAdmin: false, error: 'Unauthorized - User is not admin or not found' };
    }
    
    console.log(`🔍 [checkAdminAuth] User found: ${user.email}, role: ${user.role}`);
    
    if (user.role !== 'admin') {
      console.error(`❌ [checkAdminAuth] User ${user.email} is not admin (role: ${user.role})`);
      return { isAdmin: false, error: 'Unauthorized - User is not admin or not found' };
    }

    console.log(`✅ [checkAdminAuth] Admin access confirmed for ${user.email}`);
    return { isAdmin: true, user };
  } catch (error: any) {
    console.error('❌ [checkAdminAuth] Exception:', error.message);
    return { isAdmin: false, error: error.message };
  }
}

// Reset Orders - Hapus semua data pesanan dan transaksi
app.post('/make-server-adb995ba/admin/reset/orders', async (c) => {
  try {
    console.log('🗑️ RESET: Starting orders reset...');
    
    // Check admin authorization
    const authCheck = await checkAdminAuth(c);
    if (!authCheck.isAdmin) {
      return c.json({ success: false, error: authCheck.error }, 401);
    }

    // Get all orders and delete them
    const orders = await kv.getByPrefix('order:');
    console.log(`📦 Found ${orders.length} orders to delete`);
    
    const orderKeys = orders.map(order => `order:${order.id}`);
    if (orderKeys.length > 0) {
      await kv.mdel(orderKeys);
      console.log(`✅ Deleted ${orderKeys.length} orders`);
    }

    // Also delete payment records
    const payments = await kv.getByPrefix('payment:');
    console.log(`💳 Found ${payments.length} payment records to delete`);
    
    const paymentKeys = payments.map(payment => `payment:${payment.id}`);
    if (paymentKeys.length > 0) {
      await kv.mdel(paymentKeys);
      console.log(`✅ Deleted ${paymentKeys.length} payment records`);
    }

    console.log('✅ Orders reset completed successfully');

    return c.json({
      success: true,
      message: 'Semua data pesanan dan transaksi berhasil dihapus',
      deleted: {
        orders: orderKeys.length,
        payments: paymentKeys.length,
      }
    });

  } catch (error: any) {
    console.error('❌ Reset orders error:', error);
    return c.json({
      success: false,
      error: `Gagal mereset orders: ${error.message}`
    }, 500);
  }
});

// Reset Products - Hapus semua produk
app.post('/make-server-adb995ba/admin/reset/products', async (c) => {
  try {
    console.log('🗑️ RESET: Starting products reset...');
    
    // Check admin authorization
    const authCheck = await checkAdminAuth(c);
    if (!authCheck.isAdmin) {
      return c.json({ success: false, error: authCheck.error }, 401);
    }

    // Get all products and delete them
    const products = await kv.getByPrefix('product:');
    console.log(`📦 Found ${products.length} products to delete`);
    
    const productKeys = products.map(product => `product:${product.id}`);
    if (productKeys.length > 0) {
      await kv.mdel(productKeys);
      console.log(`✅ Deleted ${productKeys.length} products`);
    }

    // Also delete reviews related to products
    const reviews = await kv.getByPrefix('review:');
    console.log(`⭐ Found ${reviews.length} reviews to delete`);
    
    const reviewKeys = reviews.map(review => `review:${review.id}`);
    if (reviewKeys.length > 0) {
      await kv.mdel(reviewKeys);
      console.log(`✅ Deleted ${reviewKeys.length} reviews`);
    }

    console.log('✅ Products reset completed successfully');

    return c.json({
      success: true,
      message: 'Semua produk dan review berhasil dihapus',
      deleted: {
        products: productKeys.length,
        reviews: reviewKeys.length,
      }
    });

  } catch (error: any) {
    console.error('❌ Reset products error:', error);
    return c.json({
      success: false,
      error: `Gagal mereset products: ${error.message}`
    }, 500);
  }
});

// Reset Users - Hapus semua user kecuali admin
app.post('/make-server-adb995ba/admin/reset/users', async (c) => {
  try {
    console.log('🗑️ RESET: Starting users reset...');
    
    // Check admin authorization
    const authCheck = await checkAdminAuth(c);
    if (!authCheck.isAdmin) {
      return c.json({ success: false, error: authCheck.error }, 401);
    }

    const adminUser = authCheck.user;

    // Get all users
    const users = await kv.getByPrefix('user:');
    console.log(`👥 Found ${users.length} users total`);
    
    // Filter out admin users (keep them)
    const usersToDelete = users.filter(user => user.role !== 'admin');
    console.log(`🗑️ ${usersToDelete.length} users will be deleted (excluding admins)`);
    
    const userKeys = usersToDelete.map(user => `user:${user.id}`);
    if (userKeys.length > 0) {
      await kv.mdel(userKeys);
      console.log(`✅ Deleted ${userKeys.length} users`);
    }

    // Also delete user addresses
    const addresses = await kv.getByPrefix('address:');
    const addressesToDelete = addresses.filter(addr => 
      usersToDelete.some(user => user.id === addr.userId)
    );
    
    const addressKeys = addressesToDelete.map(addr => `address:${addr.id}`);
    if (addressKeys.length > 0) {
      await kv.mdel(addressKeys);
      console.log(`✅ Deleted ${addressKeys.length} addresses`);
    }

    // Clear deleted user records
    await deletedUserStore.clearAllDeletedUsers();
    console.log('✅ Cleared deleted user records');

    console.log('✅ Users reset completed successfully');

    return c.json({
      success: true,
      message: 'Semua user (kecuali admin) berhasil dihapus',
      deleted: {
        users: userKeys.length,
        addresses: addressKeys.length,
      },
      kept: {
        admins: users.length - usersToDelete.length,
      }
    });

  } catch (error: any) {
    console.error('❌ Reset users error:', error);
    return c.json({
      success: false,
      error: `Gagal mereset users: ${error.message}`
    }, 500);
  }
});

// Reset All Data - Hapus SEMUA data (SANGAT BERBAHAYA!)
app.post('/make-server-adb995ba/admin/reset/all', async (c) => {
  try {
    console.log('🗑️ RESET: Starting COMPLETE database reset...');
    console.log('⚠️ WARNING: This will delete ALL data!');
    
    // Check admin authorization
    const authCheck = await checkAdminAuth(c);
    if (!authCheck.isAdmin) {
      return c.json({ success: false, error: authCheck.error }, 401);
    }

    const stats = {
      products: 0,
      orders: 0,
      users: 0,
      addresses: 0,
      reviews: 0,
      payments: 0,
      vouchers: 0,
      refunds: 0,
      carts: 0,
      categories: 0,
      flashSales: 0,
      deletedUsers: 0,
    };

    // Delete all products
    const products = await kv.getByPrefix('product:');
    stats.products = products.length;
    if (products.length > 0) {
      await kv.mdel(products.map(p => `product:${p.id}`));
      console.log(`✅ Deleted ${products.length} products`);
    }

    // Delete all orders
    const orders = await kv.getByPrefix('order:');
    stats.orders = orders.length;
    if (orders.length > 0) {
      await kv.mdel(orders.map(o => `order:${o.id}`));
      console.log(`✅ Deleted ${orders.length} orders`);
    }

    // Delete all users
    const users = await kv.getByPrefix('user:');
    stats.users = users.length;
    if (users.length > 0) {
      await kv.mdel(users.map(u => `user:${u.id}`));
      console.log(`✅ Deleted ${users.length} users`);
    }

    // Delete all addresses
    const addresses = await kv.getByPrefix('address:');
    stats.addresses = addresses.length;
    if (addresses.length > 0) {
      await kv.mdel(addresses.map(a => `address:${a.id}`));
      console.log(`��� Deleted ${addresses.length} addresses`);
    }

    // Delete all reviews
    const reviews = await kv.getByPrefix('review:');
    stats.reviews = reviews.length;
    if (reviews.length > 0) {
      await kv.mdel(reviews.map(r => `review:${r.id}`));
      console.log(`✅ Deleted ${reviews.length} reviews`);
    }

    // Delete all payments
    const payments = await kv.getByPrefix('payment:');
    stats.payments = payments.length;
    if (payments.length > 0) {
      await kv.mdel(payments.map(p => `payment:${p.id}`));
      console.log(`✅ Deleted ${payments.length} payments`);
    }

    // Delete all vouchers
    const vouchers = await kv.getByPrefix('voucher:');
    stats.vouchers = vouchers.length;
    if (vouchers.length > 0) {
      await kv.mdel(vouchers.map(v => `voucher:${v.id}`));
      console.log(`✅ Deleted ${vouchers.length} vouchers`);
    }

    // Delete all refunds
    const refunds = await kv.getByPrefix('refund:');
    stats.refunds = refunds.length;
    if (refunds.length > 0) {
      await kv.mdel(refunds.map(r => `refund:${r.id}`));
      console.log(`✅ Deleted ${refunds.length} refunds`);
    }

    // Delete all carts
    const carts = await kv.getByPrefix('cart:');
    stats.carts = carts.length;
    if (carts.length > 0) {
      await kv.mdel(carts.map(c => `cart:${c.userId}`));
      console.log(`✅ Deleted ${carts.length} carts`);
    }

    // Delete all categories
    const categories = await kv.getByPrefix('category:');
    stats.categories = categories.length;
    if (categories.length > 0) {
      await kv.mdel(categories.map(c => `category:${c.id}`));
      console.log(`✅ Deleted ${categories.length} categories`);
    }

    // Delete all flash sales
    const flashSales = await kv.getByPrefix('flashsale:');
    stats.flashSales = flashSales.length;
    if (flashSales.length > 0) {
      await kv.mdel(flashSales.map(f => `flashsale:${f.id}`));
      console.log(`✅ Deleted ${flashSales.length} flash sales`);
    }

    // Delete all deleted user records
    const deletedUsers = await deletedUserStore.getAllDeletedUsers();
    stats.deletedUsers = deletedUsers.length;
    if (deletedUsers.length > 0) {
      await deletedUserStore.clearAllDeletedUsers();
      console.log(`✅ Deleted ${deletedUsers.length} deleted user records`);
    }

    console.log('✅ COMPLETE reset finished successfully');
    console.log('📊 Stats:', stats);

    return c.json({
      success: true,
      message: 'SEMUA data berhasil dihapus dari database',
      deleted: stats,
      warning: 'Database sekarang kosong. Jalankan /init untuk setup ulang.'
    });

  } catch (error: any) {
    console.error('❌ Reset all data error:', error);
    return c.json({
      success: false,
      error: `Gagal mereset database: ${error.message}`
    }, 500);
  }
});

// ==================== MAINTENANCE MODE ENDPOINTS ====================

// Get maintenance status (public endpoint)
app.get('/make-server-adb995ba/maintenance', async (c) => {
  try {
    const maintenance = await kv.get('system:maintenance') || {
      enabled: false,
      message: '',
      startTime: null,
      endTime: null,
      duration: 0,
    };

    console.log('📋 Get maintenance status:', maintenance);

    return c.json({
      success: true,
      maintenance,
    });
  } catch (error: any) {
    console.error('❌ Get maintenance error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat mengambil status maintenance',
    }, 500);
  }
});

// Set maintenance mode (Admin only)
app.post('/make-server-adb995ba/maintenance', async (c) => {
  try {
    const token = c.req.header('X-Session-Token');
    const adminUser = await getUserFromToken(token);

    if (!adminUser || adminUser.role !== 'admin') {
      return c.json({
        success: false,
        error: 'Unauthorized - Admin only',
      }, 403);
    }

    const body = await c.req.json();
    const { enabled, message, duration, scheduledDate, scheduledTime } = body;

    console.log('🔧 Setting maintenance mode:', { enabled, message, duration, scheduledDate, scheduledTime });

    let startTime = null;
    let endTime = null;

    if (enabled && scheduledDate && scheduledTime) {
      // Scheduled maintenance
      startTime = new Date(`${scheduledDate} ${scheduledTime}`).toISOString();
      endTime = new Date(new Date(startTime).getTime() + (duration || 2) * 60 * 60 * 1000).toISOString();
    } else if (enabled) {
      // Immediate maintenance
      startTime = new Date().toISOString();
      endTime = new Date(Date.now() + (duration || 2) * 60 * 60 * 1000).toISOString();
    }

    const maintenanceData = {
      enabled,
      message: message || 'Sistem sedang dalam pemeliharaan. Mohon maaf atas ketidaknyamanannya.',
      startTime,
      endTime,
      duration: duration || 2,
      updatedAt: new Date().toISOString(),
      updatedBy: adminUser.id,
    };

    await kv.set('system:maintenance', maintenanceData);

    console.log('✅ Maintenance mode updated:', maintenanceData);

    return c.json({
      success: true,
      maintenance: maintenanceData,
      message: enabled ? 'Mode maintenance diaktifkan' : 'Mode maintenance dinonaktifkan',
    });
  } catch (error: any) {
    console.error('❌ Set maintenance error:', error);
    return c.json({
      success: false,
      error: 'Terjadi kesalahan saat mengatur maintenance mode',
    }, 500);
  }
});

console.log('');
console.log('📍 Base URL: /make-server-adb995ba');
console.log('');
console.log('🔗 Available Endpoints:');
console.log('   GET  /health              - Health check');
console.log('   POST /init                - Initialize application');
console.log('   ✅ Refund endpoints ready');
console.log('   ����️  Reset endpoints ready (DANGEROUS!)');
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('');

// ✅ CRITICAL: Verify environment variables at startup
console.log('🔧 Environment Variables Check:');
console.log('   SUPABASE_URL:', Deno.env.get('SUPABASE_URL') ? '✅ Set' : '❌ MISSING');
console.log('   SUPABASE_ANON_KEY:', Deno.env.get('SUPABASE_ANON_KEY') ? `✅ Set (length: ${Deno.env.get('SUPABASE_ANON_KEY')?.length})` : '❌ MISSING');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? `✅ Set (length: ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.length})` : '❌ MISSING');
console.log('');

if (!Deno.env.get('SUPABASE_ANON_KEY')) {
  console.error('');
  console.error('🚨 CRITICAL ERROR: SUPABASE_ANON_KEY is not set!');
  console.error('   This will cause authentication failures.');
  console.error('   Token validation requires ANON_KEY to work properly.');
  console.error('');
}

Deno.serve(app.fetch);