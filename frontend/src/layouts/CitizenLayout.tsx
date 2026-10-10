import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Search, Hash, History, Bell, HelpCircle,
  Landmark, Info, MessageSquare, Menu, X,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { IndiaEmblem } from '../components/IndiaEmblem';
import { TopNav } from '../components/TopNav';
import { HeaderGreeting } from '../components/HeaderGreeting';
import { SilkBackground } from '../components/SilkBackground';
import { SilkRibbonWave } from '../components/SilkRibbonWave';
import { useAuthStore } from '../stores/authStore';
import { useLiveStore } from '../stores/liveStore';
import { ConnectionStatus } from '../components/ConnectionStatus';

const NAV_ROUTES: Record<string, string> = {
  'Home':               '/citizen/home',
  'Find Services':      '/citizen/offices',
  'My Token':           '/citizen/token',
  'History':            '/citizen/history',
  'Notifications':      '/citizen/notifications',
  'Help & Support':     '/citizen/help',
  'Government Offices': '/citizen/government-offices',
  'About SkipTheLine':  '/citizen/about',
  'Feedback':           '/citizen/feedback',
};

const PRIMARY_NAV = [
  { id: 'Home',          label: 'Home',           icon: Home       },
  { id: 'Find Services', label: 'Find Services',  icon: Search     },
  { id: 'My Token',      label: 'My Token',       icon: Hash       },
  { id: 'History',       label: 'History',        icon: History    },
  { id: 'Notifications', label: 'Notifications',  icon: Bell       },
  { id: 'Help & Support',label: 'Help & Support', icon: HelpCircle },
];

const MORE_NAV = [
  { id: 'Government Offices', label: 'Government Offices', icon: Landmark      },
  { id: 'About SkipTheLine',  label: 'About SkipTheLine',  icon: Info           },
  { id: 'Feedback',           label: 'Feedback',           icon: MessageSquare  },
];

// Mobile bottom bar — 4 priority items + hamburger
const BOTTOM_NAV = [
  { id: 'Home',          label: 'Home',    icon: Home    },
  { id: 'My Token',      label: 'Token',   icon: Hash    },
  { id: 'Notifications', label: 'Alerts',  icon: Bell    },
  { id: 'Find Services', label: 'Search',  icon: Search  },
];

function resolveTab(pathname: string): string {
  if (pathname.includes('/citizen/home'))               return 'Home';
  if (pathname.includes('/citizen/offices'))            return 'Find Services';
  if (pathname.includes('/citizen/token'))              return 'My Token';
  if (pathname.includes('/citizen/history'))            return 'History';
  if (pathname.includes('/citizen/notifications'))      return 'Notifications';
  if (pathname.includes('/citizen/profile'))            return 'Profile';
  if (pathname.includes('/citizen/government-offices')) return 'Government Offices';
  if (pathname.includes('/citizen/about'))              return 'About SkipTheLine';
  if (pathname.includes('/citizen/help'))               return 'Help & Support';
  if (pathname.includes('/citizen/feedback'))           return 'Feedback';
  return 'Home';
}

