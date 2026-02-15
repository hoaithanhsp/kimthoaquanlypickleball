import { useEffect, useState } from 'react';
import { Search, UserPlus, Shield, ShieldCheck, UserCog, Mail, Clock, ChevronDown, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

const roleBadge: Record<string, { label: string; className: string }> = {
    admin: { label: 'Admin', className: 'bg-purple-50 text-purple-700 border border-purple-200' },
    staff: { label: 'Nhân viên', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
    customer: { label: 'Khách', className: 'bg-gray-100 text-gray-600 border border-gray-200' },
};

const roleIcon: Record<string, typeof Shield> = {
    admin: ShieldCheck,
    staff: Shield,
    customer: UserCog,
};

export default function UsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showInvite, setShowInvite] = useState(false);
    const [inviteForm, setInviteForm] = useState({ email: '', full_name: '', password: '', role: 'staff' as string });
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState('');
    const [changingRole, setChangingRole] = useState<string | null>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_all_profiles');
        if (error) {
            console.error('Error loading users:', error);
            setUsers([]);
        } else {
            setUsers((data as UserProfile[]) || []);
        }
        setLoading(false);
    }

    async function handleRoleChange(userId: string, newRole: string) {
        setChangingRole(userId);
        const { error } = await supabase.rpc('update_user_role', {
            target_user_id: userId,
            new_role: newRole,
        });
        if (error) {
            alert('Lỗi: ' + error.message);
        }
        await loadUsers();
        setChangingRole(null);
    }

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        setInviteLoading(true);
        setInviteError('');
        setInviteSuccess('');

        // Tạo tài khoản mới qua Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email: inviteForm.email,
            password: inviteForm.password,
            options: {
                data: { full_name: inviteForm.full_name },
            },
        });

        if (error) {
            setInviteError(error.message);
            setInviteLoading(false);
            return;
        }

        // Cập nhật role nếu không phải customer (trigger mặc định tạo customer)
        if (data.user && inviteForm.role !== 'customer') {
            // Đợi profile được tạo bởi trigger
            await new Promise((r) => setTimeout(r, 1500));
            await supabase.rpc('update_user_role', {
                target_user_id: data.user.id,
                new_role: inviteForm.role,
            });
        }

        setInviteSuccess(`Đã mời ${inviteForm.email} thành công!`);
        setInviteForm({ email: '', full_name: '', password: '', role: 'staff' });
        setInviteLoading(false);
        await loadUsers();

        // Đóng modal sau 2 giây
        setTimeout(() => {
            setShowInvite(false);
            setInviteSuccess('');
        }, 2000);
    }

    function formatDate(date: string) {
        return new Date(date).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }

    const filtered = users.filter(
        (u) =>
            u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase())
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm người dùng..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white/80 backdrop-blur-sm"
                    />
                </div>
                <button
                    onClick={() => { setShowInvite(true); setInviteError(''); setInviteSuccess(''); }}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/50 whitespace-nowrap btn-shine"
                >
                    <UserPlus className="w-4 h-4" />
                    Mời người dùng
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {(['admin', 'staff', 'customer'] as const).map((role) => {
                    const count = users.filter((u) => u.role === role).length;
                    const badge = roleBadge[role];
                    const Icon = roleIcon[role];
                    return (
                        <div key={role} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${badge.className}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                                    <p className="text-xs text-gray-500">{badge.label}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 p-12 text-center">
                    <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">{search ? 'Không tìm thấy người dùng' : 'Chưa có người dùng nào'}</p>
                </div>
            ) : (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Người dùng</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3 hidden sm:table-cell">Email</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Vai trò</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3 hidden md:table-cell">Ngày tạo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((u) => {
                                    const badge = roleBadge[u.role] || roleBadge.customer;
                                    return (
                                        <tr key={u.id} className="hover:bg-emerald-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                                                        {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{u.full_name || '(Chưa đặt tên)'}</p>
                                                        <p className="text-xs text-gray-400 sm:hidden">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 hidden sm:table-cell">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                    {u.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="relative inline-block">
                                                    <select
                                                        value={u.role}
                                                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                        disabled={changingRole === u.id}
                                                        className={`appearance-none text-xs font-semibold px-3 py-1.5 pr-7 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-all ${badge.className} ${changingRole === u.id ? 'opacity-50' : ''}`}
                                                    >
                                                        <option value="admin">Admin</option>
                                                        <option value="staff">Nhân viên</option>
                                                        <option value="customer">Khách</option>
                                                    </select>
                                                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-gray-400" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatDate(u.created_at)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {showInvite && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-lg animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-emerald-600" />
                                Mời người dùng mới
                            </h3>
                        </div>
                        <form onSubmit={handleInvite} className="p-6 space-y-4">
                            {inviteError && (
                                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100 animate-fade-in">
                                    {inviteError}
                                </div>
                            )}
                            {inviteSuccess && (
                                <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-3 rounded-xl border border-emerald-100 animate-fade-in">
                                    ✅ {inviteSuccess}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                                <input
                                    value={inviteForm.full_name}
                                    onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Nguyễn Văn A"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={inviteForm.email}
                                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="email@example.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                                <input
                                    type="password"
                                    value={inviteForm.password}
                                    onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Tối thiểu 6 ký tự"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                                <select
                                    value={inviteForm.role}
                                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="staff">Nhân viên</option>
                                    <option value="customer">Khách hàng</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowInvite(false)}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={inviteLoading}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/50 disabled:opacity-50"
                                >
                                    {inviteLoading ? 'Đang gửi...' : 'Mời người dùng'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
