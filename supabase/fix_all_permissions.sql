-- =====================================================
-- SỬA LỖI PHÂN QUYỀN - CHO TẤT CẢ USER ĐỀU CÓ QUYỀN
-- Chạy TOÀN BỘ script này trong Supabase SQL Editor
-- =====================================================

-- BƯỚC 1: Cập nhật tất cả user hiện có thành admin
UPDATE public.profiles SET role = 'admin';

-- BƯỚC 2: Sửa trigger để user mới mặc định là admin
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'admin'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BƯỚC 3: Xóa tất cả policies cũ (có kiểm tra role)
-- Courts
DROP POLICY IF EXISTS "Authenticated users can view active courts" ON courts;
DROP POLICY IF EXISTS "Admins can insert courts" ON courts;
DROP POLICY IF EXISTS "Admins can update courts" ON courts;
DROP POLICY IF EXISTS "Admins can delete courts" ON courts;

-- Customers
DROP POLICY IF EXISTS "Staff and admins can view customers" ON customers;
DROP POLICY IF EXISTS "Staff and admins can insert customers" ON customers;
DROP POLICY IF EXISTS "Staff and admins can update customers" ON customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON customers;
DROP POLICY IF EXISTS "Customers can view own profile" ON customers;

-- Bookings
DROP POLICY IF EXISTS "Staff and admins can view bookings" ON bookings;
DROP POLICY IF EXISTS "Staff and admins can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Staff and admins can update bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can insert own bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can cancel own pending bookings" ON bookings;

-- Products
DROP POLICY IF EXISTS "Staff and admins can view products" ON products;
DROP POLICY IF EXISTS "Admins can insert products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
DROP POLICY IF EXISTS "Admins can delete products" ON products;

-- Invoices
DROP POLICY IF EXISTS "Staff and admins can view invoices" ON invoices;
DROP POLICY IF EXISTS "Staff and admins can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can update invoices" ON invoices;

-- Invoice Items
DROP POLICY IF EXISTS "Staff and admins can view invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Staff and admins can insert invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Admins can update invoice items" ON invoice_items;

-- Settings
DROP POLICY IF EXISTS "Staff and admins can view settings" ON settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON settings;
DROP POLICY IF EXISTS "Admins can update settings" ON settings;

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;


-- BƯỚC 4: Tạo policies mới - CHO TẤT CẢ authenticated users

-- Courts
CREATE POLICY "All users full access courts" ON courts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Customers
CREATE POLICY "All users full access customers" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bookings
CREATE POLICY "All users full access bookings" ON bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Products
CREATE POLICY "All users full access products" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Invoices
CREATE POLICY "All users full access invoices" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Invoice Items
CREATE POLICY "All users full access invoice_items" ON invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Settings
CREATE POLICY "All users full access settings" ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Profiles
CREATE POLICY "All users full access profiles" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- BƯỚC 5: Tạo profile cho user chưa có (nếu bị thiếu do lỗi trigger)
INSERT INTO public.profiles (id, full_name, role)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', ''), 'admin'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- BƯỚC 6: Xác nhận email cho tất cả user
UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;

-- Kiểm tra kết quả
SELECT p.id, p.full_name, p.role, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id;
