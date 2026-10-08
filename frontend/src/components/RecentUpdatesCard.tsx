import React from 'react';
import { AlertTriangle, Info, FileText, Check } from 'lucide-react';
import type { AppNotification } from '../types';

interface RecentUpdatesCardProps {
  notifications?: AppNotification[];
}

const TYPE_CONFIG = {
  WARNING: { icon: AlertTriangle, bg: 'bg-red-600 text-white' },
  ERROR:   { icon: AlertTriangle, bg: 'bg-red-600 text-white' },
  INFO:    { icon: Info,          bg: 'bg-slate-600 text-white' },
  SUCCESS: { icon: Check,         bg: 'bg-emerald-500 text-white' },
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString();
}

export const RecentUpdatesCard: React.FC<RecentUpdatesCardProps> = ({ notifications }) => {
  const items = (notifications ?? []).slice(0, 4);

  // Fallback static data if no notifications
  const fallback = [
    { id: '1', type: 'WARNING' as const, title: 'Your estimated service time changed', message: "Counter 03 is temporarily unavailable. We've updated your estimated time.", timestamp: new Date(Date.now() - 12 * 60000).toISOString(), read: false },
    { id: '2', type: 'INFO' as const,    title: 'Counter 03 is temporarily unavailable', message: 'Services are being redirected to other counters.', timestamp: new Date(Date.now() - 20 * 60000).toISOString(), read: false },
    { id: '3', type: 'INFO' as const,    title: 'Your token A-184 is confirmed', message: 'You are in the queue for Passport Services.', timestamp: new Date(Date.now() - 35 * 60000).toISOString(), read: true },
    { id: '4', type: 'SUCCESS' as const, title: 'Token generated', message: 'Your token A-184 has been successfully created.', timestamp: new Date(Date.now() - 36 * 60000).toISOString(), read: true },
  ];

  const display = items.length > 0 ? items : fallback;

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-[14.5px] font-bold text-slate-900">Recent Updates</h3>
        <button className="text-[12px] font-semibold text-red-600 hover:text-red-700 transition-colors">View All</button>
      </div>
      <div className="relative mt-2">
        <div className="absolute top-3 bottom-5 left-3 w-[1.5px] bg-slate-200" />
        <div className="space-y-4">
          {display.map((item) => {
            const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.INFO;
            const Icon = cfg.icon;
            return (
              <div key={item.id} className="relative flex items-start gap-3">
                <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${cfg.bg}`}>
                  <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div className="flex-1 -mt-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-bold text-slate-900 leading-snug">{item.title}</span>
                    <span className="text-[11.5px] font-medium text-slate-400 whitespace-nowrap ml-2">{timeAgo(item.timestamp)}</span>
                  </div>
                  <p className="text-[11.5px] text-slate-500 leading-snug mt-0.5">{item.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
