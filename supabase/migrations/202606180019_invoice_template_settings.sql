-- Invoice template preferences stored in clinic_settings
ALTER TABLE clinic_settings
  ADD COLUMN IF NOT EXISTS invoice_template TEXT NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS invoice_header_note TEXT,
  ADD COLUMN IF NOT EXISTS invoice_footer_note TEXT DEFAULT 'Thank you for your business!';
