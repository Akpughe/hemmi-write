/**
 * Stripe Payment Service
 * Handles international payments via Stripe
 * Supports subscriptions and one-time payments
 *
 * NOTE: Requires `npm install stripe` to be run
 */

import Stripe from "stripe";

// Stripe Price IDs for subscription plans
export const STRIPE_PRICE_IDS = {
  basic: {
    monthly: "price_1SvIsNFDGn8kVMNZFPgax2kR",
    yearly: "price_1SvIvxFDGn8kVMNZ1YiBg8Vw",
  },
  pro: {
    monthly: "price_1SvItEFDGn8kVMNZE0myjYjg",
    yearly: "price_1SvIxGFDGn8kVMNZHB0zJIjB",
  },
  premium: {
    monthly: "price_1SvIteFDGn8kVMNZrD1yJL1N",
    yearly: "price_1SvIyKFDGn8kVMNZ7FEzt5zw",
  },
} as const;

type PlanType = keyof typeof STRIPE_PRICE_IDS;
type StripeBillingCycle = "monthly" | "yearly";

interface StripeCheckoutSessionParams {
  userId: string;
  email: string;
  amount: number; // Amount in dollars
  currency: "USD";
  planType: string;
  billingCycle?: string;
  tokens: number;
  paymentType: "subscription" | "one_time" | "top_up";
  successUrl: string;
  cancelUrl: string;
}

interface StripeSubscriptionParams {
  customerId: string;
  priceId: string;
  metadata: Record<string, string>;
}

