/**
 * Token Top-up API
 * POST: Create checkout session for one-time token purchase
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';
import { paymentService, type Currency } from '@/lib/services/paymentService';
import { tokenService } from '@/lib/services/tokenService';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { amount, currency } = body;

    if (!amount || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, currency' },
        { status: 400 }
      );
    }

    if (!['NGN', 'USD'].includes(currency)) {
      return NextResponse.json(
        { error: 'Invalid currency' },
        { status: 400 }
      );
    }

    // Get pricing config
    const pricing = await tokenService.getPricingConfig();

    // Validate minimum amount
    const minAmount =
      currency === 'USD' ? pricing.minOnetimeUsd : pricing.minOnetimeNgn;

    if (amount < minAmount) {
      return NextResponse.json(
        {
          error: `Minimum amount is ${currency === 'USD' ? '$' : '₦'}${minAmount}`,
        },
        { status: 400 }
      );
    }

    // Calculate tokens based on amount
    const tokens = await tokenService.calculateTokensForPayment(
      amount,
      currency as Currency
    );

    if (tokens <= 0) {
      return NextResponse.json(
        { error: 'Invalid token calculation' },
        { status: 400 }
      );
    }

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const checkout = await paymentService.createCheckout({
      userId: user.id,
      email: user.email || '',
      amount,
      currency: currency as Currency,
      planType: 'one_time',
      tokens,
      paymentType: 'top_up',
      successUrl: `${baseUrl}/workspace?payment=success&type=topup`,
      cancelUrl: `${baseUrl}/workspace?payment=cancelled`,
    });

    return NextResponse.json(
      {
        data: {
          checkoutUrl: checkout.checkoutUrl,
          reference: checkout.reference,
          gateway: checkout.gateway,
          tokens,
          amount,
          currency,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('[Top-up API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create top-up checkout session' },
      { status: 500 }
    );
  }
}
