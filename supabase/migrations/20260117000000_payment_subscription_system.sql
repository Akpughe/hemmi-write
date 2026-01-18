-- ============================================================================
-- HEMMI AI PAYMENT & SUBSCRIPTION SYSTEM
-- Migration: Payment tables with Paystack + Stripe support
-- Created: 2025-01-17
-- ============================================================================

-- ============================================================================
-- 1. PRICING CONFIGURATION TABLE
-- Stores all adjustable pricing parameters (admin-configurable)
-- ============================================================================
CREATE TABLE pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create index for fast key lookups
CREATE INDEX idx_pricing_config_key ON pricing_config(key);

-- Insert default pricing values (updated pricing structure)
INSERT INTO pricing_config (key, value, description) VALUES
  -- Token allocation per plan (monthly)
  ('basic_tokens', '165000', 'Basic plan monthly token allocation (~125k words)'),
  ('pro_tokens', '665000', 'Pro plan monthly token allocation (~500k words)'),
  ('premium_tokens', '3000000', 'Premium plan soft limit for fair use (~2.25M words)'),

  -- Subscription pricing (USD)
  ('basic_price_usd', '20.00', 'Basic plan monthly price in USD'),
  ('pro_price_usd', '37.50', 'Pro plan monthly price in USD'),
  ('premium_price_usd', '70.00', 'Premium plan monthly price in USD'),

  -- Subscription pricing (NGN)
  ('basic_price_ngn', '30000.00', 'Basic plan monthly price in NGN'),
  ('pro_price_ngn', '56250.00', 'Pro plan monthly price in NGN'),
  ('premium_price_ngn', '105000.00', 'Premium plan monthly price in NGN'),

  -- One-time token purchase rates
  ('tokens_per_10_usd', '20000', 'Tokens per $10 one-time purchase'),
  ('tokens_per_10000_ngn', '20000', 'Tokens per ₦10,000 one-time purchase'),
  ('min_onetime_usd', '10.00', 'Minimum one-time payment in USD'),
  ('min_onetime_ngn', '10000.00', 'Minimum one-time payment in NGN'),

  -- Quarterly pricing (15% discount)
  ('basic_price_quarterly_usd', '51.00', 'Basic quarterly ($17/month equivalent)'),
  ('pro_price_quarterly_usd', '95.63', 'Pro quarterly ($31.88/month equivalent)'),
  ('premium_price_quarterly_usd', '178.50', 'Premium quarterly ($59.50/month equivalent)'),
  ('basic_price_quarterly_ngn', '76500.00', 'Basic quarterly in NGN'),
  ('pro_price_quarterly_ngn', '143437.50', 'Pro quarterly in NGN'),
  ('premium_price_quarterly_ngn', '267750.00', 'Premium quarterly in NGN'),

  -- Yearly pricing (25% discount)
  ('basic_price_yearly_usd', '180.00', 'Basic yearly ($15/month equivalent)'),
  ('pro_price_yearly_usd', '337.50', 'Pro yearly ($28.13/month equivalent)'),
  ('premium_price_yearly_usd', '630.00', 'Premium yearly ($52.50/month equivalent)'),
  ('basic_price_yearly_ngn', '270000.00', 'Basic yearly in NGN'),
  ('pro_price_yearly_ngn', '506250.00', 'Pro yearly in NGN'),
  ('premium_price_yearly_ngn', '945000.00', 'Premium yearly in NGN'),

  -- Premium fair use limits
  ('premium_daily_soft_limit', '100000', 'Premium daily soft limit before cooldown'),
  ('premium_is_unlimited', 'true', 'Premium marketed as unlimited with fair use');

-- ============================================================================
-- 2. SUBSCRIPTIONS TABLE
-- User subscription records with token allocation
-- ============================================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Plan Information
  plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'pro', 'premium', 'one_time')),
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),

  -- Token Allocation
  token_allocation INTEGER NOT NULL,
  tokens_remaining INTEGER NOT NULL,

  -- Payment Information
  currency TEXT NOT NULL CHECK (currency IN ('NGN', 'USD')),
  amount_paid DECIMAL(12, 2) NOT NULL,
  payment_gateway TEXT NOT NULL CHECK (payment_gateway IN ('paystack', 'stripe')),
  gateway_subscription_id TEXT,
  gateway_customer_id TEXT,

  -- Status Management
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  auto_renew BOOLEAN DEFAULT TRUE,

  -- Dates
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end) WHERE status = 'active';
CREATE INDEX idx_subscriptions_gateway_id ON subscriptions(gateway_subscription_id);

