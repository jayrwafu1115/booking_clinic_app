-- Simplify subscription plans: remove Starter + Enterprise, keep only Pro at PHP 2,999/mo
-- All features are unlimited in Pro. Free trial gives full Pro access for 14 days.

-- Remove old plans (Starter, Enterprise) and their feature restrictions
DELETE FROM subscription_plans WHERE name IN ('Starter', 'Enterprise');

-- Update Pro plan: PHP 2,999/month, unlimited users/doctors, all features enabled
UPDATE subscription_plans
SET
  name                    = 'Pro',
  price_monthly_centavos  = 299900,
  price_annual_centavos   = 0,
  max_users               = 2147483647,
  max_doctors             = 2147483647,
  ai_enabled              = true,
  features                = '["ai_booking","widget","public_website","advanced_reports","sms_notifications"]'::jsonb,
  active                  = true,
  updated_at              = now()
WHERE name = 'Pro';

-- Migrate any existing Starter/Enterprise subscriptions to Pro
UPDATE clinic_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'Pro' LIMIT 1)
WHERE plan_id IS NOT NULL
  AND plan_id NOT IN (SELECT id FROM subscription_plans);
