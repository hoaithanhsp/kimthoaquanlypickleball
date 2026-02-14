/*
  # Create invoices and invoice_items tables

  1. New Tables
    - `invoices`
      - `id` (uuid, primary key)
      - `invoice_number` (text, unique)
      - `booking_id` (uuid, references bookings)
      - `customer_id` (uuid, references customers)
      - `subtotal` (numeric)
      - `discount` (numeric)
      - `tax` (numeric)
      - `total` (numeric)
      - `deposit_deducted` (numeric)
      - `amount_due` (numeric)
      - `payment_method` (text)
      - `payment_status` (text)
      - `notes` (text)
      - `created_by` (uuid)
      - `created_at` (timestamptz)
    - `invoice_items`
      - `id` (uuid, primary key)
      - `invoice_id` (uuid, references invoices)
      - `item_type` (text) - court, product, rental, lighting, service
      - `item_name` (text)
      - `quantity` (numeric)
      - `unit_price` (numeric)
      - `total_price` (numeric)
  2. Security
    - Enable RLS on both tables
*/

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  booking_id uuid REFERENCES bookings(id),
  customer_id uuid REFERENCES customers(id),
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  deposit_deducted numeric DEFAULT 0,
  amount_due numeric NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'card', 'momo', 'zalopay', 'vnpay')),
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'court' CHECK (item_type IN ('court', 'product', 'rental', 'lighting', 'service')),
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can view invoices"
  ON invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Staff and admins can insert invoices"
  ON invoices FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can update invoices"
  ON invoices FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin')));

CREATE POLICY "Staff and admins can view invoice items"
  ON invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Staff and admins can insert invoice items"
  ON invoice_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can update invoice items"
  ON invoice_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin')));

CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_booking ON invoices(booking_id);
CREATE INDEX idx_invoices_date ON invoices(created_at);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);