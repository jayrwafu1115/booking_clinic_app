-- Phase 8: Analytics, Reports, and Super Admin
-- Adds subscription_plans, clinic_subscriptions, and helper RPC for super admin platform metrics.

-- ─── Subscription plans ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,                     -- e.g. "Starter", "Pro", "Enterprise"
  price_monthly_centavos bigint NOT NULL DEFAULT 0,
  price_annual_centavos  bigint NOT NULL DEFAULT 0,
  max_users     int  NOT NULL DEFAULT 5,
  max_doctors   int  NOT NULL DEFAULT 3,
  ai_enabled    boolean NOT NULL DEFAULT false,
  features      jsonb NOT NULL DEFAULT '[]',
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Seed default plans
INSERT INTO subscription_plans (name, price_monthly_centavos, price_annual_centavos, max_users, max_doctors, ai_enabled)
VALUES
  ('Starter',    49900,  499900,  5,  2, false),
  ('Pro',        99900,  999900,  15, 10, true),
  ('Enterprise', 199900, 1999900, 100, 50, true)
ON CONFLICT DO NOTHING;

-- ─── Clinic subscriptions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  plan_id       uuid REFERENCES subscription_plans(id),
  status        text NOT NULL DEFAULT 'trial'
                  CHECK (status IN ('trial','active','past_due','cancelled','suspended')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  paymongo_subscription_id text,
  paymongo_customer_id     text,
  cancelled_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id)
);

-- Auto-create a trial subscription when a clinic is created
CREATE OR REPLACE FUNCTION create_clinic_trial_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO clinic_subscriptions (clinic_id, status, trial_ends_at)
  VALUES (NEW.id, 'trial', now() + interval '14 days')
  ON CONFLICT (clinic_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_clinic_created_create_trial ON clinics;
CREATE TRIGGER on_clinic_created_create_trial
  AFTER INSERT ON clinics
  FOR EACH ROW EXECUTE FUNCTION create_clinic_trial_subscription();

-- ─── RLS for new tables ────────────────────────────────────────────────────────
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_subscriptions ENABLE ROW LEVEL SECURITY;

-- subscription_plans: public read, super_admin write
DROP POLICY IF EXISTS "Everyone can read plans" ON subscription_plans;
CREATE POLICY "Everyone can read plans"
  ON subscription_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super admins manage plans" ON subscription_plans;
CREATE POLICY "Super admins manage plans"
  ON subscription_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin' AND status = 'active'
    )
  );

-- clinic_subscriptions: clinic_owner/staff can read their own, super_admin reads all
DROP POLICY IF EXISTS "Clinic members read own subscription" ON clinic_subscriptions;
CREATE POLICY "Clinic members read own subscription"
  ON clinic_subscriptions FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin' AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Super admins manage subscriptions" ON clinic_subscriptions;
CREATE POLICY "Super admins manage subscriptions"
  ON clinic_subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin' AND status = 'active'
    )
  );

-- ─── Super admin platform metrics RPC ─────────────────────────────────────────
-- Returns aggregated platform-wide metrics for super admin dashboard.
CREATE OR REPLACE FUNCTION get_platform_metrics()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only callable by super admins
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT jsonb_build_object(
    'total_clinics',         (SELECT count(*) FROM clinics),
    'active_clinics',        (SELECT count(*) FROM clinics WHERE status = 'active'),
    'inactive_clinics',      (SELECT count(*) FROM clinics WHERE status = 'inactive'),
    'suspended_clinics',     (SELECT count(*) FROM clinics WHERE status = 'suspended'),
    'trial_subscriptions',   (SELECT count(*) FROM clinic_subscriptions WHERE status = 'trial'),
    'active_subscriptions',  (SELECT count(*) FROM clinic_subscriptions WHERE status = 'active'),
    'past_due_subscriptions',(SELECT count(*) FROM clinic_subscriptions WHERE status = 'past_due'),
    'cancelled_subscriptions',(SELECT count(*) FROM clinic_subscriptions WHERE status = 'cancelled'),
    'total_users',           (SELECT count(*) FROM profiles WHERE status = 'active'),
    'total_appointments',    (SELECT count(*) FROM appointments),
    'total_ai_conversations',(SELECT count(*) FROM ai_conversations),
    'total_ai_messages',     (SELECT count(*) FROM ai_messages)
  ) INTO result;

  RETURN result;
END;
$$;

-- ─── Helper: super admin reads all clinics with subscription info ──────────────
CREATE OR REPLACE FUNCTION get_all_clinics_admin()
RETURNS TABLE (
  id              uuid,
  name            text,
  slug            text,
  email           text,
  status          text,
  created_at      timestamptz,
  subscription_status text,
  trial_ends_at   timestamptz,
  plan_name       text,
  user_count      bigint,
  appointment_count bigint,
  ai_conversation_count bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.slug,
    c.email,
    c.status,
    c.created_at,
    COALESCE(cs.status, 'none')       AS subscription_status,
    cs.trial_ends_at,
    sp.name                            AS plan_name,
    (SELECT count(*) FROM profiles p WHERE p.clinic_id = c.id AND p.status = 'active') AS user_count,
    (SELECT count(*) FROM appointments a WHERE a.clinic_id = c.id)                     AS appointment_count,
    (SELECT count(*) FROM ai_conversations ai WHERE ai.clinic_id = c.id)               AS ai_conversation_count
  FROM clinics c
  LEFT JOIN clinic_subscriptions cs ON cs.clinic_id = c.id
  LEFT JOIN subscription_plans sp ON sp.id = cs.plan_id
  ORDER BY c.created_at DESC;
END;
$$;

-- ─── updated_at triggers ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS set_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER set_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_clinic_subscriptions_updated_at ON clinic_subscriptions;
CREATE TRIGGER set_clinic_subscriptions_updated_at
  BEFORE UPDATE ON clinic_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
