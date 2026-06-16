-- Phase 1 Quick Wins: Waitlist, Patient Feedback, iCal token

-- ─── Waitlist ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointment_waitlist (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id      uuid REFERENCES patients(id) ON DELETE SET NULL,
  service_id      uuid REFERENCES services(id) ON DELETE SET NULL,
  doctor_id       uuid REFERENCES doctors(id) ON DELETE SET NULL,
  patient_name    text NOT NULL,
  patient_phone   text NOT NULL,
  patient_email   text,
  preferred_date  date,
  notes           text,
  status          text NOT NULL DEFAULT 'waiting'
                    CHECK (status IN ('waiting', 'notified', 'booked', 'expired')),
  notified_at     timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_clinic_status ON appointment_waitlist(clinic_id, status);

ALTER TABLE appointment_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic members manage own waitlist" ON appointment_waitlist;
CREATE POLICY "Clinic members manage own waitlist"
  ON appointment_waitlist FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- ─── Patient feedback ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id  uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id      uuid REFERENCES patients(id) ON DELETE SET NULL,
  token           text UNIQUE NOT NULL,
  rating          smallint CHECK (rating BETWEEN 1 AND 5),
  comment         text,
  submitted_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_clinic ON patient_feedback(clinic_id);

ALTER TABLE patient_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic members read own feedback" ON patient_feedback;
CREATE POLICY "Clinic members read own feedback"
  ON patient_feedback FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Public submit feedback via token" ON patient_feedback;
CREATE POLICY "Public submit feedback via token"
  ON patient_feedback FOR UPDATE
  USING (submitted_at IS NULL)
  WITH CHECK (submitted_at IS NOT NULL);

-- ─── Doctor iCal feed tokens ───────────────────────────────────────────────────
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS ical_token text UNIQUE DEFAULT gen_random_uuid()::text;

-- Backfill existing doctors
UPDATE doctors SET ical_token = gen_random_uuid()::text WHERE ical_token IS NULL;

-- ─── updated_at triggers ──────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS set_waitlist_updated_at ON appointment_waitlist;
CREATE TRIGGER set_waitlist_updated_at
  BEFORE UPDATE ON appointment_waitlist
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
