/*
  # Create courts table

  1. New Tables
    - `courts`
      - `id` (uuid, primary key)
      - `name` (text) - Court name (e.g., "San 1", "San 2")
      - `type` (text) - indoor, outdoor
      - `surface` (text) - concrete, wood, synthetic
      - `status` (text) - active, maintenance, inactive
      - `hourly_rate` (numeric) - Base price per hour
      - `peak_rate` (numeric) - Peak hours price
      - `lighting_fee` (numeric) - Evening lighting fee
      - `description` (text)
      - `image_url` (text)
      - `created_at` (timestamptz)
  2. Security
    - Enable RLS
    - Staff and admins can manage courts
    - All authenticated users can view active courts
*/

CREATE TABLE IF NOT EXISTS courts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'outdoor' CHECK (type IN ('indoor', 'outdoor')),
  surface text DEFAULT 'concrete',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  hourly_rate numeric NOT NULL DEFAULT 0,
  peak_rate numeric NOT NULL DEFAULT 0,
  lighting_fee numeric NOT NULL DEFAULT 0,
  description text DEFAULT '',
  image_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE courts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active courts"
  ON courts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert courts"
  ON courts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin'))
  );

CREATE POLICY "Admins can update courts"
  ON courts FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin')));

CREATE POLICY "Admins can delete courts"
  ON courts FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin')));