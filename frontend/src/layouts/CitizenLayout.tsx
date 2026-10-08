import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Hash, History, Bell, HelpCircle, Landmark, Info, MessageSquare } from 'lucide-react';
import { Logo } from '../components/Logo';
import { IndiaEmblem } from '../components/IndiaEmblem';
import { TopNav } from '../components/TopNav';
import { HeaderGreeting } from '../components/HeaderGreeting';
import { SilkBackground } from '../components/SilkBackground';
import { SilkRibbonWave } from '../components/SilkRibbonWave';
import { useAuthStore } from '../stores/authStore';
import { useDemoStore } from '../stores/demoStore';
import { ConnectionStatus } from '../components/ConnectionStatus';

const NAV_ROUTES: Record<string, string> = {
  'Home': '/citizen/home',
  'Find Services': '/citizen/offices',
  'My Token': '/citizen/token',
  'History': '/citizen/history',
  'Notifications': '/citizen/notifications',
  'Help & Support': '/citizen/home',
  'Government Offices': '/citizen/offices',
  'About SkipTheLine': '/citizen/home',
  'Feedback': '/citizen/home',
};

export default function CitizenLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { notifications, wsStatus } = useDemoStore();
  const unread = notifications.filter(n => !n.read).length;

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/citizen/home')) return 'Home';
    if (path.includes('/citizen/offices')) return 'Find Services';
    if (path.includes('/citizen/token')) return 'My Token';
    if (path.includes('/citizen/history')) return 'History';
    if (path.includes('/citizen/notifications')) return 'Notifications';
    if (path.includes('/citizen/profile')) return 'Profile';
    return 'Home';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  const handleSelect = (tab: string) => {
    setActiveTab(tab);
    const route = NAV_ROUTES[tab];
    if (route) navigate(route);
  };

  const navItems = [
    { id: 'Home', label: 'Home', icon: Home },
    { id: 'Find Services', label: 'Find Services', icon: Search },
    { id: 'My Token', label: 'My Token', icon: Hash },
    { id: 'History', label: 'History', icon: History },
    { id: 'Notifications', label: 'Notifications', icon: Bell, badge: unread > 0 ? String(unread) : undefined },
    { id: 'Help & Support', label: 'Help & Support', icon: HelpCircle },
  ];
  const moreItems = [
    { id: 'Government Offices', label: 'Government Offices', icon: Landmark },
    { id: 'About SkipTheLine', label: 'About SkipTheLine', icon: Info },
    { id: 'Feedback', label: 'Feedback', icon: MessageSquare },
  ];

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f4f6fa] text-slate-800 font-sans relative overflow-x-hidden p-3.5 sm:p-5 lg:p-6">
      <SilkBackground />
      <div className="max-w-[1580px] mx-auto flex gap-5 lg:gap-6 relative z-10 items-start">
        {/* Sidebar */}
        <aside className="w-[260px] flex-shrink-0 flex flex-col justify-between rounded-[28px] liquid-glass-sidebar p-5 z-20 min-h-[920px] relative overflow-hidden">
          <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90 pointer-events-none" />
          <div>
            <div className="pt-1 pb-6 px-1 border-b border-slate-100/60">
              <Logo />
            </div>
            <nav className="mt-5 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button key={item.id} onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-all duration-200 group relative ${isActive ? 'bg-gradient-to-r from-red-500/15 via-red-500/8 to-transparent border border-red-200/50 text-red-600 font-bold shadow-[0_2px_10px_rgba(239,68,68,0.06)]' : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'}`}>
                    {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 bg-red-600 rounded-r-full" />}
                    <div className="flex items-center gap-3">
                      <Icon className={`w-[19px] h-[19px] transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-red-600 stroke-[2.4]' : 'text-slate-600 stroke-[1.9]'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && <span className="w-5 h-5 flex items-center justify-center rounded-full bg-red-600 text-white text-[11px] font-bold shadow-sm">{item.badge}</span>}
                  </button>
                );
              })}
            </nav>
            <div className="mt-7">
              <div className="px-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">More</div>
              <div className="space-y-1">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} onClick={() => handleSelect(item.id)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-all duration-200 group text-slate-700 hover:text-slate-900 hover:bg-white/60">
                      <Icon className="w-[19px] h-[19px] text-slate-600 stroke-[1.8] group-hover:scale-105 transition-transform" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="pt-5 pb-1 border-t border-slate-200/50 flex flex-col items-center text-center">
            <div className="mb-3"><ConnectionStatus status={wsStatus} /></div>
            <IndiaEmblem className="w-20 h-28 mb-1.5" />
            <p className="text-[12px] font-semibold text-slate-600 leading-snug tracking-tight max-w-[185px]">Government Services for a Better Tomorrow.</p>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col gap-4 relative overflow-visible">
          <div className="relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
              <SilkRibbonWave />
            </div>
            <div className="relative" style={{ zIndex: 30 }}>
              <TopNav onLogout={() => { logout(); navigate('/login'); }} userName={user?.name} userInitials={user?.avatarInitials} />
            </div>
            <div className="relative" style={{ zIndex: 1 }}>
              <HeaderGreeting userName={user?.name?.split(' ')[0] || 'there'} greeting={greeting} dateStr={dateStr} timeStr={timeStr} />
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
