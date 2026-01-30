/**
 * Subscription API
 * GET: Fetch user's current subscription
 * POST: Create checkout session for new subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';
import { subscriptionService } from '@/lib/services/subscriptionService';
import { paymentService, type Currency, type BillingCycle } from '@/lib/services/paymentService';
import { tokenService } from '@/lib/services/tokenService';

/**
 * GET: Fetch current subscription
 */
export async function GET() {
  try {
    const user = await requireAuth();

    // Get active subscription
    const subscription = await subscriptionService.getActiveSubscription(
      user.id
    );

    // Get token balance
    const balance = await tokenService.getUserTokenBalance(user.id);

    return NextResponse.json(
      {
        data: {
          subscription,
          balance: balance.tokens,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('[Subscription API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create checkout session
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();

    // Validate request body
    const { planType, billingCycle, currency } = body;

    if (!planType || !billingCycle || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields: planType, billingCycle, currency' },
        { status: 400 }
      );
    }

    if (!['basic', 'pro', 'premium'].includes(planType)) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    if (!['monthly', 'quarterly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Invalid billing cycle' },
        { status: 400 }
      );
    }

    if (!['NGN', 'USD'].includes(currency)) {
      return NextResponse.json(
        { error: 'Invalid currency' },
        { status: 400 }
      );
    }

    // Get pricing for plan
    const price = await tokenService.getPriceForPlan(
      planType,
      billingCycle,
      currency as Currency
    );

    // Get token allocation
    const tokens = await tokenService.getTokenAllocationForPlan(
      planType,
      billingCycle
    );

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const checkout = await paymentService.createCheckout({
      userId: user.id,
      email: user.email || '',
      amount: price,
      currency: currency as Currency,
      planType,
      billingCycle: billingCycle as BillingCycle,
      tokens,
      paymentType: 'subscription',
      successUrl: `${baseUrl}/workspace?payment=success`,
      cancelUrl: `${baseUrl}/pricing?payment=cancelled`,
    });

    return NextResponse.json(
      {
        data: {
          checkoutUrl: checkout.checkoutUrl,
          reference: checkout.reference,
          gateway: checkout.gateway,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('[Subscription API] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
