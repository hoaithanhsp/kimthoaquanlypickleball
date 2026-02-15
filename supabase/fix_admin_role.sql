-- =====================================================
-- SCRIPT SỬA LỖI PHÂN QUYỀN ADMIN (MẠNH)
-- Script này sẽ TẠO profile nếu chưa có, hoặc CẬP NHẬT nếu đã có
-- Chạy TOÀN BỘ script này trong SQL Editor
-- =====================================================

-- BƯỚC 1: Kiểm tra user có tồn tại trong auth.users không
SELECT id, email, email_confirmed_at, raw_user_meta_data 
FROM auth.users 
WHERE email = 'tranthikimthoa.c3hd@soctrang.edu.vn';

-- BƯỚC 2: Kiểm tra profile hiện tại
SELECT * FROM public.profiles 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'tranthikimthoa.c3hd@soctrang.edu.vn'
);

-- BƯỚC 3: TẠO HOẶC CẬP NHẬT profile thành Admin
-- Dùng INSERT ... ON CONFLICT để đảm bảo luôn thành công
INSERT INTO public.profiles (id, full_name, role, phone, avatar_url)
SELECT 
  id, 
  'Trần Thị Kim Thoa', 
  'admin',
  '',
  ''
FROM auth.users 
WHERE email = 'tranthikimthoa.c3hd@soctrang.edu.vn'
ON CONFLICT (id) DO UPDATE SET 
  role = 'admin',
  full_name = 'Trần Thị Kim Thoa',
  updated_at = now();

-- BƯỚC 4: Đảm bảo email đã confirmed
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'tranthikimthoa.c3hd@soctrang.edu.vn'
  AND email_confirmed_at IS NULL;

-- BƯỚC 5: Xác nhận kết quả - phải thấy role = 'admin'
SELECT p.id, p.full_name, p.role, u.email, u.email_confirmed_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'tranthikimthoa.c3hd@soctrang.edu.vn';
