/*
  # Create bookings table

  1. New Tables
    - `bookings`
      - `id` (uuid, primary key)
      - `court_id` (uuid, references courts)
      - `customer_id` (uuid, references customers)
      - `booking_date` (date)
      - `start_time` (time)
      - `end_time` (time)
      - `status` (text) - pending, confirmed, checked_in, completed, cancelled
      - `deposit_amount` (numeric)
      - `deposit_paid` (boolean)
      - `total_amount` (numeric)
      - `notes` (text)
      - `is_recurring` (boolean)
      - `recurring_pattern` (jsonb) - for fixed schedules
      - `created_by` (uuid)
      - `created_at` (timestamptz)
  2. Security
    - Enable RLS
    - Staff and admins can manage bookings
*/

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id uuid NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled')),
  deposit_amount numeric DEFAULT 0,
  deposit_paid boolean DEFAULT false,
  total_amount numeric DEFAULT 0,
  notes text DEFAULT '',
  is_recurring boolean DEFAULT false,
  recurring_pattern jsonb DEFAULT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can view bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "Staff and admins can insert bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "Staff and admins can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admins can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin')));

CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_court ON bookings(court_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);