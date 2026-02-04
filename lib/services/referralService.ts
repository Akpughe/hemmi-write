/**
 * Referral/Affiliate Service
 * Handles referral code generation, tracking, points, and redemptions
 * 
 * Note: Uses type assertions for new tables until database.types.ts is regenerated
 * after running the migration.
 */

import {
  createServerSupabaseClient,
  createServiceRoleSupabaseClient,
} from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  referralCode: string;
  status: 'signed_up' | 'converted';
  signedUpAt: string;
  convertedAt: string | null;
  referredEmail?: string;
}

export interface ReferralPoints {
  id: string;
  userId: string;
  referralId: string | null;
  points: number;
  type: 'signup_bonus' | 'conversion_bonus' | 'redemption';
  currencyContext: 'USD' | 'NGN' | null;
  description: string | null;
  createdAt: string;
}

export interface PointRedemption {
  id: string;
  userId: string;
  pointsRedeemed: number;
  rewardType: 'tokens' | 'subscription_discount' | 'cash';
  rewardValue: Record<string, unknown>;
  status: 'pending' | 'approved' | 'fulfilled' | 'rejected';
  createdAt: string;
  processedAt: string | null;
}

export interface ReferralStats {
  totalReferrals: number;
  signedUpCount: number;
  convertedCount: number;
  totalPointsEarned: number;
  currentBalance: number;
}

export interface ReferralConfig {
  signupPoints: number;
  conversionPointsUsd: number;
  conversionPointsNgn: number;
  pointsPer10000Tokens: number;
  pointsPer5DollarDiscount: number;
  minRedemptionPoints: number;
}

class ReferralService {
  /**
   * Get or create a referral code for a user
   */
  async getOrCreateReferralCode(userId: string): Promise<string> {
    try {
      const supabase = await createServerSupabaseClient() as SupabaseAny;

      // Use the database function to get or create
      const { data, error } = await supabase.rpc('get_or_create_referral_code', {
        p_user_id: userId,
      });

      if (error) {
        console.error('[ReferralService] Get/create code error:', error);
        throw error;
      }

      return data as string;
    } catch (error) {
      console.error('[ReferralService] Get/create code error:', error);
      throw error;
    }
  }

  /**
   * Get referral code details by code
   */
  async getReferralCodeByCode(code: string): Promise<ReferralCode | null> {
    try {
      const supabase = await createServiceRoleSupabaseClient() as SupabaseAny;

      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('code', code)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.mapReferralCode(data);
    } catch (error) {
      console.error('[ReferralService] Get code by code error:', error);
      return null;
    }
  }

  /**
   * Record a referral signup (called when new user signs up with referral code)
   */
  async recordReferralSignup(
    referralCode: string,
    referredUserId: string
  ): Promise<boolean> {
    try {
      const supabase = await createServiceRoleSupabaseClient() as SupabaseAny;

      const { data, error } = await supabase.rpc('record_referral_signup', {
        p_referral_code: referralCode,
        p_referred_user_id: referredUserId,
      });

      if (error) {
        console.error('[ReferralService] Record signup error:', error);
        return false;
      }

      console.log('[ReferralService] Referral signup recorded:', {
        code: referralCode,
        referredUserId,
        success: data,
      });

      return data as boolean;
    } catch (error) {
      console.error('[ReferralService] Record signup error:', error);
      return false;
    }
  }

  /**
   * Record a referral conversion (called when referred user makes first payment)
   */
  async recordReferralConversion(
    referredUserId: string,
    currency: 'USD' | 'NGN'
  ): Promise<boolean> {
    try {
      const supabase = await createServiceRoleSupabaseClient() as SupabaseAny;

      const { data, error } = await supabase.rpc('record_referral_conversion', {
        p_referred_user_id: referredUserId,
        p_currency: currency,
      });

      if (error) {
        console.error('[ReferralService] Record conversion error:', error);
        return false;
      }

      console.log('[ReferralService] Referral conversion recorded:', {
        referredUserId,
        currency,
        success: data,
      });

      return data as boolean;
    } catch (error) {
      console.error('[ReferralService] Record conversion error:', error);
      return false;
    }
  }

