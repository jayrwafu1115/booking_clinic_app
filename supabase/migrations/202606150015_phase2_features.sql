-- Phase 2: Rooms, Invoicing, SOAP Notes, Intake Forms,
--           Recurring Appointments, Treatment Packages, Queue Management

-- ─── Rooms ────────────────────────────────────────────────────────────────────
CREATE TABLE rooms (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   uuid        NOT NULL REFERENCES clinics(id)   ON DELETE CASCADE,
  name        text        NOT NULL,
  description text,
  capacity    int         NOT NULL DEFAULT 1,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rooms_clinic_id ON rooms(clinic_id);
ALTER TABLE appointments ADD COLUMN room_id uuid REFERENCES rooms(id) ON DELETE SET NULL;
CREATE INDEX idx_appointments_room_id ON appointments(room_id);

-- ─── Invoices ─────────────────────────────────────────────────────────────────
CREATE TABLE invoices (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id            uuid        NOT NULL REFERENCES clinics(id)      ON DELETE CASCADE,
  patient_id           uuid        NOT NULL REFERENCES patients(id)     ON DELETE RESTRICT,
  appointment_id       uuid                 REFERENCES appointments(id) ON DELETE SET NULL,
  invoice_number       text        NOT NULL,
  status               text        NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','sent','paid','void')),
  subtotal_centavos    int         NOT NULL DEFAULT 0,
  discount_centavos    int         NOT NULL DEFAULT 0,
  total_centavos       int         NOT NULL DEFAULT 0,
  notes                text,
  due_date             date,
  paid_at              timestamptz,
  created_by           uuid                 REFERENCES profiles(id)     ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, invoice_number)
);
CREATE INDEX idx_invoices_clinic_id    ON invoices(clinic_id);
CREATE INDEX idx_invoices_patient_id   ON invoices(patient_id);
CREATE INDEX idx_invoices_appointment  ON invoices(appointment_id);

CREATE TABLE invoice_items (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          uuid        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  clinic_id           uuid        NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  description         text        NOT NULL,
  quantity            int         NOT NULL DEFAULT 1,
  unit_price_centavos int         NOT NULL DEFAULT 0,
  total_centavos      int         NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

CREATE TABLE payments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        uuid        NOT NULL REFERENCES clinics(id)   ON DELETE CASCADE,
  invoice_id       uuid        NOT NULL REFERENCES invoices(id)  ON DELETE RESTRICT,
  patient_id       uuid        NOT NULL REFERENCES patients(id)  ON DELETE RESTRICT,
  amount_centavos  int         NOT NULL,
  method           text        NOT NULL
                     CHECK (method IN ('cash','gcash','card','bank_transfer','philhealth','hmo')),
  reference_no     text,
  notes            text,
  recorded_by      uuid                 REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_clinic_id   ON payments(clinic_id);
CREATE INDEX idx_payments_invoice_id  ON payments(invoice_id);

-- ─── Clinical Notes (SOAP) ────────────────────────────────────────────────────
CREATE TABLE clinical_notes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      uuid        NOT NULL REFERENCES clinics(id)      ON DELETE CASCADE,
  appointment_id uuid        NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id     uuid        NOT NULL REFERENCES patients(id)     ON DELETE RESTRICT,
  doctor_id      uuid                 REFERENCES doctors(id)      ON DELETE SET NULL,
  subjective     text,
  objective      text,
  assessment     text,
  plan           text,
  is_locked      boolean     NOT NULL DEFAULT false,
  locked_at      timestamptz,
  created_by     uuid                 REFERENCES profiles(id)     ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, appointment_id)
);
CREATE INDEX idx_clinical_notes_clinic_id      ON clinical_notes(clinic_id);
CREATE INDEX idx_clinical_notes_appointment_id ON clinical_notes(appointment_id);
CREATE INDEX idx_clinical_notes_patient_id     ON clinical_notes(patient_id);

-- ─── Intake Form Templates & Submissions ─────────────────────────────────────
CREATE TABLE form_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   uuid        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  description text,
  fields      jsonb       NOT NULL DEFAULT '[]',
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_form_templates_clinic_id ON form_templates(clinic_id);

CREATE TABLE form_submissions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      uuid        NOT NULL REFERENCES clinics(id)       ON DELETE CASCADE,
  template_id    uuid        NOT NULL REFERENCES form_templates(id) ON DELETE RESTRICT,
  patient_id     uuid                 REFERENCES patients(id)       ON DELETE SET NULL,
  appointment_id uuid                 REFERENCES appointments(id)   ON DELETE SET NULL,
  token          uuid        NOT NULL DEFAULT gen_random_uuid(),
  answers        jsonb       NOT NULL DEFAULT '{}',
  submitted_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token)
);
CREATE INDEX idx_form_submissions_clinic_id ON form_submissions(clinic_id);
CREATE INDEX idx_form_submissions_token     ON form_submissions(token);
CREATE INDEX idx_form_submissions_patient   ON form_submissions(patient_id);

