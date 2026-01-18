/**
 * Subscription Management Service
 * Handles subscription CRUD operations and lifecycle
 */

import {
  createServerSupabaseClient,
  createServiceRoleSupabaseClient,
} from '@/lib/supabase/server';
import { tokenService } from './tokenService';
import type { PaymentGateway, Currency, BillingCycle } from './paymentService';

export interface Subscription {
  id: string;
  userId: string;
  planType: string;
  billingCycle: string | null;
  tokenAllocation: number;
  tokensRemaining: number;
  currency: Currency;
  amountPaid: number;
  paymentGateway: PaymentGateway;
  gatewaySubscriptionId: string | null;
  gatewayCustomerId: string | null;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  autoRenew: boolean;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateSubscriptionParams {
  userId: string;
  planType: string;
  billingCycle: BillingCycle;
  currency: Currency;
  amountPaid: number;
  paymentGateway: PaymentGateway;
  gatewaySubscriptionId?: string;
  gatewayCustomerId?: string;
  transactionId: string;
}

class SubscriptionService {
  /**
   * Create a new subscription
   */
  async createSubscription(
    params: CreateSubscriptionParams
  ): Promise<Subscription> {
    try {
      // Use service role to bypass RLS for creation
      const supabase = await createServiceRoleSupabaseClient();

      // Get token allocation for this plan
      let tokenAllocation = await tokenService.getTokenAllocationForPlan(
        params.planType,
        params.billingCycle
      );

      console.log('[SubscriptionService] Token allocation from service:', tokenAllocation, 'for plan:', params.planType, 'cycle:', params.billingCycle);

      // Fallback to hardcoded values if pricing config is not available
      if (!tokenAllocation || tokenAllocation === 0) {
        console.warn('[SubscriptionService] Token allocation is 0 or null, using fallback values');
        switch (params.planType) {
          case 'basic':
            tokenAllocation = 165000;
            break;
          case 'pro':
            tokenAllocation = 665000;
            break;
          case 'premium':
            tokenAllocation = 3000000;
            break;
          default:
            throw new Error(`Invalid plan type: ${params.planType}`);
        }
      }

      // Calculate period end based on billing cycle
      const periodStart = new Date();
      const periodEnd = this.calculatePeriodEnd(
        periodStart,
        params.billingCycle
      );

      console.log('[SubscriptionService] Creating subscription with token_allocation:', tokenAllocation);

      // Create subscription record
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: params.userId,
          plan_type: params.planType,
          billing_cycle: params.billingCycle,
          token_allocation: tokenAllocation,
          tokens_remaining: tokenAllocation,
          currency: params.currency,
          amount_paid: params.amountPaid,
          payment_gateway: params.paymentGateway,
          gateway_subscription_id: params.gatewaySubscriptionId || null,
          gateway_customer_id: params.gatewayCustomerId || null,
          status: 'active',
          auto_renew: !!params.gatewaySubscriptionId, // Auto-renew if we have subscription ID
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .select()
        .single();

      if (subError) {
        console.error('[SubscriptionService] Create subscription error:', subError);
        throw subError;
      }

      // Record payment history
      await supabase.from('payment_history').insert({
        user_id: params.userId,
        subscription_id: subscription.id,
        transaction_id: params.transactionId,
        payment_gateway: params.paymentGateway,
        amount: params.amountPaid,
        currency: params.currency,
        tokens_purchased: tokenAllocation,
        payment_type: 'subscription',
        status: 'success',
      });

      return this.mapSubscription(subscription);
    } catch (error) {
      console.error('[SubscriptionService] Create subscription error:', error);
      throw error;
    }
  }

  /**
   * Get user's active subscription
   */
  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    try {
      const supabase = await createServerSupabaseClient();

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('[SubscriptionService] Get active subscription error:', error);
        throw error;
      }

