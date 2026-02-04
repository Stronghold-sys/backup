import * as kv from './kv_store.tsx';

/**
 * Generate 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store verification code for user
 */
export async function storeVerificationCode(
  email: string,
  code: string,
  type: 'signup' | 'forgot_password',
  expiryMinutes: number = 10
): Promise<void> {
  const key = `verification:${type}:${email}`;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
  
  await kv.set(key, {
    code,
    email,
    type,
    expiresAt,
    verified: false,
    createdAt: new Date().toISOString()
  });
  
  console.log(`✅ Verification code stored for ${email} (expires in ${expiryMinutes} minutes)`);
}

/**
 * Verify code for user
 */
export async function verifyCode(
  email: string,
  code: string,
  type: 'signup' | 'forgot_password'
): Promise<{ success: boolean; error?: string }> {
  const key = `verification:${type}:${email}`;
  
  try {
    const verification = await kv.get(key);
    
    if (!verification) {
      return {
        success: false,
        error: 'Kode verifikasi tidak ditemukan atau sudah kadaluarsa'
      };
    }
    
    // Check if already verified
    if (verification.verified) {
      return {
        success: false,
        error: 'Kode verifikasi sudah pernah digunakan'
      };
    }
    
    // Check expiry
    if (new Date(verification.expiresAt) < new Date()) {
      return {
        success: false,
        error: 'Kode verifikasi sudah kadaluarsa'
      };
    }
    
    // Check code match
    if (verification.code !== code) {
      return {
        success: false,
        error: 'Kode verifikasi salah'
      };
    }
    
    // Mark as verified
    verification.verified = true;
    verification.verifiedAt = new Date().toISOString();
    await kv.set(key, verification);
    
    console.log(`✅ Verification code verified for ${email}`);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Verification error:', error);
    return {
      success: false,
      error: 'Terjadi kesalahan saat verifikasi'
    };
  }
}

/**
 * Get verification status
 */
export async function getVerificationStatus(
  email: string,
  type: 'signup' | 'forgot_password'
): Promise<{ verified: boolean; expired: boolean }> {
  const key = `verification:${type}:${email}`;
  
  try {
    const verification = await kv.get(key);
    
    if (!verification) {
      return { verified: false, expired: true };
    }
    
    const expired = new Date(verification.expiresAt) < new Date();
    
    return {
      verified: verification.verified || false,
      expired
    };
  } catch (error) {
    console.error('❌ Get verification status error:', error);
    return { verified: false, expired: true };
  }
}

/**
 * Resend verification code
 */
export async function resendVerificationCode(
  email: string,
  type: 'signup' | 'forgot_password'
): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    // Generate new code
    const newCode = generateVerificationCode();
    
    // Store new code
    await storeVerificationCode(email, newCode, type, 10);
    
    console.log(`✅ New verification code generated for ${email}`);
    
    return {
      success: true,
      code: newCode
    };
  } catch (error) {
    console.error('❌ Resend verification code error:', error);
    return {
      success: false,
      error: 'Gagal mengirim ulang kode verifikasi'
    };
  }
}

/**
 * Delete verification code (cleanup)
 */
export async function deleteVerificationCode(
  email: string,
  type: 'signup' | 'forgot_password'
): Promise<void> {
  const key = `verification:${type}:${email}`;
  await kv.del(key);
  console.log(`🗑️  Verification code deleted for ${email}`);
}
