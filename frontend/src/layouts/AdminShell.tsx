/**
 * AdminShell — identical visual language to CitizenLayout.
 * Liquid glass sidebar, silk ribbon wave, floating top nav, same card system.
 * Used by: Officer, OfficeAdmin, CentralAdmin, SuperAdmin.
 */
import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { IndiaEmblem } from '../components/IndiaEmblem';
import { TopNav } from '../components/TopNav';
import { SilkBackground } from '../components/SilkBackground';
import { SilkRibbonWave } from '../components/SilkRibbonWave';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { useAuthStore } from '../stores/authStore';
import { useDemoStore } from '../stores/demoStore';
import type { LucideIcon } from 'lucide-react';
import { Landmark, Info, MessageSquare } from 'lucide-react';

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
  pageTitle?: string;
  pageSubtitle?: string;
}

export default function AdminShell({
  sections,
  roleLabel,
  officeName,
  pageTitle,
  pageSubtitle,
}: AdminShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { wsStatus, notifications } = useDemoStore();
  const unreadCount = notifications.filter(n => !n.read).length;
  void unreadCount; // available for badge display in TopNav

  const isActive = (route: string) =>
    location.pathname === route || location.pathname.startsWith(route + '/');

  const activeItem = sections.flatMap(s => s.items).find(i => isActive(i.route));
  const currentPageTitle  = pageTitle  ?? activeItem?.label ?? 'Dashboard';
  const currentPageSub    = pageSubtitle ?? (officeName ?? roleLabel);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceUpdate(n => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const moreItems = [
    { id: 'offices', label: 'Government Offices', icon: Landmark, route: '/citizen/offices' },
    { id: 'about',   label: 'About SkipTheLine',  icon: Info,     route: '/'               },
    { id: 'feedback',label: 'Feedback',            icon: MessageSquare, route: '/'          },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6fa] text-slate-800 font-sans relative overflow-x-hidden p-3.5 sm:p-5 lg:p-6">
      <SilkBackground />

      <div className="max-w-[1580px] mx-auto flex gap-5 lg:gap-6 relative z-10 items-start">

        {/* ── Sidebar — identical to CitizenLayout ───────────────────── */}
        <aside className="w-[260px] flex-shrink-0 flex flex-col justify-between rounded-[28px] liquid-glass-sidebar p-5 z-20 min-h-[920px] relative overflow-hidden sticky top-6">
          {/* Specular edge highlight */}
          <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90 pointer-events-none" />

          <div>
            {/* Logo */}
            <div className="pt-1 pb-5 px-1 border-b border-slate-100/60">
              <Logo />
            </div>

            {/* Role badge */}
            <div className="px-3.5 pt-3 pb-4 border-b border-slate-100/60">
              <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">{roleLabel}</div>
              {officeName && (
                <div className="text-[12.5px] font-bold text-slate-700 mt-0.5 truncate">{officeName}</div>
              )}
            </div>

            {/* Nav sections */}
            {sections.map((section, si) => (
              <div key={si} className={si === 0 ? 'mt-4' : 'mt-6'}>
                {section.title && (
                  <div className="px-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    {section.title}
                  </div>
                )}
                <nav className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.route);
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.route)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-all duration-200 group relative ${
                          active
                            ? 'bg-gradient-to-r from-red-500/15 via-red-500/8 to-transparent border border-red-200/50 text-red-600 font-bold shadow-[0_2px_10px_rgba(239,68,68,0.06)]'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-2 bottom-2 w-1 bg-red-600 rounded-r-full" />
                        )}
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-[19px] h-[19px] transition-transform duration-200 group-hover:scale-105 ${
                              active ? 'text-red-600 stroke-[2.4]' : 'text-slate-600 stroke-[1.9]'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="w-5 h-5 flex items-center justify-center rounded-full bg-red-600 text-white text-[11px] font-bold shadow-sm">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}

            {/* More section */}
            <div className="mt-7">
              <div className="px-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">More</div>
              <div className="space-y-1">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.route)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-all duration-200 group text-slate-700 hover:text-slate-900 hover:bg-white/60"
                    >
                      <Icon className="w-[19px] h-[19px] text-slate-600 stroke-[1.8] group-hover:scale-105 transition-transform" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom — connection status + emblem */}
          <div className="pt-5 pb-1 border-t border-slate-200/50 flex flex-col items-center text-center">
            <div className="mb-3">
              <ConnectionStatus status={wsStatus} />
            </div>
            <IndiaEmblem className="w-20 h-28 mb-1.5" />
            <p className="text-[12px] font-semibold text-slate-600 leading-snug tracking-tight max-w-[185px]">
              Government Services for a Better Tomorrow.
            </p>
          </div>
        </aside>

        {/* ── Main content ───────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 flex flex-col gap-4 relative overflow-visible">

          {/* Top banner with ribbon — same as citizen */}
          <div className="relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
              <SilkRibbonWave />
            </div>
            <div className="relative" style={{ zIndex: 30 }}>
              <TopNav
                onLogout={() => { logout(); navigate('/login'); }}
                userName={user?.name}
                userInitials={user?.avatarInitials}
              />
            </div>
            {/* Page heading in the greeting slot */}
            <div className="relative pb-4 pt-2" style={{ zIndex: 1 }}>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[13px] text-slate-500 font-medium">
                    {greeting}, {user?.name?.split(' ')[0] || 'there'}
                  </p>
                  <h1 className="text-[34px] font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                    {currentPageTitle}
                  </h1>
                  <p className="text-[14px] text-slate-500 font-medium mt-1">
                    {currentPageSub}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[13.5px] font-semibold text-slate-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
                    {dateStr}
                  </span>
                  <span className="text-3xl lg:text-[40px] font-black text-[#dc2626] tracking-tight leading-none mt-1 drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]">
                    {timeStr}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
