-- ============================================================================
-- POPULATE PRICING CONFIGURATION WITH DEFAULT VALUES
-- Run this IMMEDIATELY to enable the pricing page and payment system
-- ============================================================================

-- Insert default pricing values (based on updated pricing structure)
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
  ('premium_is_unlimited', 'true', 'Premium marketed as unlimited with fair use')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verify insertion
SELECT COUNT(*) as pricing_config_count FROM pricing_config;
