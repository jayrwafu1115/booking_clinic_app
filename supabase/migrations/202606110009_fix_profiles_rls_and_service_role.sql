-- Fix: grant service_role explicit bypass on profiles so registration always works.
-- The service_role key should bypass RLS by default, but some Supabase project
-- configurations require an explicit policy. This is belt-and-suspenders.

DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
CREATE POLICY "Service role can manage profiles"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Same fix for clinics and clinic_settings so the full registration flow works.
DROP POLICY IF EXISTS "Service role can manage clinics" ON public.clinics;
CREATE POLICY "Service role can manage clinics"
ON public.clinics
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage clinic settings" ON public.clinic_settings;
CREATE POLICY "Service role can manage clinic settings"
ON public.clinic_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure the get_all_clinics_admin RPC exists (idempotent re-create in case
-- migration 202606090007 was not applied to this Supabase project).
CREATE OR REPLACE FUNCTION get_all_clinics_admin()
RETURNS TABLE (
  id                    uuid,
  name                  text,
  slug                  text,
  email                 text,
  status                text,
  created_at            timestamptz,
  subscription_status   text,
  trial_ends_at         timestamptz,
  plan_name             text,
  user_count            bigint,
  appointment_count     bigint,
  ai_conversation_count bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin' AND p.status = 'active'
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
    COALESCE(cs.status, 'none')  AS subscription_status,
    cs.trial_ends_at,
    sp.name                       AS plan_name,
    (SELECT count(*) FROM profiles p WHERE p.clinic_id = c.id AND p.status = 'active')  AS user_count,
    (SELECT count(*) FROM appointments a WHERE a.clinic_id = c.id)                       AS appointment_count,
    (SELECT count(*) FROM ai_conversations ai WHERE ai.clinic_id = c.id)                 AS ai_conversation_count
  FROM clinics c
  LEFT JOIN clinic_subscriptions cs ON cs.clinic_id = c.id
  LEFT JOIN subscription_plans sp   ON sp.id = cs.plan_id
  ORDER BY c.created_at DESC;
END;
$$;

-- Same safety net for get_platform_metrics.
CREATE OR REPLACE FUNCTION get_platform_metrics()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin' AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT jsonb_build_object(
    'total_clinics',          (SELECT count(*) FROM clinics),
    'active_clinics',         (SELECT count(*) FROM clinics WHERE status = 'active'),
    'inactive_clinics',       (SELECT count(*) FROM clinics WHERE status = 'inactive'),
    'suspended_clinics',      (SELECT count(*) FROM clinics WHERE status = 'suspended'),
    'trial_subscriptions',    (SELECT count(*) FROM clinic_subscriptions WHERE status = 'trial'),
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
