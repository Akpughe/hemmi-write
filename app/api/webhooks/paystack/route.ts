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

      case 'charge.failed':
        await handleChargeFailed(event);
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

  console.log('[Paystack Webhook] Processing charge.success for user:', metadata.userId,
    'Type:', metadata.paymentType, 'Reference:', data.reference);

  try {
    // Convert amount from kobo/cents to major units
    const amountPaid = paystackService.convertFromSubunits(
      data.amount,
      data.currency as Currency
    );

    if (metadata.paymentType === 'subscription') {
      // Create new subscription with duplicate handling
      try {
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
      } catch (subError: unknown) {
        // Handle duplicate key constraint error (race condition with multiple webhook calls)
        const error = subError as { code?: string; message?: string };
        if (error.code === '23505') {
          console.log('[Paystack Webhook] Subscription already exists for user (duplicate webhook), skipping:', metadata.userId);
          // This is not an error - subscription was already created by another webhook event
          return;
        }
        throw subError;
      }
    } else if (
      metadata.paymentType === 'one_time' ||
      metadata.paymentType === 'top_up'
    ) {
      // Add tokens to existing subscription or create one-time purchase
      const result = await subscriptionService.addTokens(
        metadata.userId,
        metadata.tokens,
        amountPaid,
        data.currency as Currency,
        'paystack',
        data.reference
      );

      if (!result.success) {
        console.error('[Paystack Webhook] Failed to add tokens for user:', metadata.userId,
          'Error:', result.error);
        throw new Error(`Failed to add tokens: ${result.error}`);
      }

      console.log(
        '[Paystack Webhook] Tokens added successfully for user:',
        metadata.userId,
        'Tokens:', metadata.tokens,
        'Subscription:', result.subscriptionId
      );
    }
  } catch (error) {
    console.error('[Paystack Webhook] Handle charge success error:', error);
    throw error;
  }
}

/**
 * Handle failed charge
 */
async function handleChargeFailed(event: {
  data: {
    id: number;
    reference: string;
    amount: number;
    currency: string;
    gateway_response: string;
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

  console.log('[Paystack Webhook] Processing charge.failed for user:', metadata.userId,
    'Reference:', data.reference, 'Reason:', data.gateway_response);

  try {
    // Record failed payment in payment history for tracking
    const { createServiceRoleSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = await createServiceRoleSupabaseClient();

    const amountAttempted = paystackService.convertFromSubunits(
      data.amount,
      data.currency as Currency
    );

    // subscription_id is nullable in DB but types require it - use type assertion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('payment_history') as any).insert({
      user_id: metadata.userId,
      transaction_id: data.reference,
      payment_gateway: 'paystack',
      amount: amountAttempted,
      currency: data.currency,
      tokens_purchased: metadata.tokens || 0,
      payment_type: metadata.paymentType || 'top_up',
      status: 'failed',
      failure_reason: data.gateway_response,
      gateway_response: { raw_response: data.gateway_response },
    });

    console.log('[Paystack Webhook] Failed payment recorded for user:', metadata.userId);
  } catch (error) {
    console.error('[Paystack Webhook] Handle charge failed error:', error);
    // Don't throw - we want to acknowledge the webhook even if logging fails
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
    // Mark subscription as cancelled - it won't auto-renew
    await subscriptionService.cancelSubscriptionByGatewayId(data.subscription_code);
    console.log('[Paystack Webhook] Subscription marked as cancelled:', data.subscription_code);
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
    await subscriptionService.cancelSubscriptionByGatewayId(data.subscription_code);
    console.log('[Paystack Webhook] Subscription cancelled in database:', data.subscription_code);
  } catch (error) {
    console.error('[Paystack Webhook] Handle subscription disable error:', error);
  }
}
