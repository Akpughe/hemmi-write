-- Migration: Free tier signup
-- Allows 'free' plan type and 'none' payment gateway in subscriptions,
-- makes payment columns nullable, updates the handle_new_user trigger
-- to auto-create a free subscription, and backfills existing users.

-- Allow 'free' plan type
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type IN ('basic', 'pro', 'premium', 'one_time', 'free'));

-- Allow 'none' payment gateway
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_payment_gateway_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_payment_gateway_check
  CHECK (payment_gateway IN ('paystack', 'stripe', 'none'));

-- Make payment columns nullable for free tier
ALTER TABLE subscriptions ALTER COLUMN currency DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN amount_paid DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN payment_gateway DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN current_period_end DROP NOT NULL;

-- Update handle_new_user trigger to create free subscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');

  INSERT INTO public.subscriptions (user_id, plan_type, billing_cycle, token_allocation, tokens_remaining, currency, amount_paid, payment_gateway, status, auto_renew, current_period_start, current_period_end)
  VALUES (NEW.id, 'free', NULL, 20000, 20000, NULL, NULL, NULL, 'active', FALSE, NOW(), NULL);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing users who have no subscription record
INSERT INTO subscriptions (user_id, plan_type, token_allocation, tokens_remaining, status, auto_renew, current_period_start)
SELECT up.id, 'free', 20000, 20000, 'active', FALSE, NOW()
FROM user_profiles up
WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = up.id);
