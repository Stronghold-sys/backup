import * as kv from "./kv_store.tsx";
import * as userStore from "./user_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

// Create SuperAdmin account
export async function seedAdmin() {
  try {
    const adminEmail = 'utskelompok03@gmail.com';
    const adminPassword = '123456';
    const adminName = 'Admin'; // Changed from 'SuperAdmin' to 'Admin'

    // Check if admin already exists in KV store
    const existingAdmins = await kv.getByPrefix('user:');
    const adminExists = existingAdmins.find(u => u.email === adminEmail);

    if (adminExists) {
      console.log('✅ SuperAdmin account already exists in KV store');
      
      // Check if also exists in Supabase Auth
      const authResult = await userStore.getAllUsersFromAuth();
      const authAdmin = authResult.users?.find(u => u.email === adminEmail);
      
      if (!authAdmin) {
        console.log('⚠️  SuperAdmin not in Supabase Auth, creating...');
        await userStore.createUserInAuth(adminEmail, adminPassword, adminName, 'admin');
      }
      
      return { success: true, message: 'Admin already exists', userId: adminExists.id };
    }

    // 🔐 CREATE USER IN SUPABASE AUTH FIRST
    console.log('🔐 Creating SuperAdmin in Supabase Auth...');
    const authResult = await userStore.createUserInAuth(adminEmail, adminPassword, adminName, 'admin');
    
    let userId = generateUUID();
    if (authResult.success) {
      console.log('✅ SuperAdmin created in Supabase Auth with ID:', authResult.data?.id);
      userId = authResult.data?.id || userId; // Use Auth ID if available
    } else {
      console.warn('⚠️  Could not create SuperAdmin in Supabase Auth:', authResult.error);
      console.warn('⚠️  Continuing with KV store only...');
    }

    // Generate hash password
    const hashedPassword = await hashPassword(adminPassword);

    // Create admin profile in KV store
    const adminProfile = {
      id: userId,
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
      role: 'admin',
      status: 'active',
      avatar: null,
      phone: '+62 812-3456-7890',
      addresses: [
        {
          id: `addr-${Date.now()}`,
          name: adminName,
          phone: '+62 812-3456-7890',
          address: 'Jl. Admin Office Tower No. 100',
          city: 'Jakarta Selatan',
          province: 'DKI Jakarta',
          postalCode: '12190',
          isDefault: true,
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await kv.set(`user:${userId}`, adminProfile);

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ SuperAdmin Account Created Successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('👤 Username :', adminName);
    console.log('🆔 User ID  :', userId);
    console.log('🔑 Credentials: (hidden for security - check documentation)');
    console.log('');
    console.log('📊 Storage:');
    console.log('   - Supabase Auth:', authResult.success ? '✅' : '⚠️');
    console.log('   - KV Store: ✅');
    console.log('');
    console.log('🌐 Login URL: /login');
    console.log('🎯 Admin Dashboard: /admin');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    return { success: true, message: 'Admin created', userId: userId, profile: adminProfile };
  } catch (error) {
    console.error('❌ Error in seedAdmin:', error);
    return { success: false, error: error.message };
  }
}