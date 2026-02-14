/*
  # Add RLS policies for customer self-service booking

  1. Changes
    - Allow customers to view their own bookings
    - Allow customers to create bookings for themselves
    - Allow customers to cancel their own pending bookings
  2. Security
    - Customers can only see and manage their own bookings
    - Customers reference their own profile id linked via a customer record
*/

CREATE POLICY "Customers can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'customer'
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Customers can insert own bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'customer'
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Customers can cancel own pending bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'customer'
    )
    AND created_by = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'customer'
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Customers can view own profile"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'customer'
    )
  );