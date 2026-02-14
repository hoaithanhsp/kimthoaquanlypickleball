export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('vi-VN');
}

export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const r = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `HD${y}${m}${d}-${r}`;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    confirmed: 'bg-blue-50 text-blue-700 border border-blue-200',
    checked_in: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    completed: 'bg-gray-100 text-gray-600 border border-gray-200',
    cancelled: 'bg-red-50 text-red-600 border border-red-200',
    active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    maintenance: 'bg-orange-50 text-orange-700 border border-orange-200',
    inactive: 'bg-gray-100 text-gray-500 border border-gray-200',
    paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    unpaid: 'bg-red-50 text-red-600 border border-red-200',
    partial: 'bg-amber-50 text-amber-700 border border-amber-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    checked_in: 'Đang chơi',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
    active: 'Hoạt động',
    maintenance: 'Bảo trì',
    inactive: 'Ngừng',
    paid: 'Đã thanh toán',
    unpaid: 'Chưa thanh toán',
    partial: 'Thanh toán 1 phần',
  };
  return map[status] || status;
}

export function getBookingSlots(openTime: string, closeTime: string, durationMin: number): string[] {
  const slots: string[] = [];
  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);
  let current = oh * 60 + om;
  const end = ch * 60 + cm;
  while (current < end) {
    const h = String(Math.floor(current / 60)).padStart(2, '0');
    const m = String(current % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += durationMin;
  }
  return slots;
}
