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
import { Landmark, Info, MessageSquare, Menu, X } from 'lucide-react';

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

const MORE_LINKS = [
  { id: 'gov',      label: 'Government Offices', icon: Landmark,     route: '/' },
  { id: 'about',    label: 'About SkipTheLine',  icon: Info,         route: '/' },
  { id: 'feedback', label: 'Feedback',           icon: MessageSquare,route: '/' },
];

export default function AdminShell({ sections, roleLabel, officeName, pageTitle, pageSubtitle }: AdminShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { wsStatus } = useDemoStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const isActive = (route: string) =>
    location.pathname === route || location.pathname.startsWith(route + '/');

  const activeItem = sections.flatMap(s => s.items).find(i => isActive(i.route));
  const currentPageTitle = pageTitle    ?? activeItem?.label ?? 'Dashboard';
  const currentPageSub   = pageSubtitle ?? officeName ?? roleLabel;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  void tick;

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

  // Bottom nav = first 4 items across all sections
  const allItems = sections.flatMap(s => s.items);
  const bottomItems = allItems.slice(0, 4);

  // ── Shared sidebar inner ─────────────────────────────────────────────────
  const SidebarInner = () => (
    <>
      <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90 pointer-events-none" />

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {/* Logo + close btn */}
        <div className="pt-1 pb-4 px-1 border-b border-slate-100/60 flex items-center justify-between">
          <Logo />
          <button onClick={() => setDrawerOpen(false)}
            className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-3.5 pt-3 pb-3 border-b border-slate-100/60">
          <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">{roleLabel}</p>
          {officeName && <p className="text-[12px] font-bold text-slate-700 mt-0.5 truncate">{officeName}</p>}
        </div>

        {/* Nav sections */}
        {sections.map((section, si) => (
          <div key={si} className={si === 0 ? 'mt-3' : 'mt-5'}>
            {section.title && (
              <p className="px-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{section.title}</p>
            )}
            <nav className="space-y-0.5">
              {section.items.map(item => {
                const Icon   = item.icon;
                const active = isActive(item.route);
                return (
                  <button key={item.id} onClick={() => navigate(item.route)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 group relative ${
                      active
                        ? 'bg-gradient-to-r from-red-500/15 via-red-500/8 to-transparent border border-red-200/50 text-red-600 font-bold'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                    }`}>
                    {active && <span className="absolute left-0 top-2 bottom-2 w-1 bg-red-600 rounded-r-full" />}
                    <div className="flex items-center gap-3">
                      <Icon className={`w-[19px] h-[19px] flex-shrink-0 ${active ? 'text-red-600 stroke-[2.4]' : 'text-slate-600 stroke-[1.9]'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-red-600 text-white text-[11px] font-bold">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}

        {/* More */}
        <div className="mt-6">
          <p className="px-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">More</p>
          <div className="space-y-0.5">
            {MORE_LINKS.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => navigate(item.route)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium text-slate-700 hover:text-slate-900 hover:bg-white/60 transition-all">
                  <Icon className="w-[19px] h-[19px] text-slate-600 stroke-[1.8]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex-shrink-0 pt-4 pb-1 border-t border-slate-200/50 flex flex-col items-center text-center">
        <div className="mb-2"><ConnectionStatus status={wsStatus} /></div>
        <IndiaEmblem className="w-14 h-18 mb-1 opacity-80" />
        <p className="text-[11px] font-semibold text-slate-500 leading-snug max-w-[170px]">Government Services for a Better Tomorrow.</p>
      </div>
    </>
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#f4f6fa] text-slate-800 font-sans relative">
      <SilkBackground />

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setDrawerOpen(false)} />
      )}

      {/* Mobile drawer — only rendered when open */}
      {drawerOpen && (
        <aside className="fixed inset-y-0 left-0 w-[280px] flex flex-col justify-between liquid-glass-sidebar z-50 p-5 overflow-hidden rounded-r-[28px] lg:hidden">
          <SidebarInner />
        </aside>
      )}

      {/* Desktop sidebar — ONLY this one on lg+ */}
      <aside
        className="hidden lg:flex flex-shrink-0 flex-col justify-between liquid-glass-sidebar relative z-30 w-[260px] m-3 rounded-[28px] p-5 overflow-hidden"
        style={{ height: 'calc(100vh - 1.5rem)' }}
      >
        <SidebarInner />
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col relative z-10 overflow-hidden">

        {/* Top banner */}
        <div className="flex-shrink-0 relative mr-2 sm:mr-3 mt-2 sm:mt-3">
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[20px] sm:rounded-[28px]" style={{ zIndex: 0 }}>
            <SilkRibbonWave />
          </div>

          {/* Mobile hamburger */}
          <div className="lg:hidden absolute left-0 top-0 bottom-0 flex items-center z-40 pl-1">
            <button onClick={() => setDrawerOpen(true)}
              className="liquid-glass-pill w-9 h-9 rounded-full flex items-center justify-center text-slate-600">
              <Menu className="w-4 h-4" />
            </button>
          </div>

          <div className="relative lg:pl-0 pl-11" style={{ zIndex: 30 }}>
            <TopNav
              onLogout={() => { logout(); navigate('/login'); }}
              userName={user?.name}
              userInitials={user?.avatarInitials}
            />
          </div>

          {/* Page heading */}
          <div className="relative pb-3 pt-1" style={{ zIndex: 1 }}>
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] sm:text-[13px] text-slate-500 font-medium">
                  {greeting}, {user?.name?.split(' ')[0] || 'there'}
                </p>
                <h1 className="text-[20px] sm:text-[26px] lg:text-[34px] font-black text-slate-900 tracking-tight leading-tight truncate">
                  {currentPageTitle}
                </h1>
                <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-slate-500 font-medium mt-0.5 truncate">
                  {currentPageSub}
                </p>
              </div>
              {/* Date/time — hidden on small screens */}
              <div className="hidden sm:flex flex-col items-end flex-shrink-0">
                <span className="text-[12px] sm:text-[13px] lg:text-[13.5px] font-semibold text-slate-600">{dateStr}</span>
                <span className="text-[22px] sm:text-[30px] lg:text-[40px] font-black text-[#dc2626] tracking-tight leading-none mt-1">
                  {timeStr}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden mr-2 sm:mr-3 mb-0 lg:mb-3 mt-3 sm:mt-4 px-0.5 pb-20 lg:pb-2">
          <Outlet />
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 liquid-glass-sidebar border-t border-white/50">
        <div className="flex h-16">
          {bottomItems.map(item => {
            const Icon   = item.icon;
            const active = isActive(item.route);
            return (
              <button key={item.id} onClick={() => navigate(item.route)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors ${
                  active ? 'text-red-600' : 'text-slate-500'
                }`}>
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                <span className="text-[10px] font-semibold leading-none">{item.label}</span>
                {active && <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-red-600 rounded-full" />}
              </button>
            );
          })}
          <button onClick={() => setDrawerOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-slate-500">
            <Menu className="w-5 h-5 stroke-[1.8]" />
            <span className="text-[10px] font-semibold leading-none">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
