/**
 * Token Management Service
 * Handles token balance, deduction, and pricing logic
 */

import {
  createServerSupabaseClient,
  createServiceRoleSupabaseClient,
} from '@/lib/supabase/server';

export interface UserTokenBalance {
  tokens: number;
  subscription: {
    id: string;
    planType: string;
    billingCycle: string | null;
    tokenAllocation: number;
    status: string;
    currentPeriodEnd: string;
    autoRenew: boolean;
  } | null;
}

export interface PricingConfig {
  // Token allocations
  basicTokens: number;
  proTokens: number;
  premiumTokens: number;

  // USD pricing
  basicPriceUsd: number;
  proPriceUsd: number;
  premiumPriceUsd: number;

  // NGN pricing
  basicPriceNgn: number;
  proPriceNgn: number;
  premiumPriceNgn: number;

  // One-time purchase rates
  tokensPerTenUsd: number;
  tokensPerTenThousandNgn: number;
  minOnetimeUsd: number;
  minOnetimeNgn: number;

  // Quarterly pricing
  basicPriceQuarterlyUsd: number;
  proPriceQuarterlyUsd: number;
  premiumPriceQuarterlyUsd: number;
  basicPriceQuarterlyNgn: number;
  proPriceQuarterlyNgn: number;
  premiumPriceQuarterlyNgn: number;

  // Yearly pricing
  basicPriceYearlyUsd: number;
  proPriceYearlyUsd: number;
  premiumPriceYearlyUsd: number;
  basicPriceYearlyNgn: number;
  proPriceYearlyNgn: number;
  premiumPriceYearlyNgn: number;

  // Premium limits
  premiumDailySoftLimit: number;
  premiumIsUnlimited: boolean;
}

class TokenService {
  /**
   * Get user's current token balance and subscription info
   */
  async getUserTokenBalance(userId: string): Promise<UserTokenBalance> {
    try {
      const supabase = await createServerSupabaseClient();

      // Use the helper function from migration
      const { data, error } = await supabase.rpc('get_user_subscription', {
        p_user_id: userId,
      });

      if (error) {
        console.error('[TokenService] Get balance error:', error);
        throw error;
      }

      // No active subscription
      if (!data || data.length === 0) {
        return {
          tokens: 0,
          subscription: null,
        };
      }

      const sub = data[0];

      return {
        tokens: sub.tokens_remaining || 0,
        subscription: {
          id: sub.subscription_id,
          planType: sub.plan_type,
          billingCycle: sub.billing_cycle,
          tokenAllocation: sub.token_allocation,
          status: sub.status,
          currentPeriodEnd: sub.current_period_end,
          autoRenew: sub.auto_renew,
        },
      };
    } catch (error) {
      console.error('[TokenService] Get balance error:', error);
      // Return zero balance on error (fail safe)
      return {
        tokens: 0,
        subscription: null,
      };
    }
  }

  /**
   * Check if user has enough tokens for an operation
   */
  async hasEnoughTokens(
    userId: string,
    estimatedTokens: number
  ): Promise<boolean> {
    const balance = await this.getUserTokenBalance(userId);
    return balance.tokens >= estimatedTokens;
  }

