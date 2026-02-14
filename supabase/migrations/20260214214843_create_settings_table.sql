/*
  # Create settings table

  1. New Tables
    - `settings`
      - `id` (uuid, primary key)
      - `key` (text, unique) - setting key
      - `value` (jsonb) - setting value
      - `updated_at` (timestamptz)
  2. Security
    - Enable RLS
    - Admins can manage settings
    - Staff can view settings
  3. Default settings inserted
*/

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can view settings"
  ON settings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can insert settings"
  ON settings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin')));

CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin')));

INSERT INTO settings (key, value) VALUES
  ('business_name', '"PickleBall Pro"'),
  ('business_phone', '""'),
  ('business_address', '""'),
  ('business_email', '""'),
  ('operating_hours', '{"open": "06:00", "close": "22:00"}'),
  ('peak_hours', '{"start": "17:00", "end": "21:00"}'),
  ('booking_slot_duration', '60'),
  ('deposit_percentage', '30'),
  ('cancellation_policy', '{"free_cancel_hours": 24, "cancel_fee_percent": 50}'),
  ('tax_rate', '10'),
  ('currency', '"VND"')
ON CONFLICT (key) DO NOTHING;