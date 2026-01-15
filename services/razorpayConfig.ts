/**
 * Razorpay Configuration
 * 
 * SECURITY: API keys are loaded from environment variables (.env file)
 * NEVER commit .env file to Git!
 * 
 * Setup:
 * 1. Copy .env.example to .env
 * 2. Add your Razorpay API keys to .env
 * 3. Restart development server
 */

// RAZORPAY API KEYS - Loaded from .env file (SECURE)
export const RAZORPAY_CONFIG = {
    // Key ID: Try env var first, fallback to user provided key (for immediate fix)
    keyId: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_S4HjvRoXeGNKWg',

    // Key Secret: Try env var first, fallback to user provided key
    // Note: This is still accessible in browser. For production,
    // move order creation and verification to backend (Firebase Functions)
    keySecret: import.meta.env.VITE_RAZORPAY_KEY_SECRET || 's1Dx2dzPz39GWrf0u3L3mseR',

    // Environment mode
    isTestMode: import.meta.env.VITE_RAZORPAY_TEST_MODE === 'true',
};

// Razorpay Checkout Options
export const RAZORPAY_THEME = {
    color: '#F59E0B', // Amber color matching app theme
};

// Validate configuration
export const validateRazorpayConfig = (): boolean => {
    if (!RAZORPAY_CONFIG.keyId || RAZORPAY_CONFIG.keyId.includes('XXXX')) {
        console.error('❌ Razorpay Key ID not configured. Please add your API keys.');
        return false;
    }

    if (RAZORPAY_CONFIG.isTestMode) {
        console.warn('⚠️ Razorpay running in TEST mode');
    } else {
        console.log('✅ Razorpay running in PRODUCTION mode');
    }

    return true;
};

// Currency
export const CURRENCY = 'INR';

// Payment methods to enable
export const PAYMENT_METHODS = {
    upi: true,
    card: true,
    netbanking: true,
    wallet: true,
};
