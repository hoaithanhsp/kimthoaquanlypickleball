import { Outlet } from 'react-router-dom';
import { CircleDot, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import NotificationBell from './NotificationBell';

export default function CustomerLayout() {
  const { profile, signOut } = useAuthStore();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 glass-strong border-b border-white/30">
        <div className="max-w-2xl mx-auto h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-200">
              <CircleDot className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">PickleBall Pro</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-sm">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">{profile?.full_name || 'Khách'}</span>
            </div>
            <button
              onClick={signOut}
              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