export default function CitizenLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { notifications, wsStatus, lastSyncedAt } = useLiveStore();
  const unread = notifications.filter(n => !n.read).length;

  const [activeTab, setActiveTab] = useState(resolveTab(location.pathname));
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setActiveTab(resolveTab(location.pathname));
    setDrawerOpen(false);
  }, [location.pathname]);

  const go = (tab: string) => {
    const route = NAV_ROUTES[tab];
    if (route) navigate(route);
  };

  // ── Reusable nav button ────────────────────────────────────────────────────
  const NavBtn = ({ item }: { item: { id: string; label: string; icon: React.ComponentType<{ className?: string }> } }) => {
    const Icon = item.icon;
    const active = activeTab === item.id;
    const badge = item.id === 'Notifications' && unread > 0 ? unread : 0;
    return (
      <button
        key={item.id}
        onClick={() => go(item.id)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 group relative ${
          active
            ? 'bg-gradient-to-r from-red-500/15 via-red-500/8 to-transparent border border-red-200/50 text-red-600 font-bold'
            : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
        }`}
      >
        {active && <span className="absolute left-0 top-2 bottom-2 w-1 bg-red-600 rounded-r-full" />}
        <div className="flex items-center gap-3">
          <Icon className={`w-[19px] h-[19px] flex-shrink-0 ${active ? 'text-red-600 stroke-[2.4]' : 'text-slate-600 stroke-[1.9]'}`} />
          <span>{item.label}</span>
        </div>
        {badge > 0 && (
          <span className="w-5 h-5 flex items-center justify-center rounded-full bg-red-600 text-white text-[11px] font-bold">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>
    );
  };

  // ── Sidebar inner content (used by desktop sidebar AND mobile drawer) ───────
  const SidebarInner = () => (
    <>
      <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90 pointer-events-none" />

      {/* Scrollable nav area */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {/* Logo row — with close btn for drawer */}
        <div className="pt-1 pb-5 px-1 border-b border-slate-100/60 flex items-center justify-between">
          <Logo />
          <button
            onClick={() => setDrawerOpen(false)}
            className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary nav */}
        <nav className="mt-4 space-y-0.5">
          {PRIMARY_NAV.map(item => <NavBtn key={item.id} item={item} />)}
        </nav>

        {/* More section */}
        <div className="mt-6">
          <p className="px-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">More</p>
          <div className="space-y-0.5">
            {MORE_NAV.map(item => <NavBtn key={item.id} item={item} />)}
          </div>
        </div>
      </div>

      {/* Bottom — connection + emblem */}
      <div className="flex-shrink-0 pt-4 pb-1 border-t border-slate-200/50 flex flex-col items-center text-center">
        <div className="mb-2">
          <ConnectionStatus status={wsStatus} lastUpdated={lastSyncedAt ?? undefined} />
        </div>
        <IndiaEmblem className="w-16 h-20 mb-1 opacity-90" />
        <p className="text-[11px] font-semibold text-slate-500 leading-snug max-w-[175px]">
          Government Services for a Better Tomorrow.
        </p>
      </div>
    </>
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#f4f6fa] text-slate-800 font-sans relative">
      <SilkBackground />

      {/* ── Mobile drawer backdrop ─────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile slide-in drawer ─────────────────────────────────────── */}
      {drawerOpen && (
        <aside className="fixed inset-y-0 left-0 w-[280px] flex flex-col justify-between liquid-glass-sidebar z-50 p-5 overflow-hidden rounded-r-[28px] lg:hidden">
          <SidebarInner />
        </aside>
      )}

      {/* ── Desktop sidebar (lg+) — ONLY this one renders on desktop ──── */}
      <aside
        className="hidden lg:flex flex-shrink-0 flex-col justify-between liquid-glass-sidebar relative z-30 w-[260px] m-3 rounded-[28px] p-5 overflow-hidden"
        style={{ height: 'calc(100vh - 1.5rem)' }}
      >
        <SidebarInner />
      </aside>

      {/* ── Main column ───────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col relative z-10 overflow-hidden">

        {/* Sticky top banner (ribbon + nav + greeting) */}
        <div className="flex-shrink-0 relative mr-2 sm:mr-3 mt-2 sm:mt-3">
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[20px] sm:rounded-[28px]" style={{ zIndex: 0 }}>
            <SilkRibbonWave />
          </div>

          {/* Mobile hamburger — overlaid at left of nav row */}
          <div className="lg:hidden absolute left-0 top-0 bottom-0 flex items-center z-40 pl-1">
            <button
              onClick={() => setDrawerOpen(true)}
              className="liquid-glass-pill w-9 h-9 rounded-full flex items-center justify-center text-slate-600 flex-shrink-0"
            >
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

          <div className="relative" style={{ zIndex: 1 }}>
            <HeaderGreeting userName={user?.name?.split(' ')[0] || 'there'} />
          </div>
        </div>

        {/* Scrollable page content */}
        {/* pb-20 on mobile/tablet clears the bottom navigation bar */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden mr-2 sm:mr-3 mb-0 lg:mb-3 mt-3 sm:mt-4 px-0.5 pb-20 lg:pb-2">
          <Outlet />
        </div>
      </div>

      {/* ── Mobile bottom navigation (hidden on lg+) ──────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 liquid-glass-sidebar border-t border-white/50">
        <div className="flex h-16">
          {BOTTOM_NAV.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            const badge = item.id === 'Notifications' && unread > 0 ? unread : 0;
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors ${
                  active ? 'text-red-600' : 'text-slate-500'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${active ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-2 w-4 h-4 flex items-center justify-center rounded-full bg-red-600 text-white text-[9px] font-black">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold leading-none ${active ? 'text-red-600' : 'text-slate-500'}`}>
                  {item.label}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-red-600 rounded-full" />
                )}
              </button>
            );
          })}
          {/* More → opens drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-slate-500"
          >
            <Menu className="w-5 h-5 stroke-[1.8]" />
            <span className="text-[10px] font-semibold leading-none">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
