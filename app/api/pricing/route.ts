/**
 * Pricing API
 * GET: Fetch pricing configuration from database
 */

import { NextResponse } from 'next/server';
import { tokenService } from '@/lib/services/tokenService';

export async function GET() {
  try {
    // Get pricing config from database
    const pricing = await tokenService.getPricingConfig();

    // Format response for frontend
    const response = {
      basic: {
        monthly: pricing.basicPriceUsd,
        quarterly: pricing.basicPriceQuarterlyUsd,
        yearly: pricing.basicPriceYearlyUsd,
        tokens: pricing.basicTokens,
        priceNgn: {
          monthly: pricing.basicPriceNgn,
          quarterly: pricing.basicPriceQuarterlyNgn,
          yearly: pricing.basicPriceYearlyNgn,
        },
      },
      pro: {
        monthly: pricing.proPriceUsd,
        quarterly: pricing.proPriceQuarterlyUsd,
        yearly: pricing.proPriceYearlyUsd,
        tokens: pricing.proTokens,
        priceNgn: {
          monthly: pricing.proPriceNgn,
          quarterly: pricing.proPriceQuarterlyNgn,
          yearly: pricing.proPriceYearlyNgn,
        },
      },
      premium: {
        monthly: pricing.premiumPriceUsd,
        quarterly: pricing.premiumPriceQuarterlyUsd,
        yearly: pricing.premiumPriceYearlyUsd,
        tokens: pricing.premiumTokens,
        unlimited: pricing.premiumIsUnlimited,
        priceNgn: {
          monthly: pricing.premiumPriceNgn,
          quarterly: pricing.premiumPriceQuarterlyNgn,
          yearly: pricing.premiumPriceYearlyNgn,
        },
      },
    };

    return NextResponse.json({ data: response }, { status: 200 });
  } catch (error) {
    console.error('[Pricing API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing' },
      { status: 500 }
    );
  }
}
