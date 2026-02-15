-- =====================================================
-- TẠO BẢNG NOTIFICATIONS - Hệ thống thông báo cho khách
-- Chạy script này trong Supabase SQL Editor
-- =====================================================

-- 1. Tạo bảng notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean DEFAULT false,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Bật RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- User chỉ xem notifications của mình
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- User có thể cập nhật (đánh dấu đã đọc) notifications của mình
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin/staff có thể tạo notifications cho bất kỳ user nào
CREATE POLICY "Staff admin can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- Admin có thể xóa notifications
CREATE POLICY "Admin can delete notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Index để tăng tốc query
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- 5. Bật Realtime cho bảng notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
