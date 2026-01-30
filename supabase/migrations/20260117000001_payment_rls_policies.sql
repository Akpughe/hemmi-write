-- ============================================================================
-- ROW LEVEL SECURITY POLICIES FOR PAYMENT SYSTEM
-- Migration: Enable RLS and create policies for payment tables
-- Created: 2025-01-17
-- ============================================================================

-- ============================================================================
-- 1. PRICING_CONFIG - READ-ONLY FOR ALL AUTHENTICATED USERS
-- Only admins (via service role) can update
-- ============================================================================
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read pricing config
CREATE POLICY pricing_config_select_authenticated ON pricing_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Only allow inserts via service role (no policy = service role only)
-- Only allow updates via service role (no policy = service role only)
-- Only allow deletes via service role (no policy = service role only)

-- ============================================================================
-- 2. SUBSCRIPTIONS - USERS OWN THEIR SUBSCRIPTIONS
-- ============================================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY subscriptions_select_own ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own subscriptions (via payment flow)
CREATE POLICY subscriptions_insert_own ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions (e.g., cancellation)
CREATE POLICY subscriptions_update_own ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No delete policy - subscriptions should be soft-deleted (status = 'expired')

-- ============================================================================
-- 3. TOKEN_USAGE - READ-ONLY FOR USERS, INSERT VIA SERVICE
-- ============================================================================
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage history
CREATE POLICY token_usage_select_own ON token_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Token usage inserts happen via service role (deduct_user_tokens function)
-- No insert policy for authenticated users = function runs with SECURITY DEFINER

-- No update or delete - usage history is immutable

-- ============================================================================
-- 4. PAYMENT_HISTORY - READ-ONLY FOR USERS
-- ============================================================================
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment history
CREATE POLICY payment_history_select_own ON payment_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Payment history inserts happen via service role (webhook handlers)
-- No insert policy for authenticated users

-- No update or delete - payment history is immutable audit log

-- ============================================================================
-- GRANT PERMISSIONS TO AUTHENTICATED ROLE
-- ============================================================================

-- Grant SELECT on pricing_config to authenticated users
GRANT SELECT ON pricing_config TO authenticated;

-- Grant CRUD on subscriptions to authenticated users (RLS will filter)
GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;

-- Grant SELECT on token_usage to authenticated users (RLS will filter)
GRANT SELECT ON token_usage TO authenticated;

-- Grant SELECT on payment_history to authenticated users (RLS will filter)
GRANT SELECT ON payment_history TO authenticated;

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
-- 1. pricing_config: Readable by all, writable only via service role
-- 2. subscriptions: Full CRUD for own records, RLS enforced
-- 3. token_usage: Read-only for users, inserts via SECURITY DEFINER function
-- 4. payment_history: Read-only for users, inserts via service role (webhooks)
-- 5. All webhook operations must use service role client to bypass RLS
-- 6. Token deduction uses SECURITY DEFINER function for atomic operations
-- ============================================================================
