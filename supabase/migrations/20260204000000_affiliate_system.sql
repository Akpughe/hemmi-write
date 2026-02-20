-- ============================================================================
-- HEMMI AI AFFILIATE/REFERRAL SYSTEM
-- Migration: Referral tables for tracking invites, points, and redemptions
-- Created: 2026-02-04
-- ============================================================================

-- ============================================================================
-- 1. REFERRAL CODES TABLE
-- Each user gets a unique referral code
-- ============================================================================
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);

-- ============================================================================
-- 2. REFERRALS TABLE
-- Tracks who referred whom
-- ============================================================================
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'signed_up' CHECK (status IN ('signed_up', 'converted')),
  signed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT referrals_unique_pair UNIQUE(referrer_id, referred_id)
);

CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- ============================================================================
-- 3. REFERRAL POINTS TABLE
-- Point transactions ledger (positive = earned, negative = redeemed)
-- ============================================================================
CREATE TABLE referral_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('signup_bonus', 'conversion_bonus', 'redemption')),
  currency_context TEXT CHECK (currency_context IN ('USD', 'NGN')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_points_user_id ON referral_points(user_id, created_at DESC);
CREATE INDEX idx_referral_points_type ON referral_points(type);

-- ============================================================================
-- 4. POINT REDEMPTIONS TABLE
-- Track redemption requests and fulfillment
-- ============================================================================
CREATE TABLE point_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_redeemed INTEGER NOT NULL CHECK (points_redeemed > 0),
  reward_type TEXT NOT NULL CHECK (reward_type IN ('tokens', 'subscription_discount', 'cash')),
  reward_value JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'fulfilled', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_point_redemptions_user_id ON point_redemptions(user_id, created_at DESC);
CREATE INDEX idx_point_redemptions_status ON point_redemptions(status);

-- ============================================================================
-- 5. REFERRAL CONFIG TABLE
-- Admin-configurable point values
-- ============================================================================
CREATE TABLE referral_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_config_key ON referral_config(key);

-- Insert default configuration values (stored as JSON numbers)
INSERT INTO referral_config (key, value, description) VALUES
  ('signup_points', '10'::jsonb, 'Points earned per referred signup'),
  ('conversion_points_usd', '50'::jsonb, 'Points earned when referral pays in USD'),
  ('conversion_points_ngn', '30'::jsonb, 'Points earned when referral pays in NGN'),
  ('points_per_10000_tokens', '100'::jsonb, 'Points needed to redeem 10,000 tokens'),
  ('points_per_5_dollar_discount', '500'::jsonb, 'Points needed for $5 subscription discount'),
  ('min_redemption_points', '50'::jsonb, 'Minimum points required to redeem');

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function: Generate a unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function: Get or create referral code for user
CREATE OR REPLACE FUNCTION get_or_create_referral_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_attempts INTEGER := 0;
BEGIN
  -- Check if user already has a code
  SELECT code INTO v_code FROM referral_codes WHERE user_id = p_user_id;
  
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;
  
  -- Generate new unique code
  LOOP
    v_code := generate_referral_code();
    v_attempts := v_attempts + 1;
    
    BEGIN
      INSERT INTO referral_codes (user_id, code) VALUES (p_user_id, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts > 10 THEN
        RAISE EXCEPTION 'Could not generate unique referral code';
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user's total points balance
CREATE OR REPLACE FUNCTION get_user_points_balance(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT COALESCE(SUM(points), 0) INTO v_balance
  FROM referral_points
  WHERE user_id = p_user_id;
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get referral config value
CREATE OR REPLACE FUNCTION get_referral_config(p_key TEXT)
RETURNS JSONB AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT value INTO v_value FROM referral_config WHERE key = p_key;
  RETURN v_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Record a referral signup
CREATE OR REPLACE FUNCTION record_referral_signup(
  p_referral_code TEXT,
  p_referred_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_id UUID;
  v_signup_points INTEGER;
BEGIN
  -- Get referrer from code
  SELECT user_id INTO v_referrer_id
  FROM referral_codes
  WHERE code = p_referral_code;
  
  IF v_referrer_id IS NULL THEN
    RETURN FALSE; -- Invalid code
  END IF;
  
  -- Don't allow self-referral
  IF v_referrer_id = p_referred_user_id THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user was already referred
  IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = p_referred_user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, referral_code, status)
  VALUES (v_referrer_id, p_referred_user_id, p_referral_code, 'signed_up')
  RETURNING id INTO v_referral_id;
  
  -- Get signup points from config (value is stored as JSONB number)
  SELECT (value::text)::integer INTO v_signup_points
  FROM referral_config WHERE key = 'signup_points';
  
  v_signup_points := COALESCE(v_signup_points, 10);
  
  -- Award signup points to referrer
  INSERT INTO referral_points (user_id, referral_id, points, type, description)
  VALUES (v_referrer_id, v_referral_id, v_signup_points, 'signup_bonus', 'Referral signup bonus');
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Record a referral conversion (first payment)
CREATE OR REPLACE FUNCTION record_referral_conversion(
  p_referred_user_id UUID,
  p_currency TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_referral RECORD;
  v_conversion_points INTEGER;
  v_config_key TEXT;
BEGIN
  -- Get the referral record
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = p_referred_user_id
    AND status = 'signed_up';
  
  IF v_referral IS NULL THEN
    RETURN FALSE; -- No pending referral or already converted
  END IF;
  
  -- Determine points based on currency
  IF p_currency = 'USD' THEN
    v_config_key := 'conversion_points_usd';
  ELSE
    v_config_key := 'conversion_points_ngn';
  END IF;
  
  SELECT (value::text)::integer INTO v_conversion_points
  FROM referral_config WHERE key = v_config_key;
  
  v_conversion_points := COALESCE(v_conversion_points, 30);
  
  -- Update referral status
  UPDATE referrals
  SET status = 'converted', converted_at = NOW()
  WHERE id = v_referral.id;
  
  -- Award conversion points to referrer
  INSERT INTO referral_points (user_id, referral_id, points, type, currency_context, description)
  VALUES (v_referral.referrer_id, v_referral.id, v_conversion_points, 'conversion_bonus', p_currency, 
          'Referral conversion bonus (' || p_currency || ')');
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_config ENABLE ROW LEVEL SECURITY;

-- Referral codes: Users can read their own, anyone can lookup by code
CREATE POLICY "Users can read own referral code"
  ON referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can lookup referral code"
  ON referral_codes FOR SELECT
  USING (true);

-- Referrals: Users can see referrals they made
CREATE POLICY "Users can read referrals they made"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id);

-- Referral points: Users can read their own points
CREATE POLICY "Users can read own points"
  ON referral_points FOR SELECT
  USING (auth.uid() = user_id);

-- Point redemptions: Users can read and create their own
CREATE POLICY "Users can read own redemptions"
  ON point_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create redemptions"
  ON point_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Referral config: Anyone can read (public config)
CREATE POLICY "Anyone can read referral config"
  ON referral_config FOR SELECT
  USING (true);

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- Trigger: Auto-update referral_config updated_at
CREATE TRIGGER referral_config_updated_at
  BEFORE UPDATE ON referral_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
