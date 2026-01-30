/**
 * Location API
 * GET: Detect user's currency based on IP location
 */

import { NextResponse } from 'next/server';
import { NGN_PRICING_ENABLED } from '@/lib/utils/pricing';

export async function GET() {
  // If NGN pricing is disabled, always return USD without calling external API
  if (!NGN_PRICING_ENABLED) {
    return NextResponse.json(
      {
        currency: 'USD',
        detected: true,
      },
      { status: 200 }
    );
  }

  try {
    // geolocation-db.com free endpoint (no key required)
    // Example:
    // {"country_code":"US","country_name":"United States", ...}
    const response = await fetch('https://geolocation-db.com/json/');

    if (!response.ok) {
      return NextResponse.json(
        {
          currency: 'USD',
          detected: false,
        },
        { status: 200 }
      );
    }

    const data = (await response.json().catch(() => ({}))) as {
      country_code?: string;
    };

    const currency = data?.country_code === 'NG' ? 'NGN' : 'USD';

    return NextResponse.json(
      {
        currency,
        detected: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Location API] Error:', error);
    // Return USD as fallback
    return NextResponse.json(
      {
        currency: 'USD',
        detected: false,
      },
      { status: 200 }
    );
  }
}
