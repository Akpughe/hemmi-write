/**
 * Unified Payment Service
 * Routes payments to appropriate gateway (Paystack or Stripe)
 * Provides abstraction layer for payment operations
 */

import { paystackService } from './paystackService';
import { stripeService } from './stripeService';

export type PaymentGateway = 'paystack' | 'stripe';
export type Currency = 'NGN' | 'USD';
export type PaymentType = 'subscription' | 'one_time' | 'top_up';
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

interface CheckoutParams {
  userId: string;
  email: string;
  amount: number; // In major units (dollars/naira)
  currency: Currency;
  planType: string;
  billingCycle?: BillingCycle;
  tokens: number;
  paymentType: PaymentType;
  successUrl?: string;
  cancelUrl?: string;
}

interface CheckoutResult {
  gateway: PaymentGateway;
  checkoutUrl: string;
  reference: string;
  sessionId?: string; // For Stripe
  accessCode?: string; // For Paystack
}

class PaymentService {
  /**
   * Determine which payment gateway to use based on currency and preferences
   */
  private selectGateway(currency: Currency): PaymentGateway {
    // Strategy:
    // 1. NGN payments → Prefer Paystack (better NGN support)
    // 2. USD payments → Check user location/preference
    //    - Nigerian users with Paystack → Use Paystack USD
    //    - International users → Use Stripe

    // For now, simple routing:
    // NGN → Paystack
    // USD → Stripe (unless Paystack is preferred)

    if (currency === 'NGN') {
      if (!paystackService.isAvailable()) {
        throw new Error('Paystack not configured for NGN payments');
      }
      return 'paystack';
    }

    // USD: Prefer Stripe, fallback to Paystack
    if (stripeService.isAvailable()) {
      return 'stripe';
    }

    if (paystackService.isAvailable()) {
      return 'paystack';
    }

    throw new Error('No payment gateway available for USD payments');
  }

  /**
   * Create a checkout session
   */
  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const gateway = this.selectGateway(params.currency);

    try {
      if (gateway === 'paystack') {
        return await this.createPaystackCheckout(params);
      } else {
        return await this.createStripeCheckout(params);
      }
    } catch (error) {
      console.error('[PaymentService] Create checkout error:', error);
      throw error;
    }
  }

  /**
   * Create Paystack checkout
   */
  private async createPaystackCheckout(
    params: CheckoutParams
  ): Promise<CheckoutResult> {
    // Generate unique reference
    const reference = this.generateReference(params.userId, 'paystack');

    // Convert amount to kobo/cents
    const amountInSubunits = paystackService.convertToSubunits(
      params.amount,
      params.currency
    );

    // Initialize transaction
    const response = await paystackService.initializeTransaction({
      email: params.email,
      amount: amountInSubunits,
      currency: params.currency,
      reference,
      metadata: {
        userId: params.userId,
        planType: params.planType,
        billingCycle: params.billingCycle,
        tokens: params.tokens,
        paymentType: params.paymentType,
      },
      callbackUrl: params.successUrl,
    });

    return {
      gateway: 'paystack',
      checkoutUrl: response.data.authorization_url,
      reference: response.data.reference,
      accessCode: response.data.access_code,
    };
  }

  /**
   * Create Stripe checkout
   */
  private async createStripeCheckout(
    params: CheckoutParams
  ): Promise<CheckoutResult> {
    // Generate unique reference for tracking
    const reference = this.generateReference(params.userId, 'stripe');

    // Default URLs if not provided
    const successUrl =
      params.successUrl ||
      `${process.env.NEXT_PUBLIC_APP_URL}/workspace?payment=success`;
    const cancelUrl =
      params.cancelUrl ||
      `${process.env.NEXT_PUBLIC_APP_URL}/pricing?payment=cancelled`;

    // Create Stripe checkout session
    const session = await stripeService.createCheckoutSession({
      userId: params.userId,
      email: params.email,
      amount: params.amount,
      currency: 'USD', // Stripe only handles USD in our setup
      planType: params.planType,
      billingCycle: params.billingCycle,
      tokens: params.tokens,
      paymentType: params.paymentType,
      successUrl,
      cancelUrl,
    });

    return {
      gateway: 'stripe',
      checkoutUrl: session.url!,
      reference,
      sessionId: session.id,
    };
  }

  /**
   * Verify a payment
   */
  async verifyPayment(
    gateway: PaymentGateway,
    reference: string
  ): Promise<{
    success: boolean;
    amount: number;
    currency: Currency;
    metadata: Record<string, unknown>;
  }> {
    try {
      if (gateway === 'paystack') {
        const verification = await paystackService.verifyTransaction(reference);

        if (verification.data.status !== 'success') {
          return {
            success: false,
            amount: 0,
            currency: verification.data.currency as Currency,
            metadata: {},
          };
        }

        return {
          success: true,
          amount: paystackService.convertFromSubunits(
            verification.data.amount,
            verification.data.currency as Currency
          ),
          currency: verification.data.currency as Currency,
          metadata: verification.data.metadata,
        };
      } else {
        // Stripe verification happens via webhooks
        // This method would retrieve session details
        const session = await stripeService.getCheckoutSession(reference);

        return {
          success: session.payment_status === 'paid',
          amount: stripeService.convertFromSubunits(session.amount_total || 0),
          currency: 'USD',
          metadata: session.metadata || {},
        };
      }
    } catch (error) {
      console.error('[PaymentService] Verify payment error:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    gateway: PaymentGateway,
    subscriptionId: string,
    emailToken?: string
  ): Promise<void> {
    try {
      if (gateway === 'paystack') {
        if (!emailToken) {
          throw new Error('Email token required for Paystack cancellation');
        }
        await paystackService.cancelSubscription({
          code: subscriptionId,
          token: emailToken,
        });
      } else {
        await stripeService.cancelSubscription(subscriptionId);
      }
    } catch (error) {
      console.error('[PaymentService] Cancel subscription error:', error);
      throw error;
    }
  }

  /**
   * Get payment gateway configuration
   */
  getGatewayConfig(): {
    paystack: {
      available: boolean;
      publicKey?: string;
    };
    stripe: {
      available: boolean;
      publishableKey?: string;
    };
  } {
    return {
      paystack: {
        available: paystackService.isAvailable(),
        publicKey: paystackService.isAvailable()
          ? paystackService.getPublicKey()
          : undefined,
      },
      stripe: {
        available: stripeService.isAvailable(),
        publishableKey: stripeService.isAvailable()
          ? stripeService.getPublishableKey()
          : undefined,
      },
    };
  }

  /**
   * Generate unique payment reference
   */
  private generateReference(userId: string, gateway: PaymentGateway): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${gateway}_${userId.substring(0, 8)}_${timestamp}_${random}`;
  }

  /**
   * Calculate recommended gateway based on user location
   */
  recommendGateway(
    currency: Currency,
    countryCode?: string
  ): PaymentGateway {
    // Nigerian users should use Paystack
    if (countryCode === 'NG' || currency === 'NGN') {
      return paystackService.isAvailable() ? 'paystack' : 'stripe';
    }

    // International users should use Stripe
    return stripeService.isAvailable() ? 'stripe' : 'paystack';
  }

  /**
   * Convert amount between currencies (simple estimation)
   * For production, use real-time exchange rates
   */
  convertCurrency(
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
}

// Export singleton instance
export const paymentService = new PaymentService();
