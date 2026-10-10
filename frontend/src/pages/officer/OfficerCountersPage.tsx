import { useDemoStore } from '../../stores/demoStore';
import { CheckCircle2, TrendingUp } from 'lucide-react';

const STATUS_STYLE: Record<string, { dot: string; pill: string; label: string }> = {
  ACTIVE:  { dot: 'bg-emerald-500', pill: 'bg-emerald-50 border-emerald-200/80 text-emerald-700', label: 'Active'  },
  PAUSED:  { dot: 'bg-amber-500',   pill: 'bg-amber-50 border-amber-200/80 text-amber-700',       label: 'Paused'  },
  CLOSED:  { dot: 'bg-slate-400',   pill: 'bg-slate-50 border-slate-200/80 text-slate-500',       label: 'Closed'  },
  BREAK:   { dot: 'bg-blue-400',    pill: 'bg-blue-50 border-blue-200/80 text-blue-600',           label: 'Break'   },
};

export default function OfficerCountersPage() {
  const { counters } = useDemoStore();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Counter Overview</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          Rajkot District Office · {counters.filter(c => c.status === 'ACTIVE').length}/{counters.length} counters active
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['ACTIVE','PAUSED','CLOSED','BREAK'] as const).map(s => {
          const count = counters.filter(c => c.status === s).length;
          const st = STATUS_STYLE[s];
          return (
            <div key={s} className="bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-4 flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${st.dot}`} />
              <div>
                <div className="text-[22px] font-black text-slate-900">{count}</div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{st.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table (md+) */}
      <div className="hidden md:block bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">Counter</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">Officer</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">Serving</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wide">Served</th>
                <th className="px-5 py-3 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {counters.map(c => {
                const s = STATUS_STYLE[c.status] ?? STATUS_STYLE.CLOSED;
                const isMe = c.id === 'ctr-001';
                const avgMin = Math.floor((c.avgServiceSeconds ?? 0) / 60);
                const avgSec = (c.avgServiceSeconds ?? 0) % 60;
                return (
                  <tr key={c.id} className={`hover:bg-slate-50/50 transition-colors ${isMe ? 'bg-red-50/20' : ''}`}>
                    <td className="px-5 py-3.5">
                      <span className="font-black text-[13.5px] text-slate-900">{c.name}</span>
                      {isMe && <span className="ml-2 text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">YOU</span>}
                    </td>
                    <td className="px-3 py-3.5 text-[12.5px] font-medium text-slate-700">{c.officerName ?? 'Unassigned'}</td>
                    <td className="px-3 py-3.5">
                      {c.currentTokenDisplay
                        ? <div><div className="text-[13px] font-black text-slate-900">{c.currentTokenDisplay}</div><div className="text-[11px] text-slate-400">{c.currentCitizenName}</div></div>
                        : <span className="text-[12px] text-slate-400">{c.status === 'ACTIVE' ? 'Idle' : '—'}</span>}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <div className="text-[15px] font-black text-slate-900">{c.tokensServedToday}</div>
                      {c.avgServiceSeconds > 0 && <div className="text-[11px] text-slate-400">{avgMin}m {avgSec}s</div>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold inline-flex items-center gap-1 ${s.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {counters.map(c => {
          const s = STATUS_STYLE[c.status] ?? STATUS_STYLE.CLOSED;
          const isMe = c.id === 'ctr-001';
          return (
            <div key={c.id} className={`bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 ${isMe ? 'border-l-4 border-l-red-500' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-black text-[15px] text-slate-900">{c.name}</span>
                  {isMe && <span className="text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">YOU</span>}
                </div>
                <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold inline-flex items-center gap-1 ${s.pill}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div><span className="text-slate-400">Officer: </span><span className="font-semibold text-slate-700">{c.officerName ?? 'Unassigned'}</span></div>
                <div><span className="text-slate-400">Serving: </span><span className="font-semibold text-slate-700">{c.currentTokenDisplay ?? (c.status === 'ACTIVE' ? 'Idle' : '—')}</span></div>
                <div><span className="text-slate-400">Served: </span><span className="font-black text-slate-900">{c.tokensServedToday}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Throughput */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-slate-600" />
          <h3 className="text-[14.5px] font-bold text-slate-900">Today's Throughput</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {counters.filter(c => c.tokensServedToday > 0).map(c => (
            <div key={c.id} className="bg-slate-50/80 rounded-2xl p-3.5">
              <div className="text-[11.5px] text-slate-400 font-semibold mb-1">{c.name}</div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-[18px] font-black text-slate-900">{c.tokensServedToday}</span>
                <span className="text-[11px] text-slate-400">served</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
