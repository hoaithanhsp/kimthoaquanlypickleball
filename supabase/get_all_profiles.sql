-- =====================================================
-- QUẢN LÝ NGƯỜI DÙNG - Database Functions
-- Chạy TOÀN BỘ script này trong SQL Editor của Supabase
-- =====================================================

-- 1. Function lấy danh sách tất cả profiles kèm email
-- Chạy với SECURITY DEFINER để bypass RLS
CREATE OR REPLACE FUNCTION get_all_profiles()
RETURNS TABLE (
  id uuid,
  full_name text,
  phone text,
  role text,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz,
  email text
) AS $$
BEGIN
  -- Chỉ admin mới được gọi function này
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Chỉ admin mới có quyền xem danh sách người dùng';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.phone,
    p.role,
    p.avatar_url,
    p.created_at,
    p.updated_at,
    u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Function cập nhật role của user
CREATE OR REPLACE FUNCTION update_user_role(target_user_id uuid, new_role text)
RETURNS void AS $$
BEGIN
  -- Chỉ admin mới được thay đổi role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Chỉ admin mới có quyền thay đổi vai trò';
  END IF;

  -- Kiểm tra role hợp lệ
  IF new_role NOT IN ('admin', 'staff', 'customer') THEN
    RAISE EXCEPTION 'Vai trò không hợp lệ: %', new_role;
  END IF;

  UPDATE public.profiles
  SET role = new_role, updated_at = now()
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
