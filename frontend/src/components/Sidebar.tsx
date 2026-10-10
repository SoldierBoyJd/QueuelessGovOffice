/**
 * Sidebar — kept for legacy compatibility.
 * CitizenLayout and AdminShell inline their own sidebar.
 * This component is no longer used in main routing but preserved.
 */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Search, Hash, History, Bell,
  HelpCircle, Landmark, Info, MessageSquare,
} from 'lucide-react';
import { Logo } from './Logo';
import { IndiaEmblem } from './IndiaEmblem';
import { ConnectionStatus } from './ConnectionStatus';
import { useDemoStore } from '../stores/demoStore';

export const Sidebar: React.FC = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { notifications, wsStatus } = useDemoStore();
  const unread = notifications.filter(n => !n.read).length;

  const navItems = [
    { id: 'Home',           label: 'Home',            icon: Home,        route: '/citizen/home'          },
    { id: 'FindServices',   label: 'Find Services',   icon: Search,      route: '/citizen/offices'       },
    { id: 'MyToken',        label: 'My Token',         icon: Hash,        route: '/citizen/token'         },
    { id: 'History',        label: 'History',          icon: History,     route: '/citizen/history'       },
    { id: 'Notifications',  label: 'Notifications',    icon: Bell,        route: '/citizen/notifications', badge: unread > 0 ? String(unread) : undefined },
    { id: 'HelpSupport',    label: 'Help & Support',   icon: HelpCircle,  route: '/citizen/home'          },
  ];
  const moreItems = [
    { id: 'GovOffices',     label: 'Government Offices', icon: Landmark,     route: '/citizen/offices' },
    { id: 'About',          label: 'About SkipTheLine',  icon: Info,         route: '/'               },
    { id: 'Feedback',       label: 'Feedback',            icon: MessageSquare,route: '/'               },
  ];

  const isActive = (route: string) =>
    location.pathname === route || location.pathname.startsWith(route + '/');

  return (
    <aside className="w-[260px] flex-shrink-0 flex flex-col justify-between rounded-[28px] liquid-glass-sidebar p-5 z-20 relative overflow-hidden"
      style={{ height: 'calc(100vh - 1.5rem)' }}>
      <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90 pointer-events-none" />

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="pt-1 pb-6 px-1 border-b border-slate-100/60">
          <Logo />
        </div>
        <nav className="mt-5 space-y-1">
          {navItems.map((item) => {
            const Icon   = item.icon;
            const active = isActive(item.route);
            return (
              <button key={item.id} onClick={() => navigate(item.route)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-all duration-200 group relative ${
                  active
                    ? 'bg-gradient-to-r from-red-500/15 via-red-500/8 to-transparent border border-red-200/50 text-red-600 font-bold shadow-[0_2px_10px_rgba(239,68,68,0.06)]'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'}`}>
                {active && <span className="absolute left-0 top-2 bottom-2 w-1 bg-red-600 rounded-r-full" />}
                <div className="flex items-center gap-3">
                  <Icon className={`w-[19px] h-[19px] transition-transform duration-200 group-hover:scale-105 ${active ? 'text-red-600 stroke-[2.4]' : 'text-slate-600 stroke-[1.9]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-red-600 text-white text-[11px] font-bold shadow-sm">{item.badge}</span>
                )}
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
                <button key={item.id} onClick={() => navigate(item.route)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-all duration-200 group text-slate-700 hover:text-slate-900 hover:bg-white/60">
                  <Icon className="w-[19px] h-[19px] text-slate-600 stroke-[1.8] group-hover:scale-105 transition-transform" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 pt-5 pb-1 border-t border-slate-200/50 flex flex-col items-center text-center">
        <div className="mb-3"><ConnectionStatus status={wsStatus} /></div>
        <IndiaEmblem className="w-20 h-28 mb-1.5" />
        <p className="text-[12px] font-semibold text-slate-600 leading-snug tracking-tight max-w-[185px]">
          Government Services for a Better Tomorrow.
        </p>
      </div>
    </aside>
  );
};