class StripeService {
  private stripe: Stripe | null = null;
  private webhookSecret: string;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey) {
      console.warn("[StripeService] STRIPE_SECRET_KEY not configured");
      this.stripe = null;
      this.webhookSecret = "";
      return;
    }

    try {
      this.stripe = new Stripe(secretKey, {
        apiVersion: "2025-12-15.clover", // Latest API version
      });
      this.webhookSecret = webhookSecret || "";
      console.log("[StripeService] Initialized successfully");
    } catch (error) {
      console.error("[StripeService] Initialization error:", error);
      this.stripe = null;
      this.webhookSecret = "";
    }
  }

  /**
   * Check if Stripe service is available
   */
  isAvailable(): boolean {
    return this.stripe !== null;
  }

  /**
   * Get Stripe price ID for a plan
   */
  getPriceId(planType: string, billingCycle: string): string | null {
    const plan = STRIPE_PRICE_IDS[planType as PlanType];
    if (!plan) return null;

    // Map billing cycles to Stripe-supported intervals (monthly/yearly only)
    const mappedCycle: StripeBillingCycle =
      billingCycle === "yearly" ? "yearly" : "monthly";

    return plan[mappedCycle] || null;
  }

  /**
   * Create a Checkout Session for one-time or subscription payments
   * Uses predefined Stripe prices for subscriptions when available
   */
  async createCheckoutSession(
    params: StripeCheckoutSessionParams,
  ): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new Error("[StripeService] Stripe not initialized");
    }

    try {
      // For subscriptions, try to use predefined price IDs
      const priceId =
        params.paymentType === "subscription"
          ? this.getPriceId(params.planType, params.billingCycle || "monthly")
          : null;

      let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

      if (priceId && params.paymentType === "subscription") {
        // Use predefined price ID for subscriptions
        lineItems = [
          {
            price: priceId,
            quantity: 1,
          },
        ];
        console.log(
          "[StripeService] Using predefined price ID:",
          priceId,
          "for plan:",
          params.planType,
        );
      } else {
        // Fallback to price_data for one-time payments or if no price ID found
        lineItems = [
          {
            price_data: {
              currency: params.currency.toLowerCase(),
              product_data: {
                name: this.getProductName(params.planType, params.paymentType),
                description: this.getProductDescription(
                  params.planType,
                  params.tokens,
                  params.billingCycle,
                ),
              },
              unit_amount: Math.round(params.amount * 100), // Convert to cents
              ...(params.paymentType === "subscription" && params.billingCycle
                ? {
                    recurring: {
                      interval: this.getBillingInterval(params.billingCycle),
                      interval_count:
                        params.billingCycle === "quarterly" ? 3 : 1,
                    },
                  }
                : {}),
            },
            quantity: 1,
          },
        ];
      }

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode:
          params.paymentType === "subscription" ? "subscription" : "payment",
        customer_email: params.email,
        client_reference_id: params.userId,
        line_items: lineItems,
        metadata: {
          userId: params.userId,
          planType: params.planType,
          billingCycle: params.billingCycle || "N/A",
          tokens: params.tokens.toString(),
          paymentType: params.paymentType,
        },
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
      });

      return session;
    } catch (error) {
      console.error("[StripeService] Create checkout session error:", error);
      throw error;
    }
  }

  /**
   * Create a subscription for an existing customer
   */
  async createSubscription(
    params: StripeSubscriptionParams,
  ): Promise<Stripe.Subscription> {
    if (!this.stripe) {
      throw new Error("[StripeService] Stripe not initialized");
    }

    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: params.customerId,
        items: [{ price: params.priceId }],
        metadata: params.metadata,
      });

      return subscription;
    } catch (error) {
      console.error("[StripeService] Create subscription error:", error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    if (!this.stripe) {
      throw new Error("[StripeService] Stripe not initialized");
    }

    try {
      const subscription =
        await this.stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    } catch (error) {
      console.error("[StripeService] Cancel subscription error:", error);
      throw error;
    }
  }

  /**
   * Update a subscription (e.g., change plan)
   */
  async updateSubscription(
    subscriptionId: string,
    params: { priceId?: string; metadata?: Record<string, string> },
  ): Promise<Stripe.Subscription> {
    if (!this.stripe) {
      throw new Error("[StripeService] Stripe not initialized");
    }

    try {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);

      const updateParams: Stripe.SubscriptionUpdateParams = {
        metadata: params.metadata,
      };

      if (params.priceId) {
        updateParams.items = [
          {
            id: subscription.items.data[0].id,
            price: params.priceId,
          },
        ];
      }

      const updatedSubscription = await this.stripe.subscriptions.update(
        subscriptionId,
        updateParams,
      );

      return updatedSubscription;
    } catch (error) {
      console.error("[StripeService] Update subscription error:", error);
      throw error;
    }
  }

  /**
   * Retrieve a customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    if (!this.stripe) {
      throw new Error("[StripeService] Stripe not initialized");
    }

    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return customer as Stripe.Customer;
    } catch (error) {
      console.error("[StripeService] Get customer error:", error);
      throw error;
    }
  }

  /**
   * Retrieve a checkout session by ID
   */
  async getCheckoutSession(
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new Error("[StripeService] Stripe not initialized");
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      console.error("[StripeService] Get checkout session error:", error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
  ): Stripe.Event {
    if (!this.stripe) {
      throw new Error("[StripeService] Stripe not initialized");
    }

    if (!this.webhookSecret) {
      console.warn(
        "[StripeService] Webhook secret not configured, skipping verification",
      );
      // In development, parse without verification
      return JSON.parse(payload.toString()) as Stripe.Event;
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
      return event;
    } catch (error) {
      console.error(
        "[StripeService] Webhook signature verification failed:",
        error,
      );
      throw new Error("Invalid webhook signature");
    }
  }

  /**
   * Get publishable key for client-side
   */
  getPublishableKey(): string {
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  }

  // Helper methods

  private getProductName(planType: string, paymentType: string): string {
    if (paymentType === "one_time" || paymentType === "top_up") {
      return "Hemmi AI Token Top-up";
    }

    const planNames: Record<string, string> = {
      basic: "Hemmi AI Basic Plan",
      pro: "Hemmi AI Pro Plan",
      premium: "Hemmi AI Premium Plan",
    };

    return planNames[planType] || "Hemmi AI Subscription";
  }

  private getProductDescription(
    planType: string,
    tokens: number,
    billingCycle?: string,
  ): string {
    const cycle = billingCycle || "monthly";
    const formattedTokens = tokens.toLocaleString();

    if (planType === "premium") {
      return `Unlimited tokens with fair use policy (${cycle} billing)`;
    }

    return `${formattedTokens} tokens per ${cycle === "monthly" ? "month" : cycle === "quarterly" ? "quarter" : "year"}`;
  }

  private getBillingInterval(
    billingCycle: string,
  ): Stripe.Price.Recurring.Interval {
    switch (billingCycle) {
      case "monthly":
        return "month";
      case "quarterly":
        return "month"; // Use interval_count = 3
      case "yearly":
        return "year";
      default:
        return "month";
    }
  }

  /**
   * Convert amount to Stripe format (cents)
   */
  convertToSubunits(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Convert from Stripe format back to dollars
   */
  convertFromSubunits(amount: number): number {
    return amount / 100;
  }
}

// Export singleton instance
export const stripeService = new StripeService();
