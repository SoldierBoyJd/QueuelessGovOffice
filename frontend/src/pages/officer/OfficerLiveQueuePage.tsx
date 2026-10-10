import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, Loader2, Circle, Users, Clock, Hash, ArrowRight } from 'lucide-react';
import { useLiveStore } from '../../stores/liveStore';

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
  COMPLETED: { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />, label: 'Completed', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200/60' },
  SERVING:   { icon: <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />, label: 'Serving', cls: 'text-blue-600 bg-blue-50 border-blue-200/60' },
  WAITING:   { icon: <Circle className="w-3.5 h-3.5 text-slate-400" />, label: 'Waiting', cls: 'text-slate-500 bg-slate-50 border-slate-200/60' },
  HOLD:      { icon: <Circle className="w-3.5 h-3.5 text-amber-400" />, label: 'On Hold', cls: 'text-amber-600 bg-amber-50 border-amber-200/60' },
  NO_SHOW:   { icon: <Circle className="w-3.5 h-3.5 text-red-400" />, label: 'No Show', cls: 'text-red-600 bg-red-50 border-red-200/60' },
  CALLED:    { icon: <ArrowRight className="w-3.5 h-3.5 text-purple-500" />, label: 'Called', cls: 'text-purple-600 bg-purple-50 border-purple-200/60' },
};

export default function OfficerLiveQueuePage() {
  const navigate = useNavigate();
  const { queue } = useLiveStore();

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => navigate('/officer/dashboard')}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-900 transition-colors w-fit">
        <ChevronLeft className="w-4 h-4" /> Dashboard
      </button>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Waiting',   value: queue.totalWaiting,  icon: <Users className="w-4 h-4" />,        color: 'text-amber-600',   bg: 'bg-amber-50'   },
          { label: 'Serving',   value: queue.totalServing,   icon: <Loader2 className="w-4 h-4" />,      color: 'text-blue-600',    bg: 'bg-blue-50'    },
          { label: 'Completed', value: queue.totalCompleted, icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'No-show',   value: queue.totalNoShow,    icon: <Hash className="w-4 h-4" />,         color: 'text-red-600',     bg: 'bg-red-50'     },
        ].map(m => (
          <div key={m.label} className="bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-4">
            <div className={`w-8 h-8 rounded-xl ${m.bg} flex items-center justify-center ${m.color} mb-2`}>{m.icon}</div>
            <div className="text-[24px] font-black text-slate-900 leading-none">{m.value}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Queue table */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-[14.5px] font-bold text-slate-900">Live Queue — {queue.serviceName}</h3>
          <div className="flex items-center gap-1.5 text-[12px] text-slate-400 font-medium">
            <Clock className="w-3.5 h-3.5" />
            {new Date(queue.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </div>
        </div>

        {/* Desktop table (md+) */}
        <div className="hidden md:block overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-12 min-w-[560px] text-[11px] font-bold text-slate-400 uppercase tracking-wide px-2 py-2 border-b border-slate-100">
              <div className="col-span-2">Token</div>
              <div className="col-span-3">Citizen</div>
              <div className="col-span-3">Service</div>
              <div className="col-span-2">Time</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            <div className="divide-y divide-slate-50 mt-1">
              {queue.tokens.map(t => {
                const s = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.WAITING;
                return (
                  <div key={t.tokenId} className={`grid grid-cols-12 min-w-[560px] items-center px-2 py-2.5 rounded-lg hover:bg-slate-50/60 transition-colors ${t.isCurrentUser ? 'bg-red-50/40' : ''}`}>
                    <div className={`col-span-2 font-black text-[13px] ${t.isCurrentUser ? 'text-red-600' : 'text-slate-900'}`}>{t.displayNumber}</div>
                    <div className="col-span-3 text-[12px] font-medium text-slate-700 truncate">{t.citizenName ?? '—'}</div>
                    <div className="col-span-3 text-[11.5px] text-slate-500 truncate">{t.serviceName ?? queue.serviceName}</div>
                    <div className="col-span-2 text-[12px] font-semibold text-slate-700">{t.estimatedTime}</div>
                    <div className="col-span-2 flex justify-end">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-bold ${s.cls}`}>{s.icon}{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile card list (< md) */}
        <div className="md:hidden space-y-2">
          {queue.tokens.map(t => {
            const s = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.WAITING;
            return (
              <div key={t.tokenId} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${t.isCurrentUser ? 'bg-red-50/60 border-red-200/60' : 'bg-slate-50/50 border-slate-100'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-[15px] font-black flex-shrink-0 ${t.isCurrentUser ? 'text-red-600' : 'text-slate-900'}`}>{t.displayNumber}</span>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-slate-800 truncate">{t.citizenName ?? '—'}</div>
                    <div className="text-[11px] text-slate-400 truncate">{t.estimatedTime}</div>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-bold flex-shrink-0 ml-2 ${s.cls}`}>{s.icon}{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
