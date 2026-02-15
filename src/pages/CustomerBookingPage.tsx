import { useEffect, useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Columns3,
  Calendar,
  XCircle,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, parseISO, isBefore, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { formatCurrency, getStatusColor, getStatusLabel, formatTime } from '../lib/helpers';
import { useAuthStore } from '../store/authStore';
import type { Court, Booking } from '../types';

export default function CustomerBookingPage() {
  const { user, profile } = useAuthStore();
  const [courts, setCourts] = useState<Court[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [form, setForm] = useState({ start_time: '08:00', end_time: '09:00', notes: '' });
  const [tab, setTab] = useState<'courts' | 'book' | 'my'>('courts');
  const [submitting, setSubmitting] = useState(false);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [courtsRes, myRes, allRes] = await Promise.all([
      supabase.from('courts').select('*').order('name'),
      supabase.from('bookings').select('*, court:courts(*)').eq('created_by', user?.id).order('booking_date', { ascending: false }),
      supabase.from('bookings').select('court_id, booking_date, start_time, end_time, status').neq('status', 'cancelled'),
    ]);
    setCourts(courtsRes.data || []);
    setMyBookings((myRes.data as Booking[]) || []);
    setAllBookings((allRes.data as Booking[]) || []);
    setLoading(false);
    setRefreshing(false);
  }

  function handleRefresh() {
    setRefreshing(true);
    loadData();
  }

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  }, [currentWeek]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 6; h <= 21; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  function isSlotBooked(courtId: string, date: Date, time: string) {
    const dateStr = format(date, 'yyyy-MM-dd');
    return allBookings.some(
      (b) =>
        b.court_id === courtId &&
        b.booking_date === dateStr &&
        b.start_time <= time + ':00' &&
        b.end_time > time + ':00' &&
        b.status !== 'cancelled'
    );
  }

  function getCourtTodayBookings(courtId: string) {
    const today = format(new Date(), 'yyyy-MM-dd');
    return allBookings.filter(
      (b) => b.court_id === courtId && b.booking_date === today && b.status !== 'cancelled'
    );
  }

  function getCourtAvailableSlots(courtId: string) {
    const today = format(new Date(), 'yyyy-MM-dd');
    let available = 0;
    for (let h = 6; h <= 21; h++) {
      const time = `${String(h).padStart(2, '0')}:00`;
      const booked = allBookings.some(
        (b) =>
          b.court_id === courtId &&
          b.booking_date === today &&
          b.start_time <= time + ':00' &&
          b.end_time > time + ':00' &&
          b.status !== 'cancelled'
      );
      if (!booked) available++;
    }
    return available;
  }

  function handleSlotClick(court: Court, time: string) {
    if (isBefore(selectedDay, startOfDay(new Date()))) return;
    if (isSlotBooked(court.id, selectedDay, time)) return;
    setSelectedCourt(court);
    const startH = parseInt(time.split(':')[0]);
    setForm({
      start_time: time,
      end_time: `${String(startH + 1).padStart(2, '0')}:00`,
      notes: '',
    });
    setShowBookingForm(true);
  }

  function handleSelectCourtToBook(court: Court) {
    setSelectedCourt(court);
    setTab('book');
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourt || !user) return;
    setSubmitting(true);

    try {
      // Sử dụng RPC function (SECURITY DEFINER) để tìm/tạo customer
      // Bypass RLS vì customer không có quyền INSERT trực tiếp vào bảng customers
      const { data: customerId, error: custErr } = await supabase.rpc('get_or_create_customer', {
        p_name: profile?.full_name || user.email || 'Khách',
        p_phone: profile?.phone || '',
        p_email: user.email || '',
      });

      if (custErr || !customerId) {
        alert('Không thể tạo hồ sơ khách hàng: ' + (custErr?.message || 'Lỗi không xác định'));
        setSubmitting(false);
        return;
      }

      const { error: bookErr } = await supabase.from('bookings').insert({
        court_id: selectedCourt.id,
        customer_id: customerId,
        booking_date: format(selectedDay, 'yyyy-MM-dd'),
        start_time: form.start_time,
        end_time: form.end_time,
        notes: form.notes,
        status: 'pending',
        created_by: user.id,
      });

      if (bookErr) {
        alert('Đặt sân thất bại: ' + bookErr.message);
        setSubmitting(false);
        return;
      }

      setShowBookingForm(false);
      setSubmitting(false);
      loadData();
      setTab('my');
    } catch {
      alert('Có lỗi xảy ra, vui lòng thử lại');
      setSubmitting(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Bạn có chắc muốn hủy booking này?')) return;
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    loadData();
  }

  const activeCourts = courts.filter((c) => c.status === 'active');
  const upcomingBookings = myBookings.filter(
    (b) => b.status !== 'cancelled' && b.status !== 'completed' && b.booking_date >= format(new Date(), 'yyyy-MM-dd')
  );
  const pastBookings = myBookings.filter(
    (b) => b.status === 'completed' || b.status === 'cancelled' || b.booking_date < format(new Date(), 'yyyy-MM-dd')
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
      <div className="text-center mb-2">
        <h1 className="text-xl font-bold text-gray-900">Xin chào, {profile?.full_name || 'Khách'}!</h1>
        <p className="text-sm text-gray-500 mt-1">Chọn sân và giờ để đặt lịch ngay</p>
      </div>

      {/* Tab navigation */}
      <div className="flex bg-gray-100/80 rounded-xl p-1 max-w-md mx-auto gap-1">
        <button
          onClick={() => setTab('courts')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === 'courts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          Danh sách sân
        </button>
        <button
          onClick={() => setTab('book')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === 'book' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          Đặt sân
        </button>
        <button
          onClick={() => setTab('my')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all relative ${tab === 'my' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          Lịch của tôi
          {upcomingBookings.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
              {upcomingBookings.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB: Danh sách sân */}
      {tab === 'courts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Sân hiện có ({activeCourts.length})</h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>

          {courts.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 p-12 text-center">
              <Columns3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Chưa có sân nào</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {courts.map((court) => {
                const isActive = court.status === 'active';
                const todayCount = getCourtTodayBookings(court.id).length;
                const availableSlots = getCourtAvailableSlots(court.id);

                return (
                  <div
                    key={court.id}
                    className={`bg-white/80 backdrop-blur-sm rounded-2xl border shadow-sm overflow-hidden transition-all ${isActive ? 'border-emerald-100 hover:shadow-md hover:border-emerald-200 cursor-pointer' : 'border-gray-200 opacity-60'
                      }`}
                    onClick={() => isActive && handleSelectCourtToBook(court)}
                  >
                    {/* Header */}
                    <div className={`px-5 py-3 flex items-center gap-3 ${isActive ? 'bg-gradient-to-r from-emerald-50/50 to-teal-50/50' : 'bg-gray-50'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive
                        ? court.type === 'indoor' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                        : 'bg-gray-100 text-gray-400'
                        }`}>
                        <Columns3 className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-gray-900">{court.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {court.type === 'indoor' ? 'Trong nhà' : 'Ngoài trời'}
                          </span>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                        }`}>
                        {isActive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {isActive ? 'Hoạt động' : 'Bảo trì'}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-5 py-4">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-emerald-50/80 rounded-xl py-2.5 px-2">
                          <DollarSign className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                          <p className="text-xs font-bold text-gray-900">{formatCurrency(court.hourly_rate)}</p>
                          <p className="text-[10px] text-gray-500">/giờ</p>
                        </div>
                        <div className="bg-blue-50/80 rounded-xl py-2.5 px-2">
                          <Calendar className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                          <p className="text-xs font-bold text-gray-900">{todayCount}</p>
                          <p className="text-[10px] text-gray-500">Đặt hôm nay</p>
                        </div>
                        <div className="bg-amber-50/80 rounded-xl py-2.5 px-2">
                          <Clock className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                          <p className="text-xs font-bold text-gray-900">{availableSlots}</p>
                          <p className="text-[10px] text-gray-500">Slot trống</p>
                        </div>
                      </div>

                      {isActive && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelectCourtToBook(court); }}
                          className="w-full mt-3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/50 btn-shine"
                        >
                          Đặt sân này
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: Đặt sân */}
      {tab === 'book' && (
        <>
          {/* Week navigator */}
          <div className="flex items-center justify-center gap-2">
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

          {/* Day selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {weekDays.map((day) => {
              const isPast = isBefore(day, startOfDay(new Date()));
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => !isPast && setSelectedDay(day)}
                  disabled={isPast}
                  className={`flex-1 min-w-[72px] py-3 px-2 rounded-xl text-center transition-all ${isPast
                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                    : isSameDay(day, selectedDay)
                      ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-200'
                      : isSameDay(day, new Date())
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-white/80 text-gray-600 border border-white/50 hover:bg-white'
                    }`}
                >
                  <div className="text-xs font-medium">{format(day, 'EEE', { locale: vi })}</div>
                  <div className="text-lg font-bold mt-0.5">{format(day, 'dd')}</div>
                </button>
              );
            })}
          </div>

          {/* Courts with time slots */}
          {activeCourts.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 p-12 text-center">
              <Columns3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Chưa có sân nào khả dụng</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(selectedCourt ? activeCourts.filter(c => c.id === selectedCourt.id) : activeCourts).map((court) => (
                <div key={court.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${court.type === 'indoor' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      <Columns3 className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900">{court.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{court.type === 'indoor' ? 'Trong nhà' : 'Ngoài trời'}</span>
                        <span>{formatCurrency(court.hourly_rate)}/h</span>
                      </div>
                    </div>
                    {selectedCourt && (
                      <button
                        onClick={() => setSelectedCourt(null)}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100"
                      >
                        Xem tất cả sân
                      </button>
                    )}
                  </div>
                  <div className="p-3 flex flex-wrap gap-1.5">
                    {timeSlots.map((time) => {
                      const booked = isSlotBooked(court.id, selectedDay, time);
                      const isPast = isBefore(selectedDay, startOfDay(new Date()));
                      return (
                        <button
                          key={time}
                          onClick={() => handleSlotClick(court, time)}
                          disabled={booked || isPast}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${booked
                            ? 'bg-red-50 text-red-300 cursor-not-allowed line-through'
                            : isPast
                              ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:shadow-sm cursor-pointer'
                            }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                  <div className="px-5 py-2 bg-gray-50/50 border-t border-gray-100 flex items-center gap-4 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-200"></span> Trống</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-200"></span> Đã đặt</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB: Lịch của tôi */}
      {tab === 'my' && (
        <div className="space-y-4">
          {upcomingBookings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" /> Sắp tới
              </h3>
              <div className="space-y-3">
                {upcomingBookings.map((b) => (
                  <div key={b.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-900">
                            {format(parseISO(b.booking_date), 'EEEE, dd/MM/yyyy', { locale: vi })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 ml-6">{b.court?.name}</p>
                        <p className="text-sm text-gray-500 ml-6">{formatTime(b.start_time)} - {formatTime(b.end_time)}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(b.status)}`}>
                        {getStatusLabel(b.status)}
                      </span>
                    </div>
                    {b.status === 'pending' && (
                      <div className="mt-2 ml-6 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Đang chờ admin xác nhận
                      </div>
                    )}
                    {(b.status === 'pending' || b.status === 'confirmed') && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                        <button
                          onClick={() => handleCancel(b.id)}
                          className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Hủy booking
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pastBookings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Lịch sử</h3>
              <div className="space-y-2">
                {pastBookings.slice(0, 10).map((b) => (
                  <div key={b.id} className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{b.court?.name} - {format(parseISO(b.booking_date), 'dd/MM/yyyy')}</p>
                      <p className="text-xs text-gray-400">{formatTime(b.start_time)} - {formatTime(b.end_time)}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(b.status)}`}>
                      {getStatusLabel(b.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {myBookings.length === 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-3">Bạn chưa có booking nào</p>
              <button onClick={() => setTab('courts')} className="text-sm text-emerald-600 font-semibold hover:underline">
                Xem danh sách sân
              </button>
            </div>
          )}
        </div>
      )}

      {/* Booking Form Modal */}
      {showBookingForm && selectedCourt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowBookingForm(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Xác nhận đặt sân</h3>
            </div>
            <form onSubmit={handleBook} className="p-6 space-y-4">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 space-y-2 border border-emerald-100">
                <div className="flex items-center gap-2">
                  <Columns3 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-gray-900">{selectedCourt.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {format(selectedDay, 'EEEE, dd/MM/yyyy', { locale: vi })}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {form.start_time} - {form.end_time}
                </div>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (tùy chọn)</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Yêu cầu đặc biệt..." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>

              <div className="bg-emerald-50 rounded-xl p-3 flex items-start gap-2 border border-emerald-100">
                <AlertCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-emerald-700">Sau khi đặt, admin sẽ xác nhận và liên hệ với bạn. Giá sân: {formatCurrency(selectedCourt.hourly_rate)}/h</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowBookingForm(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2 btn-shine"
                >
                  {submitting ? 'Đang đặt...' : (
                    <>
                      <CheckCircle className="w-4 h-4" /> Đặt sân
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
