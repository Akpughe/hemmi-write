/**
 * Currency Detection Utility
 * Detects user's currency based on IP geolocation
 */

export type Currency = 'NGN' | 'USD';

interface GeoLocationResponse {
  country?: string;
  countryCode?: string;
  currency?: string;
}

/**
 * Detect user's currency based on IP location
 * Uses ip-api.com free tier (no API key required)
 */
export async function detectCurrencyFromIP(): Promise<Currency> {
  try {
    // Use ip-api.com free API (no key required, 45 requests/minute)
    const response = await fetch('http://ip-api.com/json/?fields=countryCode,currency');

    if (!response.ok) {
      console.warn('[CurrencyDetection] Geolocation API failed');
      return 'USD'; // Default fallback
    }

    const data: GeoLocationResponse = await response.json();

    // Nigerian users get NGN
    if (data.countryCode === 'NG') {
      return 'NGN';
    }

    // Check if currency is NGN from API
    if (data.currency === 'NGN') {
      return 'NGN';
    }

    // Default to USD for all other countries
    return 'USD';
  } catch (error) {
    console.error('[CurrencyDetection] Error:', error);
    return 'USD'; // Fallback to USD on error
  }
}

/**
 * Detect currency from browser (client-side only)
 * Uses navigator.language as fallback
 */
export function detectCurrencyFromBrowser(): Currency {
  if (typeof window === 'undefined') {
    return 'USD';
  }

  try {
    // Check browser language/region
    const language = navigator.language || 'en-US';

    // Nigerian locale
    if (language.startsWith('en-NG') || language.startsWith('yo-NG') || language.startsWith('ig-NG')) {
      return 'NGN';
    }

    // Try to get timezone (rough approximation)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone === 'Africa/Lagos') {
      return 'NGN';
    }

    return 'USD';
  } catch (error) {
    console.error('[CurrencyDetection] Browser detection error:', error);
    return 'USD';
  }
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
  return currency === 'NGN' ? '₦' : '$';
}

/**
 * Format amount with currency
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString()}`;
}

/**
 * Convert between currencies (simple estimation)
 * For production, use a real-time exchange rate API
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): number {
  if (from === to) return amount;

  // Simple conversion rate: 1 USD ≈ 1500 NGN
  // TODO: Replace with real-time exchange rate API
  const USD_TO_NGN_RATE = 1500;

  if (from === 'USD' && to === 'NGN') {
    return amount * USD_TO_NGN_RATE;
  } else if (from === 'NGN' && to === 'USD') {
    return amount / USD_TO_NGN_RATE;
  }

  return amount;
}
