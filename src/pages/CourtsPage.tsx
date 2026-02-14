import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Columns3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, getStatusColor, getStatusLabel } from '../lib/helpers';
import type { Court } from '../types';

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Court | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'outdoor' as 'indoor' | 'outdoor',
    surface: 'concrete',
    status: 'active' as Court['status'],
    hourly_rate: 0,
    peak_rate: 0,
    lighting_fee: 0,
    description: '',
  });

  useEffect(() => {
    loadCourts();
  }, []);

  async function loadCourts() {
    const { data } = await supabase.from('courts').select('*').order('name');
    setCourts(data || []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', type: 'outdoor', surface: 'concrete', status: 'active', hourly_rate: 0, peak_rate: 0, lighting_fee: 0, description: '' });
    setShowModal(true);
  }

  function openEdit(court: Court) {
    setEditing(court);
    setForm({
      name: court.name,
      type: court.type,
      surface: court.surface,
      status: court.status,
      hourly_rate: court.hourly_rate,
      peak_rate: court.peak_rate,
      lighting_fee: court.lighting_fee,
      description: court.description,
    });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      await supabase.from('courts').update(form).eq('id', editing.id);
    } else {
      await supabase.from('courts').insert(form);
    }
    setShowModal(false);
    loadCourts();
  }

  async function handleDelete(id: string) {
    if (!confirm('Xác nhận xóa sân này?')) return;
    await supabase.from('courts').delete().eq('id', id);
    loadCourts();
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
        <p className="text-gray-500 text-sm font-medium">{courts.length} sân</p>
        <button onClick={openCreate} className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/50 btn-shine">
          <Plus className="w-4 h-4" />
          Thêm sân
        </button>
      </div>

      {courts.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 p-12 text-center">
          <Columns3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Chưa có sân nào. Tạo sân đầu tiên!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.map((court, i) => (
            <div key={court.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm card-hover overflow-hidden group animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className={`h-32 flex items-center justify-center ${court.type === 'indoor' ? 'bg-gradient-to-br from-blue-50 to-cyan-100' : 'bg-gradient-to-br from-emerald-50 to-teal-100'}`}>
                <div className="text-center">
                  <Columns3 className={`w-10 h-10 mx-auto ${court.type === 'indoor' ? 'text-blue-400' : 'text-emerald-400'}`} />
                  <span className="text-xs mt-2 block text-gray-500 font-medium">{court.type === 'indoor' ? 'Trong nhà' : 'Ngoài trời'}</span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{court.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{court.surface}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(court.status)}`}>
                    {getStatusLabel(court.status)}
                  </span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Giá thường</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(court.hourly_rate)}/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Giá cao điểm</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(court.peak_rate)}/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phí đèn</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(court.lighting_fee)}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button onClick={() => openEdit(court)} className="flex-1 flex items-center justify-center gap-1.5 text-sm text-gray-600 hover:text-emerald-600 py-2 rounded-lg hover:bg-emerald-50 transition-colors">
                    <Edit2 className="w-4 h-4" /> Sửa
                  </button>
                  <button onClick={() => handleDelete(court.id)} className="flex-1 flex items-center justify-center gap-1.5 text-sm text-gray-600 hover:text-red-600 py-2 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" /> Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editing ? 'Sửa sân' : 'Thêm sân mới'}</h3>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên sân</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại sân</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'indoor' | 'outdoor' })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                    <option value="outdoor">Ngoài trời</option>
                    <option value="indoor">Trong nhà</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Court['status'] })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                    <option value="active">Hoạt động</option>
                    <option value="maintenance">Bảo trì</option>
                    <option value="inactive">Ngừng</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá thường (VNĐ/h)</label>
                  <input type="number" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá cao điểm</label>
                  <input type="number" value={form.peak_rate} onChange={(e) => setForm({ ...form, peak_rate: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phí đèn</label>
                  <input type="number" value={form.lighting_fee} onChange={(e) => setForm({ ...form, lighting_fee: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Hủy</button>
                <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/50">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
