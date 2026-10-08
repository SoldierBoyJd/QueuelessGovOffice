/**
 * Shared admin shell used by Officer, OfficeAdmin, CentralAdmin, SuperAdmin.
 * Dark graphite sidebar matching the existing design language.
 */
import { useState, useEffect, type ReactNode } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { IndiaEmblem } from '../components/IndiaEmblem';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { SilkBackground } from '../components/SilkBackground';
import { useAuthStore } from '../stores/authStore';
import { useDemoStore } from '../stores/demoStore';
import { Bell, ChevronDown, LogOut, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface AdminNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  route: string;
  badge?: string;
}

export interface AdminNavSection {
  title?: string;
  items: AdminNavItem[];
}

interface AdminShellProps {
  sections: AdminNavSection[];
  roleLabel: string;
  officeName?: string;
}

export default function AdminShell({ sections, roleLabel, officeName }: AdminShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { wsStatus, notifications } = useDemoStore();
  const unread = notifications.filter(n => !n.read).length;
  const [profileOpen, setProfileOpen] = useState(false);

  const isActive = (route: string) => location.pathname === route || location.pathname.startsWith(route + '/');

  return (
    <div className="min-h-screen bg-[#f4f6fa] text-slate-800 font-sans relative overflow-x-hidden">
      <SilkBackground />
      <div className="flex min-h-screen relative z-10">
        {/* Dark Graphite Sidebar */}
        <aside className="w-[240px] flex-shrink-0 flex flex-col bg-[#171717] min-h-screen relative z-20">
          {/* Logo */}
          <div className="px-5 pt-6 pb-5 border-b border-white/10">
            <div className="scale-90 origin-left"><Logo dark /></div>
          </div>

          {/* Role Badge */}
          <div className="px-5 py-3 border-b border-white/10">
            <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-widest">{roleLabel}</div>
            {officeName && <div className="text-[12px] font-semibold text-slate-300 mt-0.5 truncate">{officeName}</div>}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {sections.map((section, si) => (
              <div key={si} className={si > 0 ? 'mt-5' : ''}>
                {section.title && (
                  <div className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">{section.title}</div>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.route);
                    return (
                      <button key={item.id} onClick={() => navigate(item.route)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group ${active ? 'bg-red-600 text-white shadow-[0_2px_8px_rgba(220,38,38,0.35)]' : 'text-slate-400 hover:text-white hover:bg-white/8'}`}>
                        <div className="flex items-center gap-3">
                          <Icon className={`w-[17px] h-[17px] ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && <span className="w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">{item.badge}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom */}
          <div className="px-3 pb-5 pt-3 border-t border-white/10">
            <ConnectionStatus status={wsStatus} dark />
            <div className="mt-4 flex flex-col items-center">
              <IndiaEmblem className="w-14 h-20 mb-1.5 opacity-60" />
              <p className="text-[10px] text-slate-600 text-center leading-snug">Government Services for a Better Tomorrow.</p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top bar */}
          <header className="h-14 bg-white/95 border-b border-slate-200/80 flex items-center justify-between px-6 sticky top-0 z-30 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-semibold text-slate-500 capitalize">{roleLabel}</span>
              <span className="text-slate-300">/</span>
              <span className="text-[13px] font-bold text-slate-900">
                {sections.flatMap(s => s.items).find(i => isActive(i.route))?.label || 'Dashboard'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ConnectionStatus status={wsStatus} />
              {/* Bell */}
              <button className="relative w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                <Bell className="w-4 h-4 text-slate-600" />
                {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600" />}
              </button>
              {/* Profile */}
              <div className="relative">
                <button onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-[11px] font-black flex items-center justify-center">
                    {user?.avatarInitials || 'U'}
                  </div>
                  <span className="text-[13px] font-semibold text-slate-800">{user?.name?.split(' ')[0]}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-100 p-1.5 z-50">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-[12.5px] font-bold text-slate-800">{user?.name}</p>
                      <p className="text-[11px] text-slate-400">{user?.email}</p>
                    </div>
                    <button onClick={() => setProfileOpen(false)} className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                      <User className="w-3.5 h-3.5" /> Profile
                    </button>
                    <button onClick={() => { logout(); navigate('/login'); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-red-600 hover:bg-red-50 rounded-lg font-semibold transition-colors">
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
