-- Replace free-trial model with freemium (permanent free tier with feature limits).
-- Free tier: 10 patients, 1 doctor, 2 services, no SMS, no AI, no public website.

-- 1. Drop the old CHECK constraint first.
ALTER TABLE clinic_subscriptions
  DROP CONSTRAINT IF EXISTS clinic_subscriptions_status_check;

-- 2. Migrate all existing trial rows to free BEFORE the new constraint is applied.
UPDATE clinic_subscriptions
  SET status = 'free', trial_ends_at = NULL
  WHERE status = 'trial';

-- 3. Add the new CHECK constraint (no rows with 'trial' remain).
ALTER TABLE clinic_subscriptions
  ADD CONSTRAINT clinic_subscriptions_status_check
  CHECK (status IN ('free','active','past_due','cancelled','suspended'));

-- 3. Update the auto-create trigger function to start clinics on 'free' status.
CREATE OR REPLACE FUNCTION create_clinic_trial_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO clinic_subscriptions (clinic_id, status)
  VALUES (NEW.id, 'free')
  ON CONFLICT (clinic_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4. Update get_platform_metrics RPC: rename trial_subscriptions → free_subscriptions.
CREATE OR REPLACE FUNCTION get_platform_metrics()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;

  SELECT jsonb_build_object(
    'total_clinics',          (SELECT count(*) FROM clinics),
    'active_clinics',         (SELECT count(*) FROM clinics WHERE status = 'active'),
    'inactive_clinics',       (SELECT count(*) FROM clinics WHERE status = 'inactive'),
    'suspended_clinics',      (SELECT count(*) FROM clinics WHERE status = 'suspended'),
    'free_subscriptions',     (SELECT count(*) FROM clinic_subscriptions WHERE status = 'free'),
    'active_subscriptions',   (SELECT count(*) FROM clinic_subscriptions WHERE status = 'active'),
    'past_due_subscriptions', (SELECT count(*) FROM clinic_subscriptions WHERE status = 'past_due'),
    'cancelled_subscriptions',(SELECT count(*) FROM clinic_subscriptions WHERE status = 'cancelled'),
    'total_users',            (SELECT count(*) FROM profiles WHERE status = 'active'),
    'total_appointments',     (SELECT count(*) FROM appointments),
    'total_ai_conversations', (SELECT count(*) FROM ai_conversations),
    'total_ai_messages',      (SELECT count(*) FROM ai_messages)
  ) INTO result;

  RETURN result;
END;
$$;
