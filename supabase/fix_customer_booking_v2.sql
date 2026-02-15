-- =====================================================
-- FIX: Cho phép khách hàng (customer) đặt sân
-- Lỗi: "permission denied for table users"
-- Nguyên nhân: Customer không có quyền INSERT vào bảng customers
--              và policy cũ dùng SELECT FROM auth.users (bị chặn)
-- Giải pháp: Tạo SECURITY DEFINER function để bypass RLS
-- Chạy script này trong Supabase SQL Editor
-- =====================================================

-- ===== BƯỚC 1: Xóa các policy cũ có thể conflict =====

-- Xóa policy cũ trên customers (nếu đã chạy fix trước đó)
DROP POLICY IF EXISTS "Customer view own record" ON customers;
DROP POLICY IF EXISTS "Customer create own record" ON customers;
DROP POLICY IF EXISTS "All users full access customers" ON customers;
DROP POLICY IF EXISTS "Staff admin full customers" ON customers;
DROP POLICY IF EXISTS "Customers can view own profile" ON customers;

-- Xóa policy cũ trên bookings (nếu đã chạy fix trước đó)
DROP POLICY IF EXISTS "Customer view own bookings" ON bookings;
DROP POLICY IF EXISTS "Customer create booking" ON bookings;
DROP POLICY IF EXISTS "Customer cancel own booking" ON bookings;
DROP POLICY IF EXISTS "All users full access bookings" ON bookings;
DROP POLICY IF EXISTS "Staff admin full bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can insert own bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can cancel own pending bookings" ON bookings;

-- Xóa policy cũ trên courts
DROP POLICY IF EXISTS "All users full access courts" ON courts;
DROP POLICY IF EXISTS "Anyone can view courts" ON courts;
DROP POLICY IF EXISTS "Staff admin manage courts" ON courts;

-- ===== BƯỚC 2: Tạo SECURITY DEFINER function =====
-- Function này chạy với quyền owner (bypass RLS), an toàn vì
-- chỉ cho phép tạo customer record cho chính user đang đăng nhập

CREATE OR REPLACE FUNCTION public.get_or_create_customer(
  p_name text,
  p_phone text,
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_user_email text;
BEGIN
  -- Lấy email của user đang đăng nhập từ auth.users
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  
  -- Đảm bảo email truyền vào khớp với email đăng nhập
  IF p_email != v_user_email THEN
    RAISE EXCEPTION 'Email không khớp với tài khoản đăng nhập';
  END IF;

  -- Tìm customer đã tồn tại
  SELECT id INTO v_customer_id FROM customers WHERE email = p_email;
  
  -- Nếu chưa có, tạo mới
  IF v_customer_id IS NULL THEN
    INSERT INTO customers (name, phone, email)
    VALUES (p_name, p_phone, p_email)
    RETURNING id INTO v_customer_id;
  END IF;

  RETURN v_customer_id;
END;
$$;

-- Cấp quyền gọi function cho authenticated users
GRANT EXECUTE ON FUNCTION public.get_or_create_customer(text, text, text) TO authenticated;

-- ===== BƯỚC 3: Tạo lại RLS policies =====

-- Courts: Tất cả authenticated users được XEM, admin/staff được quản lý
CREATE POLICY "Anyone can view courts" ON courts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff admin manage courts" ON courts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

-- Customers: admin/staff full access, customer chỉ xem record của mình
CREATE POLICY "Staff admin full customers" ON customers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Customer view own record" ON customers FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'customer')
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
-- Không cần policy INSERT cho customers vì dùng SECURITY DEFINER function

-- Bookings: admin/staff full access, customer tự quản lý booking của mình
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