  /**
   * Deduct tokens from user's subscription
   * Uses the database function for atomic operation
   */
  async deductTokens(
    userId: string,
    amount: number,
    operationType: string,
    metadata?: Record<string, unknown>,
    projectId?: string
  ): Promise<boolean> {
    try {
      // Use service role client to bypass RLS
      const supabase = await createServiceRoleSupabaseClient();

      const { data, error } = await supabase.rpc('deduct_user_tokens', {
        p_user_id: userId,
        p_tokens: amount,
        p_operation_type: operationType,
        p_metadata: metadata || null,
        p_project_id: projectId || null,
      });

      if (error) {
        console.error('[TokenService] Deduct tokens error:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('[TokenService] Deduct tokens error:', error);
      return false;
    }
  }

  /**
   * Get pricing configuration from database
   * Cached for 5 minutes to reduce DB queries
   */
  private pricingCache: { data: PricingConfig | null; timestamp: number } = {
    data: null,
    timestamp: 0,
  };

  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getPricingConfig(): Promise<PricingConfig> {
    // Check cache
    const now = Date.now();
    if (
      this.pricingCache.data &&
      now - this.pricingCache.timestamp < this.CACHE_TTL
    ) {
      return this.pricingCache.data;
    }

    try {
      const supabase = await createServerSupabaseClient();

      const { data, error } = await supabase
        .from('pricing_config')
        .select('key, value');

      if (error) {
        console.error('[TokenService] Get pricing config error:', error);
        throw error;
      }

      // Convert array to object
      const config: Record<string, number | boolean> = {};
      data.forEach((item: { key: string; value: string }) => {
        const value = item.value;
        // Parse value based on type
        if (value === 'true' || value === 'false') {
          config[item.key] = value === 'true';
        } else {
          config[item.key] = parseFloat(value);
        }
      });

      const pricingConfig: PricingConfig = {
        basicTokens: config.basic_tokens as number,
        proTokens: config.pro_tokens as number,
        premiumTokens: config.premium_tokens as number,
        basicPriceUsd: config.basic_price_usd as number,
        proPriceUsd: config.pro_price_usd as number,
        premiumPriceUsd: config.premium_price_usd as number,
        basicPriceNgn: config.basic_price_ngn as number,
        proPriceNgn: config.pro_price_ngn as number,
        premiumPriceNgn: config.premium_price_ngn as number,
        tokensPerTenUsd: config.tokens_per_10_usd as number,
        tokensPerTenThousandNgn: config.tokens_per_10000_ngn as number,
        minOnetimeUsd: config.min_onetime_usd as number,
        minOnetimeNgn: config.min_onetime_ngn as number,
        basicPriceQuarterlyUsd: config.basic_price_quarterly_usd as number,
        proPriceQuarterlyUsd: config.pro_price_quarterly_usd as number,
        premiumPriceQuarterlyUsd: config.premium_price_quarterly_usd as number,
        basicPriceQuarterlyNgn: config.basic_price_quarterly_ngn as number,
        proPriceQuarterlyNgn: config.pro_price_quarterly_ngn as number,
        premiumPriceQuarterlyNgn: config.premium_price_quarterly_ngn as number,
        basicPriceYearlyUsd: config.basic_price_yearly_usd as number,
        proPriceYearlyUsd: config.pro_price_yearly_usd as number,
        premiumPriceYearlyUsd: config.premium_price_yearly_usd as number,
        basicPriceYearlyNgn: config.basic_price_yearly_ngn as number,
        proPriceYearlyNgn: config.pro_price_yearly_ngn as number,
        premiumPriceYearlyNgn: config.premium_price_yearly_ngn as number,
        premiumDailySoftLimit: config.premium_daily_soft_limit as number,
        premiumIsUnlimited: config.premium_is_unlimited as boolean,
      };

      // Update cache
      this.pricingCache = {
        data: pricingConfig,
        timestamp: now,
      };

      return pricingConfig;
    } catch (error) {
      console.error('[TokenService] Get pricing config error:', error);
      throw error;
    }
  }

  /**
   * Calculate tokens for a given payment amount
   */
  async calculateTokensForPayment(
    amount: number,
    currency: 'NGN' | 'USD'
  ): Promise<number> {
    const pricing = await this.getPricingConfig();

    if (currency === 'USD') {
      // $10 = tokensPerTenUsd tokens
      return Math.floor((amount / 10) * pricing.tokensPerTenUsd);
    } else {
      // ₦10,000 = tokensPerTenThousandNgn tokens
      return Math.floor((amount / 10000) * pricing.tokensPerTenThousandNgn);
    }
  }

  /**
   * Get token allocation for a plan type and billing cycle
   */
  async getTokenAllocationForPlan(
    planType: string,
    billingCycle: string
  ): Promise<number> {
    try {
      const pricing = await this.getPricingConfig();

      console.log('[TokenService] Getting token allocation for plan:', planType, 'cycle:', billingCycle);
      console.log('[TokenService] Pricing config loaded:', {
        basicTokens: pricing.basicTokens,
        proTokens: pricing.proTokens,
        premiumTokens: pricing.premiumTokens,
      });

      // Premium has special soft limit logic
      if (planType === 'premium') {
        return pricing.premiumTokens;
      }

      // For other plans, allocation is same regardless of billing cycle
      // (Billing cycle affects price, not token amount)
      switch (planType) {
        case 'basic':
          return pricing.basicTokens;
        case 'pro':
          return pricing.proTokens;
        default:
          console.warn('[TokenService] Unknown plan type:', planType);
          return 0;
      }
    } catch (error) {
      console.error('[TokenService] Error getting token allocation:', error);
      return 0;
    }
  }

  /**
   * Get price for a plan
   */
  async getPriceForPlan(
    planType: string,
    billingCycle: string,
    currency: 'NGN' | 'USD'
  ): Promise<number> {
    const pricing = await this.getPricingConfig();

    const key = `${planType}Price${billingCycle === 'monthly' ? '' : billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}${currency === 'USD' ? 'Usd' : 'Ngn'}`;

    // Build the key dynamically
    let price = 0;

    if (currency === 'USD') {
      if (billingCycle === 'monthly') {
        price = pricing[`${planType}PriceUsd` as keyof PricingConfig] as number;
      } else if (billingCycle === 'quarterly') {
        price = pricing[
          `${planType}PriceQuarterlyUsd` as keyof PricingConfig
        ] as number;
      } else if (billingCycle === 'yearly') {
        price = pricing[
          `${planType}PriceYearlyUsd` as keyof PricingConfig
        ] as number;
      }
    } else {
      if (billingCycle === 'monthly') {
        price = pricing[`${planType}PriceNgn` as keyof PricingConfig] as number;
      } else if (billingCycle === 'quarterly') {
        price = pricing[
          `${planType}PriceQuarterlyNgn` as keyof PricingConfig
        ] as number;
      } else if (billingCycle === 'yearly') {
        price = pricing[
          `${planType}PriceYearlyNgn` as keyof PricingConfig
        ] as number;
      }
    }

    return price;
  }

  /**
   * Check if user is on premium plan with fair use
   */
  async isPremiumUser(userId: string): Promise<boolean> {
    const balance = await this.getUserTokenBalance(userId);
    return balance.subscription?.planType === 'premium';
  }

  /**
   * Get daily token usage for premium fair use policy
   */
  async getDailyTokenUsage(userId: string): Promise<number> {
    try {
      const supabase = await createServerSupabaseClient();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('token_usage')
        .select('tokens_used')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[TokenService] Get daily usage error:', error);
        return 0;
      }

      const total = data.reduce(
        (sum: number, record: { tokens_used: number }) =>
          sum + record.tokens_used,
        0
      );

      return total;
    } catch (error) {
      console.error('[TokenService] Get daily usage error:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const tokenService = new TokenService();
