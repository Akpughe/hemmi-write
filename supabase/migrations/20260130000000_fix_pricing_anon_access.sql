-- ============================================================================
-- FIX: Allow anonymous users to read pricing_config
-- Migration: Add RLS policy for anon role
-- Created: 2026-01-30
-- ============================================================================

-- Pricing should be publicly visible (not a secret)
-- Add policy for anonymous users to read pricing config
CREATE POLICY pricing_config_select_anon ON pricing_config
  FOR SELECT
  TO anon
  USING (true);

-- Grant SELECT permission to anon role
GRANT SELECT ON pricing_config TO anon;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
