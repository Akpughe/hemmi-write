/**
 * Stripe Webhook Handler
 * Processes payment events from Stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripeService } from '@/lib/services/stripeService';
import { subscriptionService } from '@/lib/services/subscriptionService';
import { referralService } from '@/lib/services/referralService';
import type { Currency } from '@/lib/services/paymentService';

export async function POST(request: NextRequest) {
  try {
    // Get raw body and signature for verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Stripe Webhook] Missing signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Verify webhook signature
    const event = stripeService.verifyWebhookSignature(body, signature);

    console.log('[Stripe Webhook] Event received:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event as unknown as { data: { object: Record<string, unknown> } });
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event as unknown as { data: { object: Record<string, unknown> } });
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event as unknown as { data: { object: Record<string, unknown> } });
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event as unknown as { data: { object: Record<string, unknown> } });
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event as unknown as { data: { object: Record<string, unknown> } });
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event as unknown as { data: { object: Record<string, unknown> } });
        break;

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    // Return 200 even on error to prevent Stripe from retrying
    return NextResponse.json(
      { error: 'Webhook processing error' },
      { status: 200 }
    );
  }
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutSessionCompleted(event: { data: { object: Record<string, unknown> } }) {
  const session = event.data.object as {
    id: string;
    client_reference_id: string | null;
    customer: string | null;
    customer_email: string | null;
    amount_total: number | null;
    currency: string | null;
    payment_status: string;
    mode: string;
    subscription: string | null;
    metadata: {
      userId: string;
      planType: string;
      billingCycle?: string;
      tokens: string;
      paymentType: 'subscription' | 'one_time' | 'top_up';
    } | null;
  };

  if (session.payment_status !== 'paid') {
    console.log('[Stripe Webhook] Payment not completed:', session.id);
    return;
  }

  if (!session.metadata) {
    console.error('[Stripe Webhook] Missing metadata in session:', session.id);
    return;
  }

  try {
    const userId = session.metadata.userId || session.client_reference_id;
    if (!userId) {
      throw new Error('Missing userId in session metadata');
    }

    const amountPaid = stripeService.convertFromSubunits(
      session.amount_total || 0
    );
    const tokens = parseInt(session.metadata.tokens);

    if (session.mode === 'subscription' && session.metadata.paymentType === 'subscription') {
      // Create subscription
      try {
        await subscriptionService.createSubscription({
          userId,
          planType: session.metadata.planType,
          billingCycle: (session.metadata.billingCycle as 'monthly' | 'quarterly' | 'yearly') || 'monthly',
          currency: 'USD',
          amountPaid,
          paymentGateway: 'stripe',
          gatewaySubscriptionId: session.subscription as string,
          gatewayCustomerId: session.customer as string,
          transactionId: session.id,
        });

        console.log('[Stripe Webhook] Subscription created for user:', userId);

        // Record referral conversion (first payment)
        try {
          const converted = await referralService.recordReferralConversion(userId, 'USD');
          if (converted) {
            console.log('[Stripe Webhook] Referral conversion recorded for user:', userId);
          }
        } catch (refError) {
          console.error('[Stripe Webhook] Referral conversion error:', refError);
        }
      } catch (subError: unknown) {
        // Handle duplicate key constraint error (race condition with multiple webhook calls)
        const error = subError as { code?: string; message?: string };
        if (error.code === '23505') {
          console.log('[Stripe Webhook] Subscription already exists for user (duplicate webhook), skipping:', userId);
          // This is not an error - subscription was already created by another webhook event
          return;
        }
        throw subError;
      }
    } else {
      // One-time payment or top-up
      const result = await subscriptionService.addTokens(
        userId,
        tokens,
        amountPaid,
        'USD',
        'stripe',
        session.id
      );

      if (!result.success) {
        console.error('[Stripe Webhook] Failed to add tokens for user:', userId,
          'Error:', result.error);
        throw new Error(`Failed to add tokens: ${result.error}`);
      }

      console.log('[Stripe Webhook] Tokens added successfully for user:', userId,
        'Tokens:', tokens, 'Subscription:', result.subscriptionId);
    }
  } catch (error) {
    console.error('[Stripe Webhook] Handle checkout session error:', error);
    throw error;
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(event: { data: { object: Record<string, unknown> } }) {
  const subscription = event.data.object as { id: string; customer: string; status: string; current_period_end: number; metadata: Record<string, string> };
  console.log('[Stripe Webhook] Subscription created:', subscription.id);
  // Subscription details are already handled in checkout.session.completed
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(event: { data: { object: Record<string, unknown> } }) {
  const subscription = event.data.object as { id: string; customer: string; status: string; current_period_end: number; cancel_at_period_end: boolean; metadata: Record<string, string> };
  console.log('[Stripe Webhook] Subscription updated:', subscription.id, 'Status:', subscription.status);

  try {
    // If subscription is set to cancel at period end, update our database
    if (subscription.cancel_at_period_end) {
      console.log('[Stripe Webhook] Subscription will cancel at period end:', subscription.id);
      // We don't cancel yet - just log. The actual cancellation happens when subscription.deleted fires
    }

    // Handle status changes
    if (subscription.status === 'past_due') {
      const localSub = await subscriptionService.getSubscriptionByGatewayId(subscription.id);
      if (localSub) {
        await subscriptionService.markSubscriptionPastDue(localSub.id);
        console.log('[Stripe Webhook] Marked subscription as past_due:', subscription.id);
      }
    }
  } catch (error) {
    console.error('[Stripe Webhook] Handle subscription updated error:', error);
  }
}

/**
 * Handle subscription deleted/cancelled
 */
