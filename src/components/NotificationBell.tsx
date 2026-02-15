import { useEffect, useState, useRef } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Notification } from '../types';

export default function NotificationBell() {
    const { user } = useAuthStore();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    useEffect(() => {
        if (!user) return;
        loadNotifications();

        // Realtime subscription
        const channel = supabase
            .channel('notifications-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications((prev) => [newNotif, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function loadNotifications() {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: false })
            .limit(20);
        setNotifications((data as Notification[]) || []);
    }

    async function markAsRead(id: string) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
    }

    async function markAllRead() {
        const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
        if (unreadIds.length === 0) return;
        await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }

    function getTimeAgo(dateStr: string) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Vừa xong';
        if (minutes < 60) return `${minutes} phút trước`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        return `${days} ngày trước`;
    }

    function getTypeIcon(type: string) {
        switch (type) {
            case 'booking_confirmed': return '✅';
            case 'booking_cancelled': return '❌';
            case 'booking_checked_in': return '🏸';
            case 'booking_completed': return '🎉';
            default: return 'ℹ️';
        }
    }

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2.5 rounded-xl hover:bg-white/80 transition-all group"
            >
                <Bell className={`w-5 h-5 transition-colors ${unreadCount > 0 ? 'text-emerald-600' : 'text-gray-500 group-hover:text-gray-700'}`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-bounce shadow-lg shadow-red-200">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-slide-up">
                    {/* Header */}
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                        <h3 className="font-bold text-gray-900 text-sm">Thông báo</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Đọc hết
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Notification list */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-12 text-center">
                                <Bell className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                                <p className="text-sm text-gray-400">Chưa có thông báo nào</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => !n.is_read && markAsRead(n.id)}
                                    className={`px-5 py-3.5 border-b border-gray-50 flex gap-3 transition-colors cursor-pointer hover:bg-gray-50/80 ${!n.is_read ? 'bg-emerald-50/30' : ''
                                        }`}
                                >
                                    <div className="text-lg flex-shrink-0 mt-0.5">{getTypeIcon(n.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-sm leading-tight ${!n.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                {n.title}
                                            </p>
                                            {!n.is_read && (
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.message}</p>
                                        <p className="text-[10px] text-gray-400 mt-1.5">{getTimeAgo(n.created_at)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