      return this.mapSubscription(data);
    } catch (error) {
      console.error('[SubscriptionService] Get active subscription error:', error);
      return null;
    }
  }

  /**
   * Get all user subscriptions (including expired)
   */
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    try {
      const supabase = await createServerSupabaseClient();

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[SubscriptionService] Get subscriptions error:', error);
        throw error;
      }

      return data.map(this.mapSubscription);
    } catch (error) {
      console.error('[SubscriptionService] Get subscriptions error:', error);
      return [];
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    userId: string
  ): Promise<Subscription> {
    try {
      const supabase = await createServerSupabaseClient();

      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          auto_renew: false,
        })
        .eq('id', subscriptionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('[SubscriptionService] Cancel subscription error:', error);
        throw error;
      }

      return this.mapSubscription(data);
    } catch (error) {
      console.error('[SubscriptionService] Cancel subscription error:', error);
      throw error;
    }
  }

  /**
   * Add tokens via one-time purchase (top-up)
   */
  async addTokens(
    userId: string,
    tokens: number,
    amount: number,
    currency: Currency,
    gateway: PaymentGateway,
    transactionId: string
  ): Promise<boolean> {
    try {
      const supabase = await createServiceRoleSupabaseClient();

      // Get or create active subscription
      let subscription = await this.getActiveSubscription(userId);

      if (!subscription) {
        // Create a one-time subscription
        const periodStart = new Date();
        const periodEnd = new Date(periodStart);
        periodEnd.setFullYear(periodEnd.getFullYear() + 1); // Valid for 1 year

        console.log('[SubscriptionService] Creating one-time subscription with tokens:', tokens);

        const { data: newSub, error: subError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_type: 'one_time',
            billing_cycle: null,
            token_allocation: tokens,
            tokens_remaining: tokens,
            currency,
            amount_paid: amount,
            payment_gateway: gateway,
            status: 'active',
            auto_renew: false,
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
          })
          .select()
          .single();

        if (subError) {
          console.error('[SubscriptionService] Create one-time subscription error:', subError);
          throw subError;
        }

        subscription = this.mapSubscription(newSub);
      } else {
        // Add tokens to existing subscription
        const newBalance = subscription.tokensRemaining + tokens;
        const newAllocation = subscription.tokenAllocation + tokens;

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            tokens_remaining: newBalance,
            token_allocation: newAllocation,
          })
          .eq('id', subscription.id);

        if (updateError) {
          console.error('[SubscriptionService] Update tokens error:', updateError);
          throw updateError;
        }
      }

      // Record payment history
      await supabase.from('payment_history').insert({
        user_id: userId,
        subscription_id: subscription.id,
        transaction_id: transactionId,
        payment_gateway: gateway,
        amount,
        currency,
        tokens_purchased: tokens,
        payment_type: 'top_up',
        status: 'success',
      });

      return true;
    } catch (error) {
      console.error('[SubscriptionService] Add tokens error:', error);
      return false;
    }
  }

  /**
   * Renew subscription (called by webhook or cron)
   */
  async renewSubscription(subscriptionId: string): Promise<void> {
    try {
      const supabase = await createServiceRoleSupabaseClient();

      // Get subscription
      const { data: subscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (fetchError || !subscription) {
        throw new Error('Subscription not found');
      }

      // Calculate new period
      const periodStart = new Date(subscription.current_period_end);
      const periodEnd = this.calculatePeriodEnd(
        periodStart,
        subscription.billing_cycle
      );

      // Get token allocation for plan
      const tokenAllocation = await tokenService.getTokenAllocationForPlan(
        subscription.plan_type,
        subscription.billing_cycle
      );

      // Update subscription
      await supabase
        .from('subscriptions')
        .update({
          tokens_remaining: tokenAllocation,
          token_allocation: tokenAllocation,
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          status: 'active',
        })
        .eq('id', subscriptionId);
    } catch (error) {
      console.error('[SubscriptionService] Renew subscription error:', error);
      throw error;
    }
  }

  /**
   * Mark expired subscriptions (called by cron)
   */
  async markExpiredSubscriptions(): Promise<number> {
    try {
      const supabase = await createServiceRoleSupabaseClient();

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          status: 'expired',
          tokens_remaining: 0,
        })
        .eq('status', 'active')
        .eq('auto_renew', false)
        .lt('current_period_end', now)
        .select('id');

      if (error) {
        console.error('[SubscriptionService] Mark expired error:', error);
        throw error;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('[SubscriptionService] Mark expired error:', error);
      return 0;
    }
  }

  /**
   * Calculate period end date based on billing cycle
   */
  private calculatePeriodEnd(start: Date, cycle: BillingCycle): Date {
    const end = new Date(start);

    switch (cycle) {
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'quarterly':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'yearly':
        end.setFullYear(end.getFullYear() + 1);
        break;
    }

    return end;
  }

  /**
   * Map database record to Subscription interface
   */
  private mapSubscription(data: Record<string, unknown>): Subscription {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      planType: data.plan_type as string,
      billingCycle: data.billing_cycle as string | null,
      tokenAllocation: data.token_allocation as number,
      tokensRemaining: data.tokens_remaining as number,
      currency: data.currency as Currency,
      amountPaid: parseFloat(data.amount_paid as string),
      paymentGateway: data.payment_gateway as PaymentGateway,
      gatewaySubscriptionId: data.gateway_subscription_id as string | null,
      gatewayCustomerId: data.gateway_customer_id as string | null,
      status: data.status as 'active' | 'cancelled' | 'expired' | 'past_due',
      autoRenew: data.auto_renew as boolean,
      currentPeriodStart: data.current_period_start as string,
      currentPeriodEnd: data.current_period_end as string,
      cancelledAt: data.cancelled_at as string | null,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
