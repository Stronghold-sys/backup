import emailjs from '@emailjs/browser';

// EmailJS Configuration - Using Environment Variables with Fallback
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_t4s2fma';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'oirVhzAWQnymJetcv';

// Template IDs
const TEMPLATE_VERIFICATION = import.meta.env.VITE_EMAILJS_TEMPLATE_VERIFICATION_ID || 'template_sobmz8o';
const TEMPLATE_FORGOT_PASSWORD = import.meta.env.VITE_EMAILJS_TEMPLATE_FORGOT_PASSWORD_ID || 'template_51z2ho7';

// Check if EmailJS is configured
const isEmailJSConfigured = !!(EMAILJS_SERVICE_ID && EMAILJS_PUBLIC_KEY && TEMPLATE_VERIFICATION && TEMPLATE_FORGOT_PASSWORD);

// Initialize EmailJS
if (isEmailJSConfigured) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
  console.info('✅ EmailJS initialized successfully!');
  console.info('📧 Service ID:', EMAILJS_SERVICE_ID);
  console.info('🎯 Ready to send real emails!');
} else {
  console.warn('');
  console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.warn('⚠️  EmailJS Not Configured - Using Demo Mode');
  console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.warn('');
  console.warn('📧 Email verification is disabled (demo mode)');
  console.warn('✅ Users can still register and use the app!');
  console.warn('📝 Verification code will be shown in console instead');
  console.warn('');
  console.warn('💡 TO ENABLE REAL EMAILS:');
  console.warn('1. Create FREE EmailJS account: https://dashboard.emailjs.com/sign-up');
  console.warn('2. Create .env.local file in project root');
  console.warn('3. Add your EmailJS credentials (see .env.local.example)');
  console.warn('4. Restart server');
  console.warn('');
  console.warn('📖 Full guide: /EMAILJS_SETUP_GUIDE.md');
  console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.warn('');
}

/**
 * Generate 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send verification email for new user registration
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationCode: string,
  voucherCode: string,
  voucherDiscount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate EmailJS is configured
    if (!EMAILJS_SERVICE_ID || !EMAILJS_PUBLIC_KEY || !TEMPLATE_VERIFICATION) {
      const errorMsg = 'EmailJS belum dikonfigurasi. Silakan hubungi administrator.';
      console.error('❌ EmailJS Configuration Error:', {
        hasServiceId: !!EMAILJS_SERVICE_ID,
        hasPublicKey: !!EMAILJS_PUBLIC_KEY,
        hasTemplate: !!TEMPLATE_VERIFICATION
      });
      return { 
        success: false, 
        error: errorMsg
      };
    }

    console.info('📧 Sending verification email to:', email);
    console.info('📧 Using Service ID:', EMAILJS_SERVICE_ID);
    console.info('📧 Using Template ID:', TEMPLATE_VERIFICATION);

    const templateParams = {
      to_email: email,       // Destination email
      reply_to: email,       // Reply to email (required by EmailJS)
      to_name: name,
      verification_code: verificationCode,
      voucher_code: voucherCode,
      voucher_discount: voucherDiscount,
    };

    console.info('📧 Template params:', {
      ...templateParams,
      verification_code: '******' // Hide sensitive data in logs
    });

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      TEMPLATE_VERIFICATION,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.info('✅ Verification email sent successfully:', response);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to send verification email:', error);
    return { success: false, error: error.text || error.message };
  }
}

/**
 * Send forgot password email with verification code
 */
export async function sendForgotPasswordEmail(
  email: string,
  name: string,
  verificationCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate EmailJS is configured
    if (!EMAILJS_SERVICE_ID || !EMAILJS_PUBLIC_KEY || !TEMPLATE_FORGOT_PASSWORD) {
      const errorMsg = 'EmailJS belum dikonfigurasi. Silakan hubungi administrator.';
      console.error('❌ EmailJS Configuration Error:', {
        hasServiceId: !!EMAILJS_SERVICE_ID,
        hasPublicKey: !!EMAILJS_PUBLIC_KEY,
        hasTemplate: !!TEMPLATE_FORGOT_PASSWORD
      });
      return { 
        success: false, 
        error: errorMsg
      };
    }

    console.info('📧 Sending forgot password email to:', email);
    console.info('📧 Using Service ID:', EMAILJS_SERVICE_ID);
    console.info('📧 Using Template ID:', TEMPLATE_FORGOT_PASSWORD);

    const templateParams = {
      to_email: email,       // Destination email
      reply_to: email,       // Reply to email (required by EmailJS)
      to_name: name,
      verification_code: verificationCode,
    };

    console.info('📧 Template params:', {
      ...templateParams,
      verification_code: '******' // Hide sensitive data in logs
    });

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      TEMPLATE_FORGOT_PASSWORD,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.info('✅ Forgot password email sent successfully:', response);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to send forgot password email:', error);
    return { success: false, error: error.text || error.message };
  }
}

/**
 * Validate verification code format
 */
export function isValidVerificationCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}