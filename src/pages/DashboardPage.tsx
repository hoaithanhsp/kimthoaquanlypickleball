import { useEffect, useState } from 'react';
import {
  DollarSign,
  Calendar,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CircleDot,
  CheckCircle2,
  XCircle,
  LogIn,
  CheckCheck,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../lib/supabase';
import { formatCurrency, getStatusColor, getStatusLabel, formatTime } from '../lib/helpers';
import type { Booking, Court } from '../types';

const COLORS = ['#059669', '#0891b2', '#d97706', '#dc2626', '#6b7280'];

export default function DashboardPage() {
  const [stats, setStats] = useState({ revenue: 0, bookings: 0, customers: 0, courts: 0 });
  const [todayBookings, setTodayBookings] = useState<(Booking & { court?: Court })[]>([]);
  const [revenueData, setRevenueData] = useState<{ name: string; value: number }[]>([]);
  const [courtUsage, setCourtUsage] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const today = new Date().toISOString().split('T')[0];

    const [bookingsRes, customersRes, courtsRes, invoicesRes, todayRes] = await Promise.all([
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('courts').select('*').eq('status', 'active'),
      supabase.from('invoices').select('total, created_at').eq('payment_status', 'paid'),
      supabase.from('bookings').select('*, court:courts(*)').eq('booking_date', today).order('start_time'),
    ]);

    const totalRevenue = (invoicesRes.data || []).reduce((sum, inv) => sum + (inv.total || 0), 0);

    setStats({
      revenue: totalRevenue,
      bookings: bookingsRes.count || 0,
      customers: customersRes.count || 0,
      courts: (courtsRes.data || []).length,
    });

    setTodayBookings((todayRes.data as (Booking & { court?: Court })[]) || []);

    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayRevenue = (invoicesRes.data || [])
        .filter((inv) => inv.created_at?.startsWith(dateStr))
        .reduce((sum, inv) => sum + (inv.total || 0), 0);
      last7.push({
        name: d.toLocaleDateString('vi-VN', { weekday: 'short' }),
        value: dayRevenue,
      });
    }
    setRevenueData(last7);

    const courts = courtsRes.data || [];
    const usage = courts.map((c) => ({
      name: c.name,
      value: (todayRes.data || []).filter((b: Booking) => b.court_id === c.id).length,
    }));
    setCourtUsage(usage.length > 0 ? usage : [{ name: 'Chưa có sân', value: 0 }]);

    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('bookings').update({ status }).eq('id', id);

    // Tạo notification cho khách hàng
    const booking = todayBookings.find((b) => b.id === id);
    if (booking?.created_by) {
      const statusMessages: Record<string, { title: string; message: string; type: string }> = {
        confirmed: {
          title: '✅ Booking đã xác nhận',
          message: `Sân ${booking.court?.name || ''} ngày ${booking.booking_date} lúc ${booking.start_time}-${booking.end_time} đã được xác nhận.`,
          type: 'booking_confirmed',
        },
        cancelled: {
          title: '❌ Booking đã bị hủy',
          message: `Sân ${booking.court?.name || ''} ngày ${booking.booking_date} lúc ${booking.start_time}-${booking.end_time} đã bị hủy bởi admin.`,
          type: 'booking_cancelled',
        },
        checked_in: {
          title: '🏸 Đã check-in',
          message: `Bạn đã check-in sân ${booking.court?.name || ''} lúc ${booking.start_time}. Chúc bạn chơi vui!`,
          type: 'booking_checked_in',
        },
        completed: {
          title: '🎉 Hoàn thành',
          message: `Buổi chơi tại sân ${booking.court?.name || ''} đã hoàn thành. Cảm ơn bạn!`,
          type: 'booking_completed',
        },
      };
      const info = statusMessages[status];
      if (info) {
        await supabase.from('notifications').insert({
          user_id: booking.created_by,
          title: info.title,
          message: info.message,
          type: info.type,
          booking_id: id,
        });
      }
    }

    loadDashboard();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Doanh thu', value: formatCurrency(stats.revenue), icon: DollarSign, color: 'emerald', trend: '+12%', up: true },
    { label: 'Lượt đặt sân', value: stats.bookings, icon: Calendar, color: 'blue', trend: '+8%', up: true },
    { label: 'Khách hàng', value: stats.customers, icon: Users, color: 'amber', trend: '+5%', up: true },
    { label: 'Sân hoạt động', value: stats.courts, icon: CircleDot, color: 'teal', trend: '', up: true },
  ];

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    teal: 'bg-teal-50 text-teal-600',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={card.label} className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-sm card-hover animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[card.color]}`}>
                <card.icon className="w-5 h-5" />
              </div>
              {card.trend && (
                <span className={`text-xs font-semibold flex items-center gap-0.5 ${card.up ? 'text-emerald-600' : 'text-red-500'}`}>
                  {card.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {card.trend}
                </span>
              )}
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Doanh thu 7 ngày qua</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="value" stroke="#059669" strokeWidth={2.5} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Sử dụng sân hôm nay</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={courtUsage} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {courtUsage.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {courtUsage.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {c.name}
                </span>
                <span className="font-semibold text-gray-700">{c.value} lượt</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-gray-900">Lịch đặt sân hôm nay</h3>
          <span className="ml-auto bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-100">
            {todayBookings.length} booking
          </span>
        </div>
        {todayBookings.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Chưa có booking nào hôm nay</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {todayBookings.map((b) => (
              <div key={b.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-emerald-50/30 transition-colors">
                <div className="w-16 text-center">
                  <span className="text-sm font-bold text-gray-900">{formatTime(b.start_time)}</span>
                  <span className="text-xs text-gray-400 block">{formatTime(b.end_time)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{b.court?.name || 'Sân'}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(b.status)}`}>
                  {getStatusLabel(b.status)}
                </span>
                <div className="flex items-center gap-1">
                  {b.status === 'pending' && (
                    <button onClick={() => updateStatus(b.id, 'confirmed')} className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" title="Xác nhận">
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  {b.status === 'confirmed' && (
                    <button onClick={() => updateStatus(b.id, 'checked_in')} className="p-1.5 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors" title="Check-in">
                      <LogIn className="w-4 h-4" />
                    </button>
                  )}
                  {b.status === 'checked_in' && (
                    <button onClick={() => updateStatus(b.id, 'completed')} className="p-1.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" title="Hoàn thành">
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  {b.status !== 'cancelled' && b.status !== 'completed' && (
                    <button onClick={() => updateStatus(b.id, 'cancelled')} className="p-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors" title="Hủy">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
