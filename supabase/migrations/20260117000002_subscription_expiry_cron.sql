-- ============================================================================
-- SUBSCRIPTION EXPIRY CRON JOB
-- Automatically marks expired subscriptions as 'expired' and resets tokens
-- Created: 2025-01-17
-- ============================================================================

-- ============================================================================
-- 1. CREATE FUNCTION TO MARK EXPIRED SUBSCRIPTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION mark_expired_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update subscriptions that have passed their end date
  -- Only mark as expired if they're active and auto_renew is false
  UPDATE subscriptions
  SET
    status = 'expired',
    tokens_remaining = 0,
    updated_at = NOW()
  WHERE
    status = 'active'
    AND auto_renew = FALSE
    AND current_period_end < NOW();

  -- Get count of updated rows
  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- Log the operation
  RAISE NOTICE 'Marked % subscription(s) as expired', expired_count;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. SCHEDULE CRON JOB (if pg_cron is available)
-- Note: pg_cron extension must be enabled on your Supabase instance
-- This is available on Supabase Pro plan and above
-- ============================================================================

-- Check if pg_cron extension is available
-- If not available, you'll need to use an external cron service

-- Enable pg_cron extension (only if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job to run daily at 2 AM UTC
-- Uncomment if pg_cron is available:
/*
SELECT cron.schedule(
  'mark-expired-subscriptions',
  '0 2 * * *', -- Runs at 2:00 AM UTC every day
  $$SELECT mark_expired_subscriptions();$$
);
*/

-- ============================================================================
-- 3. ALTERNATIVE: API ROUTE + EXTERNAL CRON
-- If pg_cron is not available, create an API route and call it with:
-- - Vercel Cron (for Vercel deployments)
-- - GitHub Actions (free cron)
-- - Any external cron service
-- ============================================================================

-- Grant execute permission to authenticated users (API route will use service role)
GRANT EXECUTE ON FUNCTION mark_expired_subscriptions() TO authenticated;

-- ============================================================================
-- 4. MANUAL EXECUTION (for testing)
-- ============================================================================
-- To manually test the function, run:
-- SELECT mark_expired_subscriptions();

-- ============================================================================
-- 5. FUNCTION TO CHECK UPCOMING EXPIRATIONS (optional)
-- Useful for sending reminder emails
-- ============================================================================
CREATE OR REPLACE FUNCTION get_upcoming_expirations(days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
  subscription_id UUID,
  user_id UUID,
  plan_type TEXT,
  current_period_end TIMESTAMPTZ,
  days_until_expiry INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS subscription_id,
    s.user_id,
    s.plan_type,
    s.current_period_end,
    EXTRACT(DAY FROM (s.current_period_end - NOW()))::INTEGER AS days_until_expiry
  FROM subscriptions s
  WHERE
    s.status = 'active'
    AND s.auto_renew = FALSE
    AND s.current_period_end > NOW()
    AND s.current_period_end < NOW() + (days_ahead || ' days')::INTERVAL
  ORDER BY s.current_period_end ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_upcoming_expirations(INTEGER) TO authenticated;

-- ============================================================================
-- 6. FUNCTION TO REACTIVATE SUBSCRIPTION (for manual intervention)
-- ============================================================================
CREATE OR REPLACE FUNCTION reactivate_subscription(
  p_subscription_id UUID,
  p_new_period_end TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE subscriptions
  SET
    status = 'active',
    current_period_end = p_new_period_end,
    updated_at = NOW()
  WHERE id = p_subscription_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role only (admin operation)
-- GRANT EXECUTE ON FUNCTION reactivate_subscription(UUID, TIMESTAMPTZ) TO service_role;

-- ============================================================================
-- TESTING & MONITORING
-- ============================================================================

-- To test: Create a test subscription that's already expired
-- INSERT INTO subscriptions (...)
-- Then run: SELECT mark_expired_subscriptions();

-- To monitor upcoming expirations:
-- SELECT * FROM get_upcoming_expirations(7);

-- To check last run (if using pg_cron):
-- SELECT * FROM cron.job_run_details WHERE jobid = (
--   SELECT jobid FROM cron.job WHERE jobname = 'mark-expired-subscriptions'
-- ) ORDER BY start_time DESC LIMIT 10;

-- ============================================================================
-- CLEANUP (Optional - for removing the cron job)
-- ============================================================================
-- To remove the cron job:
-- SELECT cron.unschedule('mark-expired-subscriptions');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