-- Unique constraint: only one active subscription per user
CREATE UNIQUE INDEX idx_one_active_subscription ON subscriptions(user_id)
  WHERE status = 'active';

-- ============================================================================
-- 3. TOKEN USAGE TABLE
-- Track all token consumption with detailed metadata
-- ============================================================================
CREATE TABLE token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  project_id UUID REFERENCES writing_projects(id) ON DELETE SET NULL,

  -- Usage Details
  operation_type TEXT NOT NULL, -- 'research', 'structure', 'chapter', 'chat', etc.
  tokens_used INTEGER NOT NULL CHECK (tokens_used > 0),
  tokens_before INTEGER NOT NULL,
  tokens_after INTEGER NOT NULL,

  -- Context & Metadata
  metadata JSONB, -- chapter name, word count, model used, etc.

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics and user queries
CREATE INDEX idx_token_usage_user_created ON token_usage(user_id, created_at DESC);
CREATE INDEX idx_token_usage_operation ON token_usage(operation_type);
CREATE INDEX idx_token_usage_subscription ON token_usage(subscription_id);

-- ============================================================================
-- 4. PAYMENT HISTORY TABLE
-- Complete audit log of all payment transactions
-- ============================================================================
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Transaction Details
  transaction_id TEXT NOT NULL UNIQUE,
  payment_gateway TEXT NOT NULL CHECK (payment_gateway IN ('paystack', 'stripe')),
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('NGN', 'USD')),

  -- Token Purchase
  tokens_purchased INTEGER NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('subscription', 'one_time', 'top_up', 'renewal')),

  -- Status & Error Handling
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  failure_reason TEXT,

  -- Gateway Response (for debugging/reconciliation)
  gateway_response JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for transaction lookup and reporting
CREATE INDEX idx_payment_history_user ON payment_history(user_id, created_at DESC);
CREATE INDEX idx_payment_history_transaction ON payment_history(transaction_id);
CREATE INDEX idx_payment_history_status ON payment_history(status);
CREATE INDEX idx_payment_history_gateway ON payment_history(payment_gateway);

-- ============================================================================
-- 5. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on subscriptions
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at on payment_history
CREATE TRIGGER payment_history_updated_at
  BEFORE UPDATE ON payment_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at on pricing_config
CREATE TRIGGER pricing_config_updated_at
  BEFORE UPDATE ON pricing_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function: Get user's current active subscription with token balance
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  plan_type TEXT,
  billing_cycle TEXT,
  tokens_remaining INTEGER,
  token_allocation INTEGER,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  auto_renew BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.plan_type,
    s.billing_cycle,
    s.tokens_remaining,
    s.token_allocation,
    s.status,
    s.current_period_end,
    s.auto_renew
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Deduct tokens from user's subscription
CREATE OR REPLACE FUNCTION deduct_user_tokens(
  p_user_id UUID,
  p_tokens INTEGER,
  p_operation_type TEXT,
  p_metadata JSONB DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_subscription_id UUID;
  v_tokens_before INTEGER;
  v_tokens_after INTEGER;
BEGIN
  -- Get active subscription
  SELECT id, tokens_remaining
  INTO v_subscription_id, v_tokens_before
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE; -- Lock row for update

  -- Check if subscription exists and has enough tokens
  IF v_subscription_id IS NULL THEN
    RETURN FALSE; -- No active subscription
  END IF;

  IF v_tokens_before < p_tokens THEN
    RETURN FALSE; -- Insufficient tokens
  END IF;

  -- Deduct tokens
  v_tokens_after := v_tokens_before - p_tokens;

  UPDATE subscriptions
  SET tokens_remaining = v_tokens_after
  WHERE id = v_subscription_id;

  -- Record usage
  INSERT INTO token_usage (
    user_id,
    subscription_id,
    project_id,
    operation_type,
    tokens_used,
    tokens_before,
    tokens_after,
    metadata
  ) VALUES (
    p_user_id,
    v_subscription_id,
    p_project_id,
    p_operation_type,
    p_tokens,
    v_tokens_before,
    v_tokens_after,
    p_metadata
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
