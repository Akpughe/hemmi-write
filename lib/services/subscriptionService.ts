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
   * Create a new subscription or renew existing one
   */
  async createSubscription(
    params: CreateSubscriptionParams
  ): Promise<Subscription> {
    try {
      // Use service role to bypass RLS for creation
      const supabase = await createServiceRoleSupabaseClient();

      // Check if user already has an active subscription
      const existingSubscription = await this.getActiveSubscriptionByUserId(params.userId);

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

      // If user has an existing active subscription, update it instead of creating new one
      if (existingSubscription) {
        console.log('[SubscriptionService] User has existing active subscription, upgrading/renewing instead');

        // Calculate new token balance: remaining tokens + new allocation
        const newTokensRemaining = existingSubscription.tokensRemaining + tokenAllocation;

        const { data: updatedSub, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            plan_type: params.planType,
            billing_cycle: params.billingCycle,
            token_allocation: tokenAllocation,
            tokens_remaining: newTokensRemaining,
            currency: params.currency,
            amount_paid: params.amountPaid,
            payment_gateway: params.paymentGateway,
            gateway_subscription_id: params.gatewaySubscriptionId || existingSubscription.gatewaySubscriptionId,
            gateway_customer_id: params.gatewayCustomerId || existingSubscription.gatewayCustomerId,
            status: 'active',
            auto_renew: !!params.gatewaySubscriptionId,
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSubscription.id)
          .select()
          .single();

        if (updateError) {
          console.error('[SubscriptionService] Update subscription error:', updateError);
          throw updateError;
        }

        // Record payment history
        await supabase.from('payment_history').insert({
          user_id: params.userId,
          subscription_id: updatedSub.id,
          transaction_id: params.transactionId,
          payment_gateway: params.paymentGateway,
          amount: params.amountPaid,
          currency: params.currency,
          tokens_purchased: tokenAllocation,
          payment_type: 'subscription',
          status: 'success',
        });

        console.log('[SubscriptionService] Subscription renewed/upgraded for user:', params.userId, 'new tokens_remaining:', newTokensRemaining);
        return this.mapSubscription(updatedSub);
      }

      console.log('[SubscriptionService] Creating new subscription with token_allocation:', tokenAllocation);

      // Expire any existing free subscription before creating paid one
      const { error: expireError } = await supabase
        .from('subscriptions')
        .update({ status: 'expired', cancelled_at: new Date().toISOString() })
        .eq('user_id', params.userId)
        .eq('plan_type', 'free')
        .eq('status', 'active');

      if (expireError) {
        console.warn('[SubscriptionService] Failed to expire free subscription:', expireError);
      }

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
   * Get user's active subscription by user ID (uses service role to bypass RLS)
   * Use this in webhook/service contexts where there's no authenticated user session
   */
  async getActiveSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    try {
      const supabase = await createServiceRoleSupabaseClient();

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
        console.error('[SubscriptionService] Get active subscription by user ID error:', error);
        return null;
      }

      return this.mapSubscription(data);
    } catch (error) {
      console.error('[SubscriptionService] Get active subscription by user ID error:', error);
      return null;
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
   * Get subscription by gateway subscription ID (for webhook processing)
   */
  async getSubscriptionByGatewayId(gatewaySubscriptionId: string): Promise<Subscription | null> {
    try {
      const supabase = await createServiceRoleSupabaseClient();

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('gateway_subscription_id', gatewaySubscriptionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('[SubscriptionService] Get subscription by gateway ID error:', error);
        return null;
      }

      return this.mapSubscription(data);
    } catch (error) {
      console.error('[SubscriptionService] Get subscription by gateway ID error:', error);
      return null;
    }
  }

  /**
   * Mark subscription as past_due (for failed renewals)
   */
  async markSubscriptionPastDue(subscriptionId: string): Promise<void> {
    try {
      const supabase = await createServiceRoleSupabaseClient();

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) {
        console.error('[SubscriptionService] Mark past_due error:', error);
        throw error;
      }

      console.log('[SubscriptionService] Subscription marked as past_due:', subscriptionId);
    } catch (error) {
      console.error('[SubscriptionService] Mark past_due error:', error);
      throw error;
    }
  }

  /**
   * Mark subscription as cancelled by gateway ID
   */
  async cancelSubscriptionByGatewayId(gatewaySubscriptionId: string): Promise<void> {
    try {
      const subscription = await this.getSubscriptionByGatewayId(gatewaySubscriptionId);
      if (!subscription) {
        console.warn('[SubscriptionService] Subscription not found for gateway ID:', gatewaySubscriptionId);
        return;
      }

      const supabase = await createServiceRoleSupabaseClient();

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          auto_renew: false,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (error) {
        console.error('[SubscriptionService] Cancel by gateway ID error:', error);
        throw error;
      }

      console.log('[SubscriptionService] Subscription cancelled by gateway ID:', gatewaySubscriptionId);
    } catch (error) {
      console.error('[SubscriptionService] Cancel by gateway ID error:', error);
      throw error;
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
   * Returns { success: boolean, error?: string } for better error handling
   */
  async addTokens(
    userId: string,
    tokens: number,
    amount: number,
    currency: Currency,
    gateway: PaymentGateway,
    transactionId: string
  ): Promise<{ success: boolean; error?: string; subscriptionId?: string }> {
    try {
      const supabase = await createServiceRoleSupabaseClient();

      // Use service role method to bypass RLS (important for webhook context)
      let subscription = await this.getActiveSubscriptionByUserId(userId);

      if (!subscription) {
        // Create a one-time subscription
        const periodStart = new Date();
        const periodEnd = new Date(periodStart);
        periodEnd.setFullYear(periodEnd.getFullYear() + 1); // Valid for 1 year

        console.log('[SubscriptionService] Creating one-time subscription with tokens:', tokens, 'for user:', userId);

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
          return { success: false, error: `Failed to create subscription: ${subError.message}` };
        }

        subscription = this.mapSubscription(newSub);
        console.log('[SubscriptionService] Created new one-time subscription:', subscription.id);
      } else {
        // Add tokens to existing subscription
        const newBalance = subscription.tokensRemaining + tokens;
        const newAllocation = subscription.tokenAllocation + tokens;

        console.log('[SubscriptionService] Adding', tokens, 'tokens to existing subscription:', subscription.id,
          'Current balance:', subscription.tokensRemaining, 'New balance:', newBalance);

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            tokens_remaining: newBalance,
            token_allocation: newAllocation,
          })
          .eq('id', subscription.id);

        if (updateError) {
          console.error('[SubscriptionService] Update tokens error:', updateError);
          return { success: false, error: `Failed to update tokens: ${updateError.message}` };
        }

        console.log('[SubscriptionService] Tokens updated successfully for subscription:', subscription.id);
      }

      // Record payment history
      const { error: historyError } = await supabase.from('payment_history').insert({
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

      if (historyError) {
        console.error('[SubscriptionService] Record payment history error:', historyError);
        // Don't fail the whole operation - tokens were added, just log this error
        console.warn('[SubscriptionService] Tokens added but payment history failed to record');
      } else {
        console.log('[SubscriptionService] Payment history recorded for transaction:', transactionId);
      }

      return { success: true, subscriptionId: subscription.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SubscriptionService] Add tokens error:', error);
      return { success: false, error: errorMessage };
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

      // Skip renewal for one-time purchases (no billing cycle)
      if (!subscription.billing_cycle) {
        throw new Error('Cannot renew one-time subscription');
      }

      // Calculate new period
      const periodStart = new Date(subscription.current_period_end);
      const periodEnd = this.calculatePeriodEnd(
        periodStart,
        subscription.billing_cycle as BillingCycle
      );

      // Get token allocation for plan
      const tokenAllocation = await tokenService.getTokenAllocationForPlan(
        subscription.plan_type,
        subscription.billing_cycle as BillingCycle
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
      amountPaid: data.amount_paid as number,
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
