import { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  XCircle,
  LogIn,
  CheckCheck,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  parseISO,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { formatCurrency, getStatusColor, getStatusLabel, formatTime } from '../lib/helpers';
import type { Booking, Court, Customer } from '../types';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    court_id: '',
    customer_id: '',
    booking_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '08:00',
    end_time: '09:00',
    deposit_amount: 0,
    deposit_paid: false,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [bRes, cRes, custRes] = await Promise.all([
      supabase.from('bookings').select('*, court:courts(*), customer:customers(*)').order('start_time'),
      supabase.from('courts').select('*').eq('status', 'active').order('name'),
      supabase.from('customers').select('*').order('name'),
    ]);
    setBookings((bRes.data as Booking[]) || []);
    setCourts(cRes.data || []);
    setCustomers(custRes.data || []);
    setLoading(false);
  }

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  }, [currentWeek]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 6; h <= 22; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  function getBookingsForSlot(courtId: string, date: Date, time: string) {
    return bookings.filter((b) => {
      const bDate = parseISO(b.booking_date);
      return (
        b.court_id === courtId &&
        isSameDay(bDate, date) &&
        b.start_time <= time + ':00' &&
        b.end_time > time + ':00' &&
        b.status !== 'cancelled'
      );
    });
  }

  async function handleCreateBooking(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('bookings').insert({
      ...form,
      status: form.deposit_paid ? 'confirmed' : 'pending',
    });
    setShowModal(false);
    loadData();
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('bookings').update({ status }).eq('id', id);
    loadData();
  }

  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const dayBookings = bookings.filter(
    (b) => isSameDay(parseISO(b.booking_date), selectedDay) && b.status !== 'cancelled'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="p-2 hover:bg-white/80 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-700">
            {format(currentWeek, 'dd/MM', { locale: vi })} - {format(addDays(currentWeek, 6), 'dd/MM/yyyy', { locale: vi })}
          </span>
          <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="p-2 hover:bg-white/80 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => { setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 })); setSelectedDay(new Date()); }}
            className="ml-2 px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-100"
          >
            Hôm nay
          </button>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/50 btn-shine">
          <Plus className="w-4 h-4" />
          Đặt sân
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2">
        {weekDays.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => setSelectedDay(day)}
            className={`flex-1 min-w-[80px] py-3 px-2 rounded-xl text-center transition-all ${isSameDay(day, selectedDay)
                ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-200'
                : isSameDay(day, new Date())
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-white/80 text-gray-600 border border-white/50 hover:bg-white'
              }`}
          >
            <div className="text-xs font-medium">{format(day, 'EEE', { locale: vi })}</div>
            <div className="text-lg font-bold mt-0.5">{format(day, 'dd')}</div>
            <div className="text-[10px] mt-0.5 opacity-70">{format(day, 'MM')}</div>
          </button>
        ))}
      </div>

      {courts.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Tạo sân trước khi đặt lịch</p>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 sticky left-0 bg-white z-10 w-20">Giờ</th>
                  {courts.map((c) => (
                    <th key={c.id} className="text-center text-xs font-semibold text-gray-500 uppercase px-2 py-3">{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((time) => (
                  <tr key={time} className="border-b border-gray-50 hover:bg-emerald-50/20">
                    <td className="px-4 py-2 text-xs font-medium text-gray-400 sticky left-0 bg-white z-10">{time}</td>
                    {courts.map((court) => {
                      const slotBookings = getBookingsForSlot(court.id, selectedDay, time);
                      return (
                        <td key={court.id} className="px-1 py-1 text-center">
                          {slotBookings.length > 0 ? (
                            slotBookings.map((b) => (
                              <div
                                key={b.id}
                                className={`text-[10px] px-2 py-1.5 rounded-lg font-medium ${getStatusColor(b.status)} cursor-pointer`}
                                title={`${b.customer?.name || ''} | ${formatTime(b.start_time)}-${formatTime(b.end_time)}`}
                              >
                                {b.customer?.name?.split(' ').pop() || 'KH'}
                              </div>
                            ))
                          ) : (
                            <div className="w-full h-7 rounded-lg bg-gray-50/50" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dayBookings.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Chi tiết - {format(selectedDay, 'dd/MM/yyyy')}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {dayBookings.map((b) => (
              <div key={b.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-900">{formatTime(b.start_time)} - {formatTime(b.end_time)}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(b.status)}`}>{getStatusLabel(b.status)}</span>
                  </div>
                  <p className="text-sm text-gray-600">{b.court?.name} - {b.customer?.name}</p>
                  {b.deposit_amount > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">Cọc: {formatCurrency(b.deposit_amount)} {b.deposit_paid ? '(Đã cọc)' : '(Chưa cọc)'}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {b.status === 'pending' && (
                    <button onClick={() => updateStatus(b.id, 'confirmed')} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" title="Xác nhận">
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  {b.status === 'confirmed' && (
                    <button onClick={() => updateStatus(b.id, 'checked_in')} className="p-2 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors" title="Check-in">
                      <LogIn className="w-4 h-4" />
                    </button>
                  )}
                  {b.status === 'checked_in' && (
                    <button onClick={() => updateStatus(b.id, 'completed')} className="p-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" title="Hoàn thành">
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  {b.status !== 'cancelled' && b.status !== 'completed' && (
                    <button onClick={() => updateStatus(b.id, 'cancelled')} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors" title="Hủy">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Đặt sân mới</h3>
            </div>
            <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sân</label>
                <select value={form.court_id} onChange={(e) => setForm({ ...form, court_id: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
                  <option value="">Chọn sân</option>
                  {courts.map((c) => <option key={c.id} value={c.id}>{c.name} - {formatCurrency(c.hourly_rate)}/h</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng</label>
                <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
                  <option value="">Chọn khách hàng</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
                <input type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ bắt đầu</label>
                  <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ kết thúc</label>
                  <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiền cọc (VNĐ)</label>
                  <input type="number" value={form.deposit_amount} onChange={(e) => setForm({ ...form, deposit_amount: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.deposit_paid} onChange={(e) => setForm({ ...form, deposit_paid: e.target.checked })} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-sm text-gray-700">Đã nhận cọc</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Hủy</button>
                <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/50">Đặt sân</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