-- ─── Appointment Recurrences ──────────────────────────────────────────────────
CREATE TABLE appointment_recurrences (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid        NOT NULL REFERENCES clinics(id)   ON DELETE CASCADE,
  patient_id    uuid        NOT NULL REFERENCES patients(id)  ON DELETE RESTRICT,
  doctor_id     uuid                 REFERENCES doctors(id)   ON DELETE SET NULL,
  service_id    uuid        NOT NULL REFERENCES services(id)  ON DELETE RESTRICT,
  frequency     text        NOT NULL
                  CHECK (frequency IN ('daily','weekly','biweekly','monthly')),
  session_count int         NOT NULL,
  start_at      timestamptz NOT NULL,
  created_by    uuid                 REFERENCES profiles(id)  ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_appt_recurrences_clinic_id ON appointment_recurrences(clinic_id);
ALTER TABLE appointments ADD COLUMN recurrence_id uuid REFERENCES appointment_recurrences(id) ON DELETE SET NULL;
CREATE INDEX idx_appointments_recurrence_id ON appointments(recurrence_id);

-- ─── Treatment Packages ───────────────────────────────────────────────────────
CREATE TABLE treatment_packages (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      uuid        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  description    text,
  session_count  int         NOT NULL,
  price_centavos int         NOT NULL,
  validity_days  int         NOT NULL DEFAULT 365,
  active         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_treatment_packages_clinic_id ON treatment_packages(clinic_id);

CREATE TABLE patient_packages (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id            uuid        NOT NULL REFERENCES clinics(id)           ON DELETE CASCADE,
  patient_id           uuid        NOT NULL REFERENCES patients(id)          ON DELETE RESTRICT,
  package_id           uuid        NOT NULL REFERENCES treatment_packages(id) ON DELETE RESTRICT,
  purchased_at         timestamptz NOT NULL DEFAULT now(),
  expires_at           timestamptz NOT NULL,
  sessions_total       int         NOT NULL,
  sessions_used        int         NOT NULL DEFAULT 0,
  status               text        NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','expired','exhausted','cancelled')),
  paid_amount_centavos int         NOT NULL,
  payment_method       text        CHECK (payment_method IN ('cash','gcash','card','bank_transfer','philhealth','hmo')),
  notes                text,
  created_by           uuid                 REFERENCES profiles(id)          ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_patient_packages_clinic_id   ON patient_packages(clinic_id);
CREATE INDEX idx_patient_packages_patient_id  ON patient_packages(patient_id);

CREATE TABLE package_redemptions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         uuid        NOT NULL REFERENCES clinics(id)          ON DELETE CASCADE,
  patient_package_id uuid       NOT NULL REFERENCES patient_packages(id) ON DELETE RESTRICT,
  appointment_id    uuid                 REFERENCES appointments(id)     ON DELETE SET NULL,
  redeemed_at       timestamptz NOT NULL DEFAULT now(),
  created_by        uuid                 REFERENCES profiles(id)         ON DELETE SET NULL
);
CREATE INDEX idx_package_redemptions_clinic_id ON package_redemptions(clinic_id);
CREATE INDEX idx_package_redemptions_pkg_id    ON package_redemptions(patient_package_id);

-- ─── Queue Management ─────────────────────────────────────────────────────────
CREATE TABLE queue_entries (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    uuid        NOT NULL REFERENCES clinics(id)   ON DELETE CASCADE,
  patient_id   uuid                 REFERENCES patients(id)  ON DELETE SET NULL,
  doctor_id    uuid                 REFERENCES doctors(id)   ON DELETE SET NULL,
  service_id   uuid                 REFERENCES services(id)  ON DELETE SET NULL,
  queue_number int         NOT NULL,
  status       text        NOT NULL DEFAULT 'waiting'
                 CHECK (status IN ('waiting','called','serving','done','skipped')),
  patient_name text        NOT NULL,
  notes        text,
  queue_date   date        NOT NULL DEFAULT CURRENT_DATE,
  called_at    timestamptz,
  served_at    timestamptz,
  done_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_queue_entries_clinic_id  ON queue_entries(clinic_id);
CREATE INDEX idx_queue_entries_date       ON queue_entries(clinic_id, queue_date);

-- ─── RLS (all new tables) ─────────────────────────────────────────────────────
ALTER TABLE rooms                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_recurrences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_packages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_packages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_redemptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries             ENABLE ROW LEVEL SECURITY;
