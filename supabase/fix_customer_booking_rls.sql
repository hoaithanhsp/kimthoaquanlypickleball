-- =====================================================
-- THÊM QUYỀN CHO KHÁCH HÀNG ĐẶT SÂN
-- Cho phép role 'customer' xem sân, tạo booking, tạo customer record
-- Chạy script này trong Supabase SQL Editor
-- =====================================================

-- 1. Courts: khách được xem sân active
DROP POLICY IF EXISTS "All users full access courts" ON courts;
CREATE POLICY "Anyone can view courts" ON courts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff admin manage courts" ON courts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- 2. Customers: khách được xem/tạo record của mình, admin/staff full access
DROP POLICY IF EXISTS "All users full access customers" ON customers;
CREATE POLICY "Staff admin full customers" ON customers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));
CREATE POLICY "Customer view own record" ON customers FOR SELECT TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "Customer create own record" ON customers FOR INSERT TO authenticated
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 3. Bookings: khách tạo/xem/hủy booking của mình, admin/staff full access
DROP POLICY IF EXISTS "All users full access bookings" ON bookings;
CREATE POLICY "Staff admin full bookings" ON bookings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));
CREATE POLICY "Customer view own bookings" ON bookings FOR SELECT TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "Customer create booking" ON bookings FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Customer cancel own booking" ON bookings FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- 4. Các bảng khác giữ nguyên full access cho admin/staff
-- Products
DROP POLICY IF EXISTS "All users full access products" ON products;
CREATE POLICY "Staff admin full products" ON products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- Invoices
DROP POLICY IF EXISTS "All users full access invoices" ON invoices;
CREATE POLICY "Staff admin full invoices" ON invoices FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- Invoice Items
DROP POLICY IF EXISTS "All users full access invoice_items" ON invoice_items;
CREATE POLICY "Staff admin full invoice_items" ON invoice_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- Settings
DROP POLICY IF EXISTS "All users full access settings" ON settings;
CREATE POLICY "Staff admin full settings" ON settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- Profiles: giữ full access cho tất cả (cần thiết cho auth)
-- Không thay đổi