async function handleSubscriptionDeleted(event: { data: { object: Record<string, unknown> } }) {
  const subscription = event.data.object as { id: string; customer: string; status: string; metadata: Record<string, string> };
  console.log('[Stripe Webhook] Subscription deleted:', subscription.id);

  try {
    await subscriptionService.cancelSubscriptionByGatewayId(subscription.id);
    console.log('[Stripe Webhook] Subscription cancelled in database:', subscription.id);
  } catch (error) {
    console.error('[Stripe Webhook] Handle subscription deleted error:', error);
  }
}

/**
 * Handle successful invoice payment (renewal)
 */
async function handleInvoicePaymentSucceeded(event: { data: { object: Record<string, unknown> } }) {
  const invoice = event.data.object as { id: string; customer: string; subscription: string | null; amount_paid: number; currency: string; billing_reason: string; metadata: Record<string, string> };
  console.log('[Stripe Webhook] Invoice payment succeeded:', invoice.id, 'Reason:', invoice.billing_reason);

  try {
    // If this is a subscription renewal
    if (invoice.billing_reason === 'subscription_cycle' && invoice.subscription) {
      console.log('[Stripe Webhook] Renewing subscription:', invoice.subscription);

      const subscription = await subscriptionService.getSubscriptionByGatewayId(invoice.subscription);
      if (subscription) {
        await subscriptionService.renewSubscription(subscription.id);
        console.log('[Stripe Webhook] Subscription renewed successfully:', subscription.id);
      } else {
        console.warn('[Stripe Webhook] Subscription not found for renewal:', invoice.subscription);
      }
    }
  } catch (error) {
    console.error('[Stripe Webhook] Handle invoice payment succeeded error:', error);
  }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(event: { data: { object: Record<string, unknown> } }) {
  const invoice = event.data.object as { id: string; customer: string; subscription: string | null; amount_due: number; currency: string; attempt_count: number; metadata: Record<string, string> };
  console.log('[Stripe Webhook] Invoice payment failed:', invoice.id, 'Attempt:', invoice.attempt_count);

  try {
    // Mark subscription as past_due
    if (invoice.subscription) {
      console.log('[Stripe Webhook] Marking subscription as past_due:', invoice.subscription);

      const subscription = await subscriptionService.getSubscriptionByGatewayId(invoice.subscription);
      if (subscription) {
        await subscriptionService.markSubscriptionPastDue(subscription.id);
        console.log('[Stripe Webhook] Subscription marked as past_due:', subscription.id);
      } else {
        console.warn('[Stripe Webhook] Subscription not found for past_due marking:', invoice.subscription);
      }
    }
  } catch (error) {
    console.error('[Stripe Webhook] Handle invoice payment failed error:', error);
  }
}
