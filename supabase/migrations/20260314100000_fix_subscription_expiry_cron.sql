-- ============================================================================
-- FIX SUBSCRIPTION EXPIRY CRON
-- Removes auto_renew condition so ALL expired subscriptions are caught.
-- Enables pg_cron and schedules daily execution.
-- Created: 2026-03-14
-- ============================================================================

-- 1. Replace function: expire ALL active subscriptions past their end date
CREATE OR REPLACE FUNCTION mark_expired_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE subscriptions
  SET
    status = 'expired',
    tokens_remaining = 0,
    updated_at = NOW()
  WHERE
    status = 'active'
    AND current_period_end < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RAISE NOTICE 'Marked % subscription(s) as expired', expired_count;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Schedule daily at 2 AM UTC
SELECT cron.schedule(
  'mark-expired-subscriptions',
  '0 2 * * *',
  $$SELECT mark_expired_subscriptions();$$
);
