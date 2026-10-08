import React, { useState } from 'react';
import {
  Home,
  Search,
  Hash,
  History,
  Bell,
  HelpCircle,
  Landmark,
  Info,
  MessageSquare
} from 'lucide-react';
import { Logo } from './Logo';
import { IndiaEmblem } from './IndiaEmblem';

interface SidebarProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab = 'Home', onSelectTab }) => {
  const [activeTab, setActiveTab] = useState(currentTab);

  const handleSelect = (tab: string) => {
    setActiveTab(tab);
    onSelectTab?.(tab);
  };

  const navItems = [
    { id: 'Home', label: 'Home', icon: Home, active: activeTab === 'Home' },
    { id: 'Find Services', label: 'Find Services', icon: Search, active: activeTab === 'Find Services' },
    { id: 'My Token', label: 'My Token', icon: Hash, active: activeTab === 'My Token' },
    { id: 'History', label: 'History', icon: History, active: activeTab === 'History' },
    { id: 'Notifications', label: 'Notifications', icon: Bell, badge: '3', active: activeTab === 'Notifications' },
    { id: 'Help & Support', label: 'Help & Support', icon: HelpCircle, active: activeTab === 'Help & Support' },
  ];

  const moreItems = [
    { id: 'Government Offices', label: 'Government Offices', icon: Landmark },
    { id: 'About SkipTheLine', label: 'About SkipTheLine', icon: Info },
    { id: 'Feedback', label: 'Feedback', icon: MessageSquare },
  ];

  return (
    <aside className="w-[260px] flex-shrink-0 flex flex-col justify-between rounded-[28px] liquid-glass-sidebar p-5 z-20 min-h-[920px] relative overflow-hidden">
      {/* Specular Edge Highlight */}
      <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90 pointer-events-none" />
      <div>
        {/* Brand Logo */}
        <div className="pt-1 pb-6 px-1 border-b border-slate-100/60">
          <Logo />
        </div>

        {/* Main Navigation */}
        <nav className="mt-5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.active;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-red-500/15 via-red-500/8 to-transparent border border-red-200/50 text-red-600 font-bold shadow-[0_2px_10px_rgba(239,68,68,0.06)]'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-red-600 rounded-r-full" />
                )}

                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-[19px] h-[19px] transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? 'text-red-600 stroke-[2.4]' : 'text-slate-600 stroke-[1.9]'
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

        {/* 'More' Section */}
        <div className="mt-7">
          <div className="px-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            More
          </div>
          <div className="space-y-1">
            {moreItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-all duration-200 group text-slate-700 hover:text-slate-900 hover:bg-white/60 ${
                    activeTab === item.id ? 'bg-red-50/70 text-red-600 font-bold' : ''
                  }`}
                >
                  <Icon className="w-[19px] h-[19px] text-slate-600 stroke-[1.8] group-hover:scale-105 transition-transform" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom National Emblem & Slogan */}
      <div className="pt-5 pb-1 border-t border-slate-200/50 flex flex-col items-center text-center">
        <IndiaEmblem className="w-20 h-28 mb-1.5" />
        <p className="text-[12px] font-semibold text-slate-600 leading-snug tracking-tight max-w-[185px]">
          Government Services for a Better Tomorrow.
        </p>
      </div>
    </aside>
  );
};
