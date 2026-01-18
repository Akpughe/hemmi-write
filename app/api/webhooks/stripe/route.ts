/**
 * Stripe Webhook Handler
 * Processes payment events from Stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripeService } from '@/lib/services/stripeService';
import { subscriptionService } from '@/lib/services/subscriptionService';
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
        await handleCheckoutSessionCompleted(event);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
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
async function handleCheckoutSessionCompleted(event: {
  data: {
    object: {
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
  };
}) {
  const session = event.data.object;

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
    } else {
      // One-time payment or top-up
      await subscriptionService.addTokens(
        userId,
        tokens,
        amountPaid,
        'USD',
        'stripe',
        session.id
      );

      console.log('[Stripe Webhook] Tokens added for user:', userId, 'Amount:', tokens);
    }
  } catch (error) {
    console.error('[Stripe Webhook] Handle checkout session error:', error);
    throw error;
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(event: {
  data: {
    object: {
      id: string;
      customer: string;
      status: string;
      current_period_end: number;
      metadata: Record<string, string>;
    };
  };
}) {
  const subscription = event.data.object;
  console.log('[Stripe Webhook] Subscription created:', subscription.id);
  // Subscription details are already handled in checkout.session.completed
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(event: {
  data: {
    object: {
      id: string;
      customer: string;
      status: string;
      current_period_end: number;
      cancel_at_period_end: boolean;
      metadata: Record<string, string>;
    };
  };
}) {
  const subscription = event.data.object;
  console.log('[Stripe Webhook] Subscription updated:', subscription.id);

  try {
    // If subscription is set to cancel at period end, update our database
    if (subscription.cancel_at_period_end) {
      // Find and update subscription in our database
      // This would require a query - for now we log it
      console.log('[Stripe Webhook] Subscription will cancel at period end:', subscription.id);
    }
  } catch (error) {
    console.error('[Stripe Webhook] Handle subscription updated error:', error);
  }
}

/**
 * Handle subscription deleted/cancelled
 */
async function handleSubscriptionDeleted(event: {
  data: {
    object: {
      id: string;
      customer: string;
      status: string;
      metadata: Record<string, string>;
    };
  };
}) {
  const subscription = event.data.object;
  console.log('[Stripe Webhook] Subscription deleted:', subscription.id);

  try {
    // Find subscription by gateway ID and mark as cancelled
    // This would require a query to find the subscription
    // For now, we log it - the cron job will handle expiry
  } catch (error) {
    console.error('[Stripe Webhook] Handle subscription deleted error:', error);
  }
}

/**
 * Handle successful invoice payment (renewal)
 */
async function handleInvoicePaymentSucceeded(event: {
  data: {
    object: {
      id: string;
      customer: string;
      subscription: string | null;
      amount_paid: number;
      currency: string;
      billing_reason: string;
      metadata: Record<string, string>;
    };
  };
}) {
  const invoice = event.data.object;
  console.log('[Stripe Webhook] Invoice payment succeeded:', invoice.id);

  try {
    // If this is a subscription renewal
    if (invoice.billing_reason === 'subscription_cycle' && invoice.subscription) {
      // Find subscription by gateway ID and renew it
      // This would require a query to find the subscription ID
      console.log('[Stripe Webhook] Renewing subscription:', invoice.subscription);

      // TODO: Implement subscription renewal by gateway_subscription_id
      // const subscription = await findSubscriptionByGatewayId(invoice.subscription);
      // if (subscription) {
      //   await subscriptionService.renewSubscription(subscription.id);
      // }
    }
  } catch (error) {
    console.error('[Stripe Webhook] Handle invoice payment succeeded error:', error);
  }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(event: {
  data: {
    object: {
      id: string;
      customer: string;
      subscription: string | null;
      amount_due: number;
      currency: string;
      attempt_count: number;
      metadata: Record<string, string>;
    };
  };
}) {
  const invoice = event.data.object;
  console.log('[Stripe Webhook] Invoice payment failed:', invoice.id);

  try {
    // Mark subscription as past_due
    if (invoice.subscription) {
      // Find subscription by gateway ID and mark as past_due
      console.log('[Stripe Webhook] Marking subscription as past_due:', invoice.subscription);

      // TODO: Implement marking subscription as past_due
    }
  } catch (error) {
    console.error('[Stripe Webhook] Handle invoice payment failed error:', error);
  }
}
