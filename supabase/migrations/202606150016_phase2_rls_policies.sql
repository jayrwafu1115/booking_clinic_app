-- ─── RLS Policies for Phase 2 tables ─────────────────────────────────────────
-- The 202606150015 migration enabled RLS on all new tables but omitted policies,
-- blocking every operation. This migration adds the standard clinic-member policy
-- for each table so authenticated staff can read and write their own clinic's data.
--
-- Pattern: FOR ALL with a USING subquery against profiles lets the same expression
-- serve as WITH CHECK for INSERTs (PostgreSQL reuses USING when WITH CHECK is absent).
-- The admin client (service role) bypasses RLS entirely for public-facing actions.

-- ─── Rooms ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clinic members manage own rooms" ON rooms;
CREATE POLICY "Clinic members manage own rooms"
  ON rooms FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- ─── Invoices ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clinic members manage own invoices" ON invoices;
CREATE POLICY "Clinic members manage own invoices"
  ON invoices FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- ─── Invoice Items ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clinic members manage own invoice items" ON invoice_items;
CREATE POLICY "Clinic members manage own invoice items"
  ON invoice_items FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- ─── Payments ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clinic members manage own payments" ON payments;
CREATE POLICY "Clinic members manage own payments"
  ON payments FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- ─── Clinical Notes ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clinic members manage own clinical notes" ON clinical_notes;
CREATE POLICY "Clinic members manage own clinical notes"
  ON clinical_notes FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- ─── Form Templates ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clinic members manage own form templates" ON form_templates;
CREATE POLICY "Clinic members manage own form templates"
  ON form_templates FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- ─── Form Submissions ─────────────────────────────────────────────────────────
-- Clinic members read/manage; public submission uses the admin client (bypasses RLS).
DROP POLICY IF EXISTS "Clinic members manage own form submissions" ON form_submissions;
CREATE POLICY "Clinic members manage own form submissions"
  ON form_submissions FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- ─── Appointment Recurrences ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clinic members manage own recurrences" ON appointment_recurrences;
CREATE POLICY "Clinic members manage own recurrences"
  ON appointment_recurrences FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- ─── Treatment Packages ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clinic members manage own treatment packages" ON treatment_packages;
CREATE POLICY "Clinic members manage own treatment packages"
  ON treatment_packages FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- ─── Patient Packages ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clinic members manage own patient packages" ON patient_packages;
CREATE POLICY "Clinic members manage own patient packages"
  ON patient_packages FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- ─── Package Redemptions ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clinic members manage own package redemptions" ON package_redemptions;
CREATE POLICY "Clinic members manage own package redemptions"
  ON package_redemptions FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- ─── Queue Entries ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clinic members manage own queue entries" ON queue_entries;
CREATE POLICY "Clinic members manage own queue entries"
  ON queue_entries FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );
