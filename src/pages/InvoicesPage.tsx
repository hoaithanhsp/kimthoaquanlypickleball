import { useEffect, useState } from 'react';
import { Plus, Search, FileText, Eye, Printer, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, generateInvoiceNumber } from '../lib/helpers';
import type { Invoice, Customer, Booking, Court } from '../types';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<(Booking & { court?: Court })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<Invoice | null>(null);
  const [form, setForm] = useState({
    customer_id: '',
    booking_id: '',
    subtotal: 0,
    discount: 0,
    tax: 0,
    deposit_deducted: 0,
    payment_method: 'cash' as Invoice['payment_method'],
    payment_status: 'paid' as Invoice['payment_status'],
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [invRes, custRes, bookRes] = await Promise.all([
      supabase.from('invoices').select('*, customer:customers(*)').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('name'),
      supabase.from('bookings').select('*, court:courts(*)').eq('status', 'checked_in').order('booking_date'),
    ]);
    setInvoices((invRes.data as Invoice[]) || []);
    setCustomers(custRes.data || []);
    setBookings((bookRes.data as (Booking & { court?: Court })[]) || []);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const total = form.subtotal - form.discount + form.tax;
    const amount_due = total - form.deposit_deducted;
    await supabase.from('invoices').insert({
      invoice_number: generateInvoiceNumber(),
      customer_id: form.customer_id || null,
      booking_id: form.booking_id || null,
      subtotal: form.subtotal,
      discount: form.discount,
      tax: form.tax,
      total,
      deposit_deducted: form.deposit_deducted,
      amount_due,
      payment_method: form.payment_method,
      payment_status: form.payment_status,
      notes: form.notes,
    });
    if (form.booking_id) {
      await supabase.from('bookings').update({ status: 'completed' }).eq('id', form.booking_id);
    }
    setShowModal(false);
    loadData();
  }

  const filtered = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const methodLabels: Record<string, string> = {
    cash: 'Tiền mặt',
    transfer: 'Chuyển khoản',
    card: 'Thẻ',
    momo: 'Momo',
    zalopay: 'ZaloPay',
    vnpay: 'VNPay',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm hóa đơn..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white/80 backdrop-blur-sm" />
        </div>
        <button onClick={() => { setForm({ customer_id: '', booking_id: '', subtotal: 0, discount: 0, tax: 0, deposit_deducted: 0, payment_method: 'cash', payment_status: 'paid', notes: '' }); setShowModal(true); }} className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/50 whitespace-nowrap btn-shine">
          <Plus className="w-4 h-4" />
          Tạo hóa đơn
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{search ? 'Không tìm thấy hóa đơn' : 'Chưa có hóa đơn nào'}</p>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Số HĐ</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3 hidden sm:table-cell">Khách hàng</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3 hidden md:table-cell">Ngày</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3">Tổng tiền</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase px-6 py-3">TT thanh toán</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">{inv.customer?.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">{formatDate(inv.created_at)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">{formatCurrency(inv.total)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(inv.payment_status)}`}>
                        {getStatusLabel(inv.payment_status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setShowDetail(inv)} className="p-2 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Hóa đơn {showDetail.invoice_number}</h3>
              <div className="flex gap-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <Printer className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Khách hàng</span><span className="font-medium text-gray-900">{showDetail.customer?.name || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Ngày tạo</span><span className="text-gray-900">{formatDate(showDetail.created_at)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phương thức</span><span className="text-gray-900">{methodLabels[showDetail.payment_method]}</span></div>
              </div>
              <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Tạm tính</span><span>{formatCurrency(showDetail.subtotal)}</span></div>
                {showDetail.discount > 0 && <div className="flex justify-between"><span className="text-gray-500">Giảm giá</span><span className="text-red-500">-{formatCurrency(showDetail.discount)}</span></div>}
                {showDetail.tax > 0 && <div className="flex justify-between"><span className="text-gray-500">Thuế</span><span>{formatCurrency(showDetail.tax)}</span></div>}
                {showDetail.deposit_deducted > 0 && <div className="flex justify-between"><span className="text-gray-500">Trừ cọc</span><span className="text-emerald-600">-{formatCurrency(showDetail.deposit_deducted)}</span></div>}
                <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold text-base">
                  <span>Thanh toán</span>
                  <span className="text-emerald-600">{formatCurrency(showDetail.amount_due)}</span>
                </div>
              </div>
              <button onClick={() => setShowDetail(null)} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors mt-4">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Tạo hóa đơn mới</h3>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng</label>
                <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">Chọn khách hàng</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {bookings.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Booking (đang chơi)</label>
                  <select value={form.booking_id} onChange={(e) => setForm({ ...form, booking_id: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">Không liên kết</option>
                    {bookings.map((b) => <option key={b.id} value={b.id}>{b.court?.name} - {b.booking_date}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tạm tính (VNĐ)</label>
                  <input type="number" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giảm giá</label>
                  <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thuế (VNĐ)</label>
                  <input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trừ cọc</label>
                  <input type="number" value={form.deposit_deducted} onChange={(e) => setForm({ ...form, deposit_deducted: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phương thức</label>
                  <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value as Invoice['payment_method'] })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {Object.entries(methodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value as Invoice['payment_status'] })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="paid">Đã thanh toán</option>
                    <option value="partial">Thanh toán 1 phần</option>
                    <option value="unpaid">Chưa thanh toán</option>
                  </select>
                </div>
              </div>
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 text-right border border-emerald-100">
                <span className="text-sm text-gray-500">Tổng thanh toán: </span>
                <span className="text-lg font-bold text-emerald-600">{formatCurrency(form.subtotal - form.discount + form.tax - form.deposit_deducted)}</span>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Hủy</button>
                <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/50">Tạo hóa đơn</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
