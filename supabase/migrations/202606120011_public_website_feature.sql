-- Public clinic website: Enterprise-only feature flag.
-- Adds "public_website" to the Enterprise plan's features array so the
-- /c/[clinicSlug] public site can be gated per plan instead of per plan name.

UPDATE subscription_plans
SET features = (
  SELECT COALESCE(jsonb_agg(DISTINCT f), '[]'::jsonb)
  FROM jsonb_array_elements(features || '["public_website"]'::jsonb) AS f
),
    updated_at = now()
WHERE name = 'Enterprise';
