/**
 * Paystack Payment Service
 * Handles NGN and USD payments via Paystack
 * Supports subscriptions and one-time payments
 */

import crypto from 'crypto';

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, unknown>;
    fees: number;
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: Record<string, unknown> | null;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
  };
}

interface PaystackSubscriptionResponse {
  status: boolean;
  message: string;
  data: {
    customer: number;
    plan: string;
    integration: number;
    authorization: number;
    domain: string;
    start: number;
    status: string;
    quantity: number;
    amount: number;
    subscription_code: string;
    email_token: string;
    created_at: string;
    updated_at: string;
  };
}

interface PaystackWebhookEvent {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: {
      userId: string;
      planType: string;
      billingCycle: string;
      tokens: number;
      paymentType: 'subscription' | 'one_time' | 'top_up';
      [key: string]: unknown;
    };
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
    };
  };
}

class PaystackService {
  private secretKey: string;
  private publicKey: string;
  private webhookSecret: string;
  private baseUrl = 'https://api.paystack.co';

  constructor() {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const publicKey = process.env.PAYSTACK_PUBLIC_KEY;
    const webhookSecret = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey || !publicKey) {
      throw new Error(
        '[PaystackService] Missing required environment variables: PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY'
      );
    }

    this.secretKey = secretKey;
    this.publicKey = publicKey;
    this.webhookSecret = webhookSecret || '';
  }

  /**
   * Check if Paystack service is available
   */
  isAvailable(): boolean {
    return !!this.secretKey && !!this.publicKey;
  }

  /**
   * Initialize a payment transaction
   */
  async initializeTransaction(params: {
    email: string;
    amount: number; // Amount in kobo (NGN) or cents (USD)
    currency: 'NGN' | 'USD';
    reference: string;
    metadata: {
      userId: string;
      planType: string;
      billingCycle?: string;
      tokens: number;
      paymentType: 'subscription' | 'one_time' | 'top_up';
      [key: string]: unknown;
    };
    callbackUrl?: string;
  }): Promise<PaystackInitializeResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: params.email,
          amount: params.amount,
          currency: params.currency,
          reference: params.reference,
          metadata: params.metadata,
          callback_url: params.callbackUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[PaystackService] Initialize failed:', data);
        throw new Error(data.message || 'Failed to initialize payment');
      }

      return data;
    } catch (error) {
      console.error('[PaystackService] Initialize error:', error);
      throw error;
    }
  }

  /**
   * Verify a transaction by reference
   */
  async verifyTransaction(
    reference: string
  ): Promise<PaystackVerifyResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('[PaystackService] Verify failed:', data);
        throw new Error(data.message || 'Failed to verify payment');
      }

      return data;
    } catch (error) {
      console.error('[PaystackService] Verify error:', error);
      throw error;
    }
  }

  /**
   * Create a subscription (recurring payment)
   */
  async createSubscription(params: {
    customer: string; // customer code or email
    plan: string; // plan code
    authorization: string; // authorization code from previous transaction
  }): Promise<PaystackSubscriptionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/subscription`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[PaystackService] Create subscription failed:', data);
        throw new Error(data.message || 'Failed to create subscription');
      }

      return data;
    } catch (error) {
      console.error('[PaystackService] Create subscription error:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(params: {
    code: string; // subscription code
    token: string; // email token
  }): Promise<{ status: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/subscription/disable`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[PaystackService] Cancel subscription failed:', data);
        throw new Error(data.message || 'Failed to cancel subscription');
      }

      return data;
    } catch (error) {
      console.error('[PaystackService] Cancel subscription error:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   * Paystack uses HMAC SHA512 for webhook verification
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      console.warn(
        '[PaystackService] Webhook secret not configured, skipping verification'
      );
      return true; // Allow in development
    }

    try {
      const hash = crypto
        .createHmac('sha512', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return hash === signature;
    } catch (error) {
      console.error('[PaystackService] Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Parse and validate webhook event
   */
  parseWebhookEvent(payload: string): PaystackWebhookEvent {
    try {
      const event = JSON.parse(payload) as PaystackWebhookEvent;

      // Validate required fields
      if (!event.event || !event.data) {
        throw new Error('Invalid webhook payload structure');
      }

      return event;
    } catch (error) {
      console.error('[PaystackService] Parse webhook error:', error);
      throw new Error('Invalid webhook payload');
    }
  }

  /**
   * Get public key for client-side initialization
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Convert amount to Paystack format (kobo for NGN, cents for USD)
   */
  convertToSubunits(amount: number, currency: 'NGN' | 'USD'): number {
    // Paystack expects amounts in minor units (kobo/cents)
    return Math.round(amount * 100);
  }

  /**
   * Convert from Paystack format back to major units
   */
  convertFromSubunits(amount: number, currency: 'NGN' | 'USD'): number {
    return amount / 100;
  }
}

// Export singleton instance
export const paystackService = new PaystackService();
