import React, { useState } from 'react';
import { MapPin, Search, Bell, ChevronDown, Check } from 'lucide-react';

interface TopNavProps {
  onSearch?: (query: string) => void;
  userName?: string;
  userInitials?: string;
  onLogout?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onSearch, userName = 'Jainam Doshi', userInitials = 'JD', onLogout }) => {
  const [searchValue, setSearchValue] = useState('');
  const [selectedOffice, setSelectedOffice] = useState('Rajkot District Office');
  const [locationOpen, setLocationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const offices = [
    { name: 'Rajkot District Office', city: 'Rajkot, Gujarat' },
    { name: 'Ahmedabad RTO & Collectorate', city: 'Ahmedabad, Gujarat' },
    { name: 'Surat Municipal Corporation', city: 'Surat, Gujarat' },
    { name: 'Vadodara Civic Center', city: 'Vadodara, Gujarat' },
  ];

  return (
    <header className="w-full flex items-center justify-between gap-3 relative z-30 pt-1 pb-1">
      {/* 1. Location Selector Floating Pill */}
      <div className="relative">
        <button
          onClick={() => setLocationOpen(!locationOpen)}
          className="liquid-glass-pill rounded-full pl-2.5 pr-4 py-1.5 flex items-center gap-2.5 text-left group shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
        >
          <div className="w-7 h-7 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 text-red-600 group-hover:scale-105 transition-transform">
            <MapPin className="w-3.5 h-3.5 fill-red-600 stroke-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[12.5px] font-bold text-slate-800 leading-tight">
              {selectedOffice}
            </span>
            <span className="text-[10.5px] text-slate-400 font-medium leading-none mt-0.5">
              Rajkot, Gujarat
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1 group-hover:text-slate-600 transition-colors" />
        </button>

        {/* Location Dropdown Modal */}
        {locationOpen && (
          <div className="absolute top-full left-0 mt-2 w-72 liquid-glass-sidebar rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 shadow-2xl">
            <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Select Office Location
            </div>
            {offices.map((office) => (
              <button
                key={office.name}
                onClick={() => {
                  setSelectedOffice(office.name);
                  setLocationOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                  selectedOffice === office.name
                    ? 'bg-red-50/90 text-red-700 font-bold border border-red-200/60'
                    : 'text-slate-700 hover:bg-white/80'
                }`}
              >
                <div>
                  <div className="font-semibold">{office.name}</div>
                  <div className="text-[11px] text-slate-400">{office.city}</div>
                </div>
                {selectedOffice === office.name && (
                  <Check className="w-4 h-4 text-red-600" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Floating Search Bar Capsule */}
      <div className="flex-1 max-w-[460px] lg:max-w-[540px] mx-2">
        <div className="liquid-glass-search rounded-full px-4 py-2 flex items-center gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] group">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0 group-focus-within:text-red-500 transition-colors" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              onSearch?.(e.target.value);
            }}
            placeholder="Search for services, offices, or departments..."
            className="w-full bg-transparent text-[13px] text-slate-800 placeholder-slate-400 font-medium outline-none"
          />
          {/* Keyboard Shortcut Tag */}
          <div className="liquid-glass-pill rounded-md px-1.5 py-0.5 text-slate-500 text-[11px] font-bold flex items-center gap-0.5 select-none flex-shrink-0">
            <span className="text-[10px]">⌘</span>
            <span>K</span>
          </div>
        </div>
      </div>

      {/* 3. Floating Notification Bell & User Profile */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          className="relative liquid-glass-pill w-9 h-9 rounded-full flex items-center justify-center text-slate-600 shadow-[0_2px_8px_rgba(0,0,0,0.03)] group"
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-slate-600 group-hover:text-slate-900 group-hover:scale-105 transition-all" />
          {/* Red indicator dot */}
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
        </button>

        {/* User Profile Pill */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="liquid-glass-pill rounded-full pl-1.5 pr-3 py-1 flex items-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.03)] group"
          >
            <div className="w-7 h-7 rounded-full bg-slate-200/90 text-slate-700 font-black text-[11px] flex items-center justify-center tracking-tight shadow-inner">
              {userInitials}
            </div>
            <span className="text-[13px] font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
              {userName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 liquid-glass-sidebar rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 shadow-2xl">
              <div className="px-3 py-2 border-b border-white/60 mb-1">
                <p className="text-xs font-bold text-slate-800">Jainam Doshi</p>
                <p className="text-[11px] text-slate-400">jainam.doshi@gov.in</p>
              </div>
              <button
                onClick={() => setProfileOpen(false)}
                className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-white/80 rounded-xl transition-colors"
              >
                Profile Settings
              </button>
              <button
                onClick={() => setProfileOpen(false)}
                className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-white/80 rounded-xl transition-colors"
              >
                Saved Documents
              </button>
              <button
                onClick={() => { setProfileOpen(false); onLogout?.(); }}
                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50/80 rounded-xl font-semibold transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
