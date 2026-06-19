-- Per-clinic accent color override for invoice printing (null = use clinic primary_color)
ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS invoice_accent_color TEXT;
