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
        p_metadata: (metadata as any) || null,
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

  // Default pricing values as fallback (matches database seed values)
  private readonly DEFAULT_PRICING: PricingConfig = {
    basicTokens: 165000,
    proTokens: 665000,
    premiumTokens: 3000000,
    basicPriceUsd: 20,
    proPriceUsd: 37.5,
    premiumPriceUsd: 70,
    basicPriceNgn: 30000,
    proPriceNgn: 56250,
    premiumPriceNgn: 105000,
    tokensPerTenUsd: 20000,
    tokensPerTenThousandNgn: 20000,
    minOnetimeUsd: 10,
    minOnetimeNgn: 10000,
    basicPriceQuarterlyUsd: 51,
    proPriceQuarterlyUsd: 95.63,
    premiumPriceQuarterlyUsd: 178.5,
    basicPriceQuarterlyNgn: 76500,
    proPriceQuarterlyNgn: 143437.5,
    premiumPriceQuarterlyNgn: 267750,
    basicPriceYearlyUsd: 180,
    proPriceYearlyUsd: 337.5,
    premiumPriceYearlyUsd: 630,
    basicPriceYearlyNgn: 270000,
    proPriceYearlyNgn: 506250,
    premiumPriceYearlyNgn: 945000,
    premiumDailySoftLimit: 100000,
    premiumIsUnlimited: true,
  };

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
        console.warn('[TokenService] Using default pricing values');
        return this.DEFAULT_PRICING;
      }

      // If no data returned (e.g., RLS blocking or empty table), use defaults
      if (!data || data.length === 0) {
        console.warn('[TokenService] No pricing data in database, using defaults');
        return this.DEFAULT_PRICING;
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

      // Helper to get value with fallback
      const getNum = (key: string, fallback: number): number => {
        const val = config[key];
        return typeof val === 'number' && !Number.isNaN(val) ? val : fallback;
      };
      const getBool = (key: string, fallback: boolean): boolean => {
        const val = config[key];
        return typeof val === 'boolean' ? val : fallback;
      };

      const pricingConfig: PricingConfig = {
        basicTokens: getNum('basic_tokens', this.DEFAULT_PRICING.basicTokens),
        proTokens: getNum('pro_tokens', this.DEFAULT_PRICING.proTokens),
        premiumTokens: getNum('premium_tokens', this.DEFAULT_PRICING.premiumTokens),
        basicPriceUsd: getNum('basic_price_usd', this.DEFAULT_PRICING.basicPriceUsd),
        proPriceUsd: getNum('pro_price_usd', this.DEFAULT_PRICING.proPriceUsd),
        premiumPriceUsd: getNum('premium_price_usd', this.DEFAULT_PRICING.premiumPriceUsd),
        basicPriceNgn: getNum('basic_price_ngn', this.DEFAULT_PRICING.basicPriceNgn),
        proPriceNgn: getNum('pro_price_ngn', this.DEFAULT_PRICING.proPriceNgn),
        premiumPriceNgn: getNum('premium_price_ngn', this.DEFAULT_PRICING.premiumPriceNgn),
        tokensPerTenUsd: getNum('tokens_per_10_usd', this.DEFAULT_PRICING.tokensPerTenUsd),
        tokensPerTenThousandNgn: getNum('tokens_per_10000_ngn', this.DEFAULT_PRICING.tokensPerTenThousandNgn),
        minOnetimeUsd: getNum('min_onetime_usd', this.DEFAULT_PRICING.minOnetimeUsd),
        minOnetimeNgn: getNum('min_onetime_ngn', this.DEFAULT_PRICING.minOnetimeNgn),
        basicPriceQuarterlyUsd: getNum('basic_price_quarterly_usd', this.DEFAULT_PRICING.basicPriceQuarterlyUsd),
        proPriceQuarterlyUsd: getNum('pro_price_quarterly_usd', this.DEFAULT_PRICING.proPriceQuarterlyUsd),
        premiumPriceQuarterlyUsd: getNum('premium_price_quarterly_usd', this.DEFAULT_PRICING.premiumPriceQuarterlyUsd),
        basicPriceQuarterlyNgn: getNum('basic_price_quarterly_ngn', this.DEFAULT_PRICING.basicPriceQuarterlyNgn),
        proPriceQuarterlyNgn: getNum('pro_price_quarterly_ngn', this.DEFAULT_PRICING.proPriceQuarterlyNgn),
        premiumPriceQuarterlyNgn: getNum('premium_price_quarterly_ngn', this.DEFAULT_PRICING.premiumPriceQuarterlyNgn),
        basicPriceYearlyUsd: getNum('basic_price_yearly_usd', this.DEFAULT_PRICING.basicPriceYearlyUsd),
        proPriceYearlyUsd: getNum('pro_price_yearly_usd', this.DEFAULT_PRICING.proPriceYearlyUsd),
        premiumPriceYearlyUsd: getNum('premium_price_yearly_usd', this.DEFAULT_PRICING.premiumPriceYearlyUsd),
        basicPriceYearlyNgn: getNum('basic_price_yearly_ngn', this.DEFAULT_PRICING.basicPriceYearlyNgn),
        proPriceYearlyNgn: getNum('pro_price_yearly_ngn', this.DEFAULT_PRICING.proPriceYearlyNgn),
        premiumPriceYearlyNgn: getNum('premium_price_yearly_ngn', this.DEFAULT_PRICING.premiumPriceYearlyNgn),
        premiumDailySoftLimit: getNum('premium_daily_soft_limit', this.DEFAULT_PRICING.premiumDailySoftLimit),
        premiumIsUnlimited: getBool('premium_is_unlimited', this.DEFAULT_PRICING.premiumIsUnlimited),
      };

      // Update cache
      this.pricingCache = {
        data: pricingConfig,
        timestamp: now,
      };

      return pricingConfig;
    } catch (error) {
      console.error('[TokenService] Get pricing config error:', error);
      console.warn('[TokenService] Using default pricing values');
      return this.DEFAULT_PRICING;
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
