import { useEffect, useState } from 'react';
import { Calendar, TrendingUp, DollarSign, Users, Download } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { vi } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/helpers';

const COLORS = ['#059669', '#0891b2', '#d97706', '#dc2626', '#6b7280', '#0d9488'];

export default function ReportsPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [revenueData, setRevenueData] = useState<{ name: string; revenue: number; bookings: number }[]>([]);
  const [revenueByType, setRevenueByType] = useState<{ name: string; value: number }[]>([]);
  const [peakHours, setPeakHours] = useState<{ hour: string; count: number }[]>([]);
  const [topCustomers, setTopCustomers] = useState<{ name: string; spent: number; bookings: number }[]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalBookings: 0, avgPerBooking: 0, newCustomers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, [period]);

  async function loadReports() {
    setLoading(true);
    const now = new Date();
    let startDate: Date;

    if (period === 'week') startDate = subDays(now, 7);
    else if (period === 'month') startDate = startOfMonth(now);
    else startDate = new Date(now.getFullYear(), 0, 1);

    const startStr = format(startDate, 'yyyy-MM-dd');

    const [invRes, bookRes, custRes] = await Promise.all([
      supabase.from('invoices').select('*').gte('created_at', startStr).eq('payment_status', 'paid'),
      supabase.from('bookings').select('*, court:courts(name)').gte('booking_date', startStr).neq('status', 'cancelled'),
      supabase.from('customers').select('*').order('total_spent', { ascending: false }).limit(10),
    ]);

    const invoices = invRes.data || [];
    const bookings = bookRes.data || [];
    const customers = custRes.data || [];

    const totalRevenue = invoices.reduce((s, i) => s + (i.total || 0), 0);
    const totalBookings = bookings.length;

    setSummary({
      totalRevenue,
      totalBookings,
      avgPerBooking: totalBookings > 0 ? totalRevenue / totalBookings : 0,
      newCustomers: customers.filter((c) => c.created_at >= startStr).length,
    });

    if (period === 'week') {
      const days = eachDayOfInterval({ start: startDate, end: now });
      setRevenueData(
        days.map((d) => {
          const dateStr = format(d, 'yyyy-MM-dd');
          return {
            name: format(d, 'EEE', { locale: vi }),
            revenue: invoices.filter((i) => i.created_at?.startsWith(dateStr)).reduce((s, i) => s + (i.total || 0), 0),
            bookings: bookings.filter((b) => b.booking_date === dateStr).length,
          };
        })
      );
    } else if (period === 'month') {
      const end = endOfMonth(now);
      const days = eachDayOfInterval({ start: startDate, end: end > now ? now : end });
      setRevenueData(
        days.map((d) => {
          const dateStr = format(d, 'yyyy-MM-dd');
          return {
            name: format(d, 'dd'),
            revenue: invoices.filter((i) => i.created_at?.startsWith(dateStr)).reduce((s, i) => s + (i.total || 0), 0),
            bookings: bookings.filter((b) => b.booking_date === dateStr).length,
          };
        })
      );
    } else {
      const months = Array.from({ length: 12 }, (_, i) => {
        const m = format(new Date(now.getFullYear(), i, 1), 'yyyy-MM');
        return {
          name: format(new Date(now.getFullYear(), i, 1), 'MMM', { locale: vi }),
          revenue: invoices.filter((inv) => inv.created_at?.startsWith(m)).reduce((s, inv) => s + (inv.total || 0), 0),
          bookings: bookings.filter((b) => b.booking_date?.startsWith(m)).length,
        };
      });
      setRevenueData(months);
    }

    const courtMap = new Map<string, number>();
    bookings.forEach((b) => {
      const name = b.court?.name || 'Khác';
      courtMap.set(name, (courtMap.get(name) || 0) + 1);
    });
    setRevenueByType(Array.from(courtMap, ([name, value]) => ({ name, value })));

    const hourMap = new Map<string, number>();
    bookings.forEach((b) => {
      if (b.start_time) {
        const h = b.start_time.slice(0, 2) + ':00';
        hourMap.set(h, (hourMap.get(h) || 0) + 1);
      }
    });
    setPeakHours(
      Array.from(hourMap, ([hour, count]) => ({ hour, count })).sort((a, b) => a.hour.localeCompare(b.hour))
    );

    setTopCustomers(
      customers.slice(0, 5).map((c) => ({
        name: c.name,
        spent: c.total_spent || 0,
        bookings: c.total_bookings || 0,
      }))
    );

    setLoading(false);
  }

  function exportCSV() {
    const BOM = '\uFEFF';
    const lines: string[] = [];

    // Tổng quan
    lines.push('=== BÁO CÁO TỔNG QUAN ===');
    lines.push(`Kỳ báo cáo,${period === 'week' ? 'Tuần' : period === 'month' ? 'Tháng' : 'Năm'}`);
    lines.push(`Tổng doanh thu,${summary.totalRevenue}`);
    lines.push(`Tổng booking,${summary.totalBookings}`);
    lines.push(`TB/booking,${Math.round(summary.avgPerBooking)}`);
    lines.push(`Khách hàng mới,${summary.newCustomers}`);
    lines.push('');

    // Doanh thu theo ngày/tháng
    lines.push('=== DOANH THU & BOOKING ===');
    lines.push('Thời gian,Doanh thu,Booking');
    revenueData.forEach((d) => lines.push(`${d.name},${d.revenue},${d.bookings}`));
    lines.push('');

    // Tỷ lệ sân
    lines.push('=== TỶ LỆ SÂN ===');
    lines.push('Sân,Lượt đặt');
    revenueByType.forEach((d) => lines.push(`${d.name},${d.value}`));
    lines.push('');

    // Giờ cao điểm
    lines.push('=== GIỜ CAO ĐIỂM ===');
    lines.push('Giờ,Số lượt');
    peakHours.forEach((d) => lines.push(`${d.hour},${d.count}`));
    lines.push('');

    // Top khách hàng
    lines.push('=== TOP KHÁCH HÀNG ===');
    lines.push('Tên,Tổng chi,Lượt booking');
    topCustomers.forEach((c) => lines.push(`${c.name},${c.spent},${c.bookings}`));

    const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
        <div className="flex bg-gray-100/80 rounded-xl p-1 gap-1">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {p === 'week' ? 'Tuần' : p === 'month' ? 'Tháng' : 'Năm'}
            </button>
          ))}
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/50 btn-shine">
          <Download className="w-4 h-4" />
          Xuất báo cáo
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng doanh thu', value: formatCurrency(summary.totalRevenue), icon: DollarSign, color: 'emerald' },
          { label: 'Tổng booking', value: summary.totalBookings, icon: Calendar, color: 'blue' },
          { label: 'TB/booking', value: formatCurrency(summary.avgPerBooking), icon: TrendingUp, color: 'amber' },
          { label: 'KH mới', value: summary.newCustomers, icon: Users, color: 'teal' },
        ].map((card) => {
          const colorMap: Record<string, string> = {
            emerald: 'bg-emerald-50 text-emerald-600',
            blue: 'bg-blue-50 text-blue-600',
            amber: 'bg-amber-50 text-amber-600',
            teal: 'bg-teal-50 text-teal-600',
          };
          return (
            <div key={card.label} className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-sm card-hover">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[card.color]}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Doanh thu</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} fill="url(#colorRev)" name="Doanh thu" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Lượt booking</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#0891b2" radius={[4, 4, 0, 0]} name="Booking" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Tỷ lệ sân</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueByType} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {revenueByType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend fontSize={12} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Giờ cao điểm</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="hour" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#d97706" strokeWidth={2} dot={{ r: 4 }} name="Lượt" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Top khách hàng</h3>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.bookings} lượt</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(c.spent)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