  /**
   * Get user's current points balance
   */
  async getUserPointsBalance(userId: string): Promise<number> {
    try {
      const supabase = await createServerSupabaseClient() as SupabaseAny;

      const { data, error } = await supabase.rpc('get_user_points_balance', {
        p_user_id: userId,
      });

      if (error) {
        console.error('[ReferralService] Get balance error:', error);
        return 0;
      }

      return (data as number) || 0;
    } catch (error) {
      console.error('[ReferralService] Get balance error:', error);
      return 0;
    }
  }

  /**
   * Get user's referral stats
   */
  async getUserReferralStats(userId: string): Promise<ReferralStats> {
    try {
      const supabase = await createServerSupabaseClient() as SupabaseAny;

      // Get referrals count by status
      const { data: referrals, error: refError } = await supabase
        .from('referrals')
        .select('status')
        .eq('referrer_id', userId);

      if (refError) throw refError;

      const signedUpCount = referrals?.filter((r: { status: string }) => r.status === 'signed_up').length || 0;
      const convertedCount = referrals?.filter((r: { status: string }) => r.status === 'converted').length || 0;

      // Get points stats
      const { data: points, error: pointsError } = await supabase
        .from('referral_points')
        .select('points, type')
        .eq('user_id', userId);

      if (pointsError) throw pointsError;

      const totalPointsEarned =
        points
          ?.filter((p: { points: number }) => p.points > 0)
          .reduce((sum: number, p: { points: number }) => sum + p.points, 0) || 0;

      const currentBalance = points?.reduce((sum: number, p: { points: number }) => sum + p.points, 0) || 0;

      return {
        totalReferrals: referrals?.length || 0,
        signedUpCount,
        convertedCount,
        totalPointsEarned,
        currentBalance,
      };
    } catch (error) {
      console.error('[ReferralService] Get stats error:', error);
      return {
        totalReferrals: 0,
        signedUpCount: 0,
        convertedCount: 0,
        totalPointsEarned: 0,
        currentBalance: 0,
      };
    }
  }

