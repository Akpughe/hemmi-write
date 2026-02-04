/**
 * Referral Tracking Utility
 * Handles storing and retrieving referral codes from localStorage/cookies
 * with 14-day expiry
 */

const REFERRAL_STORAGE_KEY = 'hemmi_referral';
const REFERRAL_COOKIE_NAME = 'hemmi_ref';
const REFERRAL_EXPIRY_DAYS = 14;

interface StoredReferral {
  code: string;
  expiresAt: string;
}

/**
 * Store a referral code in localStorage and cookie
 */
export function storeReferralCode(code: string): void {
  if (typeof window === 'undefined') return;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFERRAL_EXPIRY_DAYS);

  const data: StoredReferral = {
    code,
    expiresAt: expiresAt.toISOString(),
  };

  // Store in localStorage
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[ReferralTracking] Failed to store in localStorage:', e);
  }

  // Also store in cookie as backup
  try {
    document.cookie = `${REFERRAL_COOKIE_NAME}=${code}; expires=${expiresAt.toUTCString()}; path=/; SameSite=Lax`;
  } catch (e) {
    console.error('[ReferralTracking] Failed to store cookie:', e);
  }
}

/**
 * Get stored referral code if not expired
 */
export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;

  // Try localStorage first
  try {
    const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (stored) {
      const data: StoredReferral = JSON.parse(stored);
      const expiresAt = new Date(data.expiresAt);

      if (expiresAt > new Date()) {
        return data.code;
      } else {
        // Expired, clean up
        clearReferralCode();
      }
    }
  } catch (e) {
    console.error('[ReferralTracking] Failed to read localStorage:', e);
  }

  // Fallback to cookie
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === REFERRAL_COOKIE_NAME && value) {
        return value;
      }
    }
  } catch (e) {
    console.error('[ReferralTracking] Failed to read cookie:', e);
  }

  return null;
}

/**
 * Clear stored referral code
 */
export function clearReferralCode(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch (e) {
    console.error('[ReferralTracking] Failed to clear localStorage:', e);
  }

  try {
    document.cookie = `${REFERRAL_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  } catch (e) {
    console.error('[ReferralTracking] Failed to clear cookie:', e);
  }
}

/**
 * Check URL for referral code and store it
 * Call this on app initialization or route changes
 */
export function checkAndStoreReferralFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');

  if (refCode) {
    storeReferralCode(refCode);
    return refCode;
  }

  return null;
}

/**
 * Get referral code from URL or storage
 */
export function getReferralCode(): string | null {
  // First check URL
  const urlCode = checkAndStoreReferralFromUrl();
  if (urlCode) return urlCode;

  // Then check storage
  return getStoredReferralCode();
}
