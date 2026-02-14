-- =====================================================
-- SỬA LỖI PHÂN QUYỀN ADMIN
-- Chạy từng đoạn lệnh dưới đây để kiểm tra và sửa lỗi
-- =====================================================

-- 1. Kiểm tra xem user đã có trong bảng profiles chưa và role hiện tại là gì
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'tranthikimthoa.c3hd@soctrang.edu.vn';

SELECT * FROM public.profiles 
WHERE id IN (SELECT id FROM auth.users WHERE email = 'tranthikimthoa.c3hd@soctrang.edu.vn');

-- 2. CẬP NHẬT QUYỀN ADMIN (Chạy lệnh này để sửa)
UPDATE public.profiles
SET 
  role = 'admin',
  full_name = 'Trần Thị Kim Thoa'
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'tranthikimthoa.c3hd@soctrang.edu.vn'
);

-- 3. Kiểm tra lại lần nữa để chắc chắn
SELECT * FROM public.profiles 
WHERE role = 'admin';
