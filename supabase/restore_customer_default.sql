-- =====================================================
-- KHÔI PHỤC PHÂN QUYỀN MẶC ĐỊNH
-- User mới đăng ký sẽ có role = 'customer'
-- Admin phân quyền thủ công từ trang Người dùng
-- Chạy script này trong Supabase SQL Editor
-- =====================================================

-- 1. Sửa trigger: user mới mặc định là 'customer'
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'customer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Đảm bảo tài khoản hiện tại (của bạn) vẫn là admin
UPDATE public.profiles SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email = 'tranthikimthoa.c3hd@soctrang.edu.vn'
);

-- Kiểm tra
SELECT p.full_name, p.role, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id;
