-- Add status column to patients table
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'critical', 'inactive'));

-- Index for fast status-based filtering and counting
CREATE INDEX IF NOT EXISTS patients_status_idx ON patients (clinic_id, status);
