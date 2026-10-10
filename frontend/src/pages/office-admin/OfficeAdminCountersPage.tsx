import { Play, Pause, X, RotateCcw } from 'lucide-react';
import { useDemoStore } from '../../stores/demoStore';
import { useState } from 'react';
import { toast } from '../../components/ui/Toast';

export default function OfficeAdminCountersPage() {
  const { counters, pauseCounter, resumeCounter, closeCounter } = useDemoStore();
  const [loading, setLoading] = useState<string | null>(null);

  const doAction = async (key: string, fn: () => void, successMsg: string) => {
    setLoading(key);
    await new Promise(r => setTimeout(r, 500));
    fn();
    setLoading(null);
    toast.info(successMsg);
  };

  const STATUS_STYLE: Record<string, { dot: string; pill: string; label: string }> = {
    ACTIVE:  { dot: 'bg-emerald-500', pill: 'bg-emerald-50 border-emerald-200/80 text-emerald-600', label: 'Active'  },
    PAUSED:  { dot: 'bg-amber-500',   pill: 'bg-amber-50 border-amber-200/80 text-amber-600',       label: 'Paused'  },
    CLOSED:  { dot: 'bg-slate-400',   pill: 'bg-slate-50 border-slate-200/80 text-slate-500',       label: 'Closed'  },
    BREAK:   { dot: 'bg-blue-400',    pill: 'bg-blue-50 border-blue-200/80 text-blue-600',           label: 'Break'   },
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Counter Management</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Rajkot District Office · {counters.filter(c => c.status === 'ACTIVE').length}/{counters.length} counters active</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['ACTIVE','PAUSED','CLOSED','BREAK'] as const).map(s => {
          const count = counters.filter(c => c.status === s).length;
          const st = STATUS_STYLE[s];
          return (
            <div key={s} className="bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-4 flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${st.dot}`} />
              <div>
                <div className="text-[22px] font-black text-slate-900">{count}</div>
                <div className="text-[11.5px] font-semibold text-slate-400 uppercase tracking-wide">{st.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Counter cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {counters.map(c => {
          const s = STATUS_STYLE[c.status] ?? STATUS_STYLE.CLOSED;
          const avgMin = Math.floor((c.avgServiceSeconds ?? 0) / 60);
          const avgSec = (c.avgServiceSeconds ?? 0) % 60;
          return (
            <div key={c.id} className={`bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 ${c.status === 'ACTIVE' ? 'border-l-4 border-l-emerald-400' : c.status === 'PAUSED' ? 'border-l-4 border-l-amber-400' : ''}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-[15px] font-black text-slate-900">{c.name}</h3>
                  <p className="text-[12px] text-slate-400 mt-0.5">{c.officerName ?? 'Unassigned'}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full border text-[11.5px] font-bold ${s.pill}`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot} mr-1.5 align-middle`} />{s.label}
                </span>
              </div>

              {/* Current */}
              <div className="px-3.5 py-3 rounded-2xl bg-slate-50/80 border border-slate-100 mb-4">
                {c.currentTokenDisplay ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wide">Serving</div>
                      <div className="text-[20px] font-black text-slate-900">{c.currentTokenDisplay}</div>
                      <div className="text-[12px] text-slate-500">{c.currentCitizenName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wide">Service</div>
                      <div className="text-[12.5px] font-bold text-slate-700">{c.serviceName ?? '—'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <div className="text-[12.5px] text-slate-400 font-medium">{c.status === 'ACTIVE' ? 'Idle — no active token' : `Counter ${s.label.toLowerCase()}`}</div>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="text-center px-2 py-2 rounded-xl bg-slate-50/60">
                  <div className="text-[16px] font-black text-slate-900">{c.tokensServedToday}</div>
                  <div className="text-[10.5px] text-slate-400 font-semibold">Served today</div>
                </div>
                <div className="text-center px-2 py-2 rounded-xl bg-slate-50/60">
                  <div className="text-[16px] font-black text-slate-900">{c.avgServiceSeconds > 0 ? `${avgMin}m ${avgSec}s` : '—'}</div>
                  <div className="text-[10.5px] text-slate-400 font-semibold">Avg service</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {c.status === 'ACTIVE' && (
                  <button onClick={() => doAction(`p-${c.id}`, () => pauseCounter(c.id), `${c.name} paused — citizen ETAs updated`)} disabled={loading !== null}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-amber-200/80 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[12px] transition-colors disabled:opacity-50">
                    <Pause className="w-3.5 h-3.5" />{loading === `p-${c.id}` ? '…' : 'Pause'}
                  </button>
                )}
                {c.status === 'PAUSED' && (
                  <button onClick={() => doAction(`r-${c.id}`, () => resumeCounter(c.id), `${c.name} resumed — ETAs improved`)} disabled={loading !== null}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-emerald-200/80 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[12px] transition-colors disabled:opacity-50">
                    <Play className="w-3.5 h-3.5" />{loading === `r-${c.id}` ? '…' : 'Resume'}
                  </button>
                )}
                {c.status === 'CLOSED' && (
                  <button onClick={() => doAction(`o-${c.id}`, () => resumeCounter(c.id), `${c.name} opened`)} disabled={loading !== null}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[12px] transition-colors disabled:opacity-50">
                    <RotateCcw className="w-3.5 h-3.5" />{loading === `o-${c.id}` ? '…' : 'Open'}
                  </button>
                )}
                {c.status !== 'CLOSED' && (
                  <button onClick={() => doAction(`c-${c.id}`, () => closeCounter(c.id), `${c.name} closed`)} disabled={loading !== null}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-500 font-bold text-[12px] transition-colors disabled:opacity-50">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
