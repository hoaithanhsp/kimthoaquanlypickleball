-- =====================================================
-- XÁC NHẬN EMAIL THỦ CÔNG (BYPASS CONFIRMATION)
-- Chạy script này để cho phép user đăng nhập ngay
-- =====================================================

UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'tranthikimthoa.c3hd@soctrang.edu.vn';

-- Sau khi chạy xong, bạn có thể Đăng nhập ngay lập tức.
