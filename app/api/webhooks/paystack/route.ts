/**
 * Paystack Webhook Handler
 * Processes payment events from Paystack
 */

import { NextRequest, NextResponse } from 'next/server';
import { paystackService } from '@/lib/services/paystackService';
import { subscriptionService } from '@/lib/services/subscriptionService';
import type { Currency } from '@/lib/services/paymentService';

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      console.error('[Paystack Webhook] Missing signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Verify webhook signature
    const isValid = paystackService.verifyWebhookSignature(body, signature);

    if (!isValid) {
      console.error('[Paystack Webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse event
    const event = paystackService.parseWebhookEvent(body);

    console.log('[Paystack Webhook] Event received:', event.event);

    // Handle different event types
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event);
        break;

      case 'subscription.create':
        await handleSubscriptionCreate(event);
        break;

      case 'subscription.not_renew':
        await handleSubscriptionNotRenew(event);
        break;

      case 'subscription.disable':
        await handleSubscriptionDisable(event);
        break;

      default:
        console.log(
          '[Paystack Webhook] Unhandled event type:',
          event.event
        );
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[Paystack Webhook] Error:', error);
    // Return 200 even on error to prevent Paystack from retrying
    return NextResponse.json(
      { error: 'Webhook processing error' },
      { status: 200 }
    );
  }
}

/**
 * Handle successful charge
 */
async function handleChargeSuccess(event: {
  data: {
    id: number;
    reference: string;
    amount: number;
    currency: string;
    metadata: {
      userId: string;
      planType: string;
      billingCycle?: string;
      tokens: number;
      paymentType: 'subscription' | 'one_time' | 'top_up';
      [key: string]: unknown;
    };
    customer: {
      id: number;
      customer_code: string;
      email: string;
    };
  };
}) {
  const { data } = event;
  const { metadata } = data;

  try {
    // Convert amount from kobo/cents to major units
    const amountPaid = paystackService.convertFromSubunits(
      data.amount,
      data.currency as Currency
    );

    if (metadata.paymentType === 'subscription') {
      // Create new subscription
      await subscriptionService.createSubscription({
        userId: metadata.userId,
        planType: metadata.planType,
        billingCycle: (metadata.billingCycle as 'monthly' | 'quarterly' | 'yearly') || 'monthly',
        currency: data.currency as Currency,
        amountPaid,
        paymentGateway: 'paystack',
        gatewayCustomerId: data.customer.customer_code,
        transactionId: data.reference,
      });

      console.log(
        '[Paystack Webhook] Subscription created for user:',
        metadata.userId
      );
    } else if (
      metadata.paymentType === 'one_time' ||
      metadata.paymentType === 'top_up'
    ) {
      // Add tokens to existing subscription or create one-time purchase
      await subscriptionService.addTokens(
        metadata.userId,
        metadata.tokens,
        amountPaid,
        data.currency as Currency,
        'paystack',
        data.reference
      );

      console.log(
        '[Paystack Webhook] Tokens added for user:',
        metadata.userId,
        'Amount:',
        metadata.tokens
      );
    }
  } catch (error) {
    console.error('[Paystack Webhook] Handle charge success error:', error);
    throw error;
  }
}

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreate(event: { data: Record<string, unknown> }) {
  const data = event.data as {
    subscription_code: string;
    customer: {
      customer_code: string;
      email: string;
    };
    plan: {
      name: string;
      amount: number;
      interval: string;
    };
  };
  console.log('[Paystack Webhook] Subscription created:', data.subscription_code);
  // Subscription details are already handled in charge.success
}

/**
 * Handle subscription not renewing
 */
async function handleSubscriptionNotRenew(event: { data: Record<string, unknown> }) {
  const data = event.data as {
    subscription_code: string;
    customer: {
      customer_code: string;
      email: string;
    };
  };
  console.log(
    '[Paystack Webhook] Subscription not renewing:',
    data.subscription_code
  );

  try {
    // Find subscription by gateway ID and mark as cancelled
    // This would require a query to find the subscription
    // For now, we log it - the cron job will handle expiry
  } catch (error) {
    console.error('[Paystack Webhook] Handle subscription not renew error:', error);
  }
}

/**
 * Handle subscription disabled/cancelled
 */
async function handleSubscriptionDisable(event: { data: Record<string, unknown> }) {
  const data = event.data as {
    subscription_code: string;
    customer: {
      customer_code: string;
      email: string;
    };
  };
  console.log(
    '[Paystack Webhook] Subscription disabled:',
    data.subscription_code
  );

  try {
    // Find subscription by gateway ID and mark as cancelled
    // This would require a query to find the subscription
    // For now, we log it
  } catch (error) {
    console.error('[Paystack Webhook] Handle subscription disable error:', error);
  }
}
