import { AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react';
import { useLiveStore } from '../../stores/liveStore';
import { NoNotifications } from '../../components/ui/EmptyState';
import type { NotificationType } from '../../types';

const TYPE_CONFIG: Record<NotificationType, { icon: React.ComponentType<{ className?: string }>, bg: string, text: string, border: string }> = {
  WARNING: { icon: AlertTriangle, bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200/80' },
  ERROR:   { icon: XCircle,       bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200/80' },
  INFO:    { icon: Info,          bg: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200/80' },
  SUCCESS: { icon: CheckCircle2,  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/80' },
};

function timeAgo(ts: string) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useLiveStore();

  return (
    <div className="max-w-[700px] flex flex-col gap-5 mt-1">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-black text-slate-900 tracking-tight">Notifications</h2>
          <p className="text-[13px] text-slate-500 mt-0.5">{notifications.filter(n => !n.read).length} unread</p>
        </div>
        <button onClick={() => void markAllNotificationsRead()}
          className="text-[12.5px] font-semibold text-red-600 hover:text-red-700 transition-colors">
          Mark all read
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {notifications.length === 0 ? (
          <NoNotifications />
        ) : notifications.map(n => {
          const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.INFO;
          const Icon = cfg.icon;
          return (
            <div key={n.id} onClick={() => void markNotificationRead(n.id)}
              className={`flex items-start gap-4 px-5 py-4 rounded-2xl border cursor-pointer transition-all ${cfg.bg} ${cfg.border} ${!n.read ? 'shadow-[0_2px_12px_rgba(0,0,0,0.04)]' : 'opacity-70'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${n.type === 'WARNING' ? 'bg-amber-100' : n.type === 'SUCCESS' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                <Icon className={`w-4 h-4 ${cfg.text}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-[13px] font-bold ${cfg.text}`}>{n.title}</span>
                  <span className="text-[11.5px] text-slate-400 font-medium">{timeAgo(n.timestamp)}</span>
                </div>
                <p className="text-[12.5px] text-slate-600 mt-0.5">{n.message}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0 mt-1.5" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
