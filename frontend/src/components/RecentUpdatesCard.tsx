import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { AlertTriangle, Info, Check } from 'lucide-react';
import type { AppNotification } from '../types';

interface RecentUpdatesCardProps {
  notifications?: AppNotification[];
}

const TYPE_CONFIG = {
  WARNING: { icon: AlertTriangle, bg: 'bg-red-600 text-white'     },
  ERROR:   { icon: AlertTriangle, bg: 'bg-red-600 text-white'     },
  INFO:    { icon: Info,          bg: 'bg-slate-600 text-white'   },
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
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const items = (notifications ?? []).slice(0, 4);
  const display = items;

  const viewAllRoute = user?.role === 'CITIZEN' ? '/citizen/notifications' : null;

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-[14.5px] font-bold text-slate-900">Recent Updates</h3>
        {viewAllRoute && (
          <button
            onClick={() => navigate(viewAllRoute)}
            className="text-[12px] font-semibold text-red-600 hover:text-red-700 transition-colors"
          >
            View All
          </button>
        )}
      </div>
      {display.length === 0 && (
        <p className="text-[12px] text-slate-400 text-center py-4">No updates yet.</p>
      )}
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