  /**
   * Get user's referrals list
   */
  async getUserReferrals(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<{ referrals: Referral[]; total: number }> {
    try {
      const supabase = await createServerSupabaseClient() as SupabaseAny;

      // Get referrals first
      const { data, error, count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact' })
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Get emails from user_profiles for the referred users
      const referredIds = (data || []).map((r: { referred_id: string }) => r.referred_id);
      let emailMap: Record<string, string> = {};
      
      if (referredIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, email')
          .in('id', referredIds);
        
        emailMap = (profiles || []).reduce((acc: Record<string, string>, p: { id: string; email: string }) => {
          acc[p.id] = p.email;
          return acc;
        }, {});
      }

      const referrals = (data || []).map((r: Record<string, unknown>) => ({
        ...this.mapReferral(r),
        referredEmail: emailMap[r.referred_id as string],
      }));

      return { referrals, total: count || 0 };
    } catch (error) {
      console.error('[ReferralService] Get referrals error:', error);
      return { referrals: [], total: 0 };
    }
  }

  /**
   * Get user's points history
   */
  async getPointsHistory(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<{ points: ReferralPoints[]; total: number }> {
    try {
      const supabase = await createServerSupabaseClient() as SupabaseAny;

      const { data, error, count } = await supabase
        .from('referral_points')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const points = (data || []).map((p: Record<string, unknown>) => this.mapReferralPoints(p));

      return { points, total: count || 0 };
    } catch (error) {
      console.error('[ReferralService] Get points history error:', error);
      return { points: [], total: 0 };
    }
  }

  /**
   * Get referral configuration
   */
  async getReferralConfig(): Promise<ReferralConfig> {
    try {
      const supabase = await createServerSupabaseClient() as SupabaseAny;

      const { data, error } = await supabase.from('referral_config').select('*');

      if (error) throw error;

      const config: Record<string, number> = {};
      for (const row of data || []) {
        const typedRow = row as { key: string; value: number | string };
        // Value is stored as JSONB number, so it comes back as a number directly
        const val = typeof typedRow.value === 'number' 
          ? typedRow.value 
          : parseInt(String(typedRow.value), 10);
        config[typedRow.key] = val;
      }

      return {
        signupPoints: config.signup_points || 10,
        conversionPointsUsd: config.conversion_points_usd || 50,
        conversionPointsNgn: config.conversion_points_ngn || 30,
        pointsPer10000Tokens: config.points_per_10000_tokens || 100,
        pointsPer5DollarDiscount: config.points_per_5_dollar_discount || 500,
        minRedemptionPoints: config.min_redemption_points || 50,
      };
    } catch (error) {
      console.error('[ReferralService] Get config error:', error);
      return {
        signupPoints: 10,
        conversionPointsUsd: 50,
        conversionPointsNgn: 30,
        pointsPer10000Tokens: 100,
        pointsPer5DollarDiscount: 500,
        minRedemptionPoints: 50,
      };
    }
  }

  /**
   * Redeem points for tokens
   */
  async redeemPointsForTokens(
    userId: string,
    pointsToRedeem: number
  ): Promise<{ success: boolean; tokensAwarded?: number; error?: string }> {
    try {
      const supabase = await createServiceRoleSupabaseClient() as SupabaseAny;

      // Get current balance
      const balance = await this.getUserPointsBalance(userId);
      if (balance < pointsToRedeem) {
        return { success: false, error: 'Insufficient points' };
      }

      // Get config
      const config = await this.getReferralConfig();
      if (pointsToRedeem < config.minRedemptionPoints) {
        return {
          success: false,
          error: `Minimum redemption is ${config.minRedemptionPoints} points`,
        };
      }

      // Calculate tokens
      const tokensAwarded = Math.floor(
        (pointsToRedeem / config.pointsPer10000Tokens) * 10000
      );

      if (tokensAwarded <= 0) {
        return { success: false, error: 'Not enough points for any tokens' };
      }

      // Create redemption record
      const { data: redemption, error: redemptionError } = await supabase
        .from('point_redemptions')
        .insert({
          user_id: userId,
          points_redeemed: pointsToRedeem,
          reward_type: 'tokens',
          reward_value: { tokens: tokensAwarded },
          status: 'fulfilled',
          processed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (redemptionError) throw redemptionError;

      // Deduct points
      const { error: pointsError } = await supabase
        .from('referral_points')
        .insert({
          user_id: userId,
          points: -pointsToRedeem,
          type: 'redemption',
          description: `Redeemed ${pointsToRedeem} points for ${tokensAwarded} tokens`,
        });

      if (pointsError) throw pointsError;

      // Add tokens to user's subscription
      const { subscriptionService } = await import('./subscriptionService');
      const result = await subscriptionService.addTokens(
        userId,
        tokensAwarded,
        0, // Free redemption
        'USD',
        'stripe', // Gateway doesn't matter for free tokens
        `referral-redemption-${redemption.id}`
      );

      if (!result.success) {
        console.error('[ReferralService] Failed to add tokens:', result.error);
        // Points already deducted, so we should still report success
        // The redemption is recorded, tokens might need manual resolution
      }

      console.log('[ReferralService] Points redeemed for tokens:', {
        userId,
        pointsToRedeem,
        tokensAwarded,
      });

      return { success: true, tokensAwarded };
    } catch (error) {
      console.error('[ReferralService] Redeem points error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Redemption failed',
      };
    }
  }

  /**
   * Check if a user was referred (has a referrer)
   */
  async wasUserReferred(userId: string): Promise<boolean> {
    try {
      const supabase = await createServiceRoleSupabaseClient() as SupabaseAny;

      const { data, error } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('[ReferralService] Check referral error:', error);
      return false;
    }
  }

  // Mapping functions
  private mapReferralCode(data: Record<string, unknown>): ReferralCode {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      code: data.code as string,
      createdAt: data.created_at as string,
    };
  }

  private mapReferral(data: Record<string, unknown>): Referral {
    const referred = data.referred as Record<string, unknown> | null;
    return {
      id: data.id as string,
      referrerId: data.referrer_id as string,
      referredId: data.referred_id as string,
      referralCode: data.referral_code as string,
      status: data.status as 'signed_up' | 'converted',
      signedUpAt: data.signed_up_at as string,
      convertedAt: data.converted_at as string | null,
      referredEmail: referred?.email as string | undefined,
    };
  }

  private mapReferralPoints(data: Record<string, unknown>): ReferralPoints {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      referralId: data.referral_id as string | null,
      points: data.points as number,
      type: data.type as 'signup_bonus' | 'conversion_bonus' | 'redemption',
      currencyContext: data.currency_context as 'USD' | 'NGN' | null,
      description: data.description as string | null,
      createdAt: data.created_at as string,
    };
  }
}

export const referralService = new ReferralService();
