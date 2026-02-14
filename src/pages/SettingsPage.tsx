import { useEffect, useState } from 'react';
import { Save, Building2, Clock, DollarSign, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingsMap {
  business_name: string;
  business_phone: string;
  business_address: string;
  business_email: string;
  operating_hours: { open: string; close: string };
  peak_hours: { start: string; end: string };
  booking_slot_duration: number;
  deposit_percentage: number;
  cancellation_policy: { free_cancel_hours: number; cancel_fee_percent: number };
  tax_rate: number;
  currency: string;
}

const defaultSettings: SettingsMap = {
  business_name: '',
  business_phone: '',
  business_address: '',
  business_email: '',
  operating_hours: { open: '06:00', close: '22:00' },
  peak_hours: { start: '17:00', end: '21:00' },
  booking_slot_duration: 60,
  deposit_percentage: 30,
  cancellation_policy: { free_cancel_hours: 24, cancel_fee_percent: 50 },
  tax_rate: 10,
  currency: 'VND',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('*');
    if (data && data.length > 0) {
      const map = { ...defaultSettings };
      data.forEach((row) => {
        const key = row.key as keyof SettingsMap;
        if (key in map) {
          (map as Record<string, unknown>)[key] = row.value;
        }
      });
      setSettings(map);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const entries = Object.entries(settings);
    for (const [key, value] of entries) {
      await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Cấu hình hệ thống quản lý</p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/50 disabled:opacity-50 btn-shine"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Đang lưu...' : saved ? 'Đã lưu ✓' : 'Lưu thay đổi'}
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-gray-900">Thông tin doanh nghiệp</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên doanh nghiệp</label>
              <input value={settings.business_name} onChange={(e) => setSettings({ ...settings, business_name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input value={settings.business_phone} onChange={(e) => setSettings({ ...settings, business_phone: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
            <input value={settings.business_address} onChange={(e) => setSettings({ ...settings, business_address: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={settings.business_email} onChange={(e) => setSettings({ ...settings, business_email: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-gray-900">Giờ hoạt động</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giờ mở cửa</label>
              <input type="time" value={settings.operating_hours.open} onChange={(e) => setSettings({ ...settings, operating_hours: { ...settings.operating_hours, open: e.target.value } })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giờ đóng cửa</label>
              <input type="time" value={settings.operating_hours.close} onChange={(e) => setSettings({ ...settings, operating_hours: { ...settings.operating_hours, close: e.target.value } })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giờ cao điểm từ</label>
              <input type="time" value={settings.peak_hours.start} onChange={(e) => setSettings({ ...settings, peak_hours: { ...settings.peak_hours, start: e.target.value } })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giờ cao điểm đến</label>
              <input type="time" value={settings.peak_hours.end} onChange={(e) => setSettings({ ...settings, peak_hours: { ...settings.peak_hours, end: e.target.value } })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thời lượng slot (phút)</label>
            <input type="number" value={settings.booking_slot_duration} onChange={(e) => setSettings({ ...settings, booking_slot_duration: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-xs" />
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-gray-900">Tài chính</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tỷ lệ cọc (%)</label>
              <input type="number" value={settings.deposit_percentage} onChange={(e) => setSettings({ ...settings, deposit_percentage: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thuế suất (%)</label>
              <input type="number" value={settings.tax_rate} onChange={(e) => setSettings({ ...settings, tax_rate: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-gray-900">Chính sách hủy</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hủy miễn phí trước (giờ)</label>
              <input type="number" value={settings.cancellation_policy.free_cancel_hours} onChange={(e) => setSettings({ ...settings, cancellation_policy: { ...settings.cancellation_policy, free_cancel_hours: +e.target.value } })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phí hủy muộn (%)</label>
              <input type="number" value={settings.cancellation_policy.cancel_fee_percent} onChange={(e) => setSettings({ ...settings, cancellation_policy: { ...settings.cancellation_policy, cancel_fee_percent: +e.target.value } })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
