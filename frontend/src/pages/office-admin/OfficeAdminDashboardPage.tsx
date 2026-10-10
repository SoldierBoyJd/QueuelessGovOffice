import { Users, MonitorCheck, CheckCircle2, UserX, Clock, Percent, AlertTriangle, TrendingUp } from 'lucide-react';
import { useDemoStore } from '../../stores/demoStore';
import { MOCK_FORECAST } from '../../mock/data';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { MOCK_QUEUE_CHART_DATA } from '../../mock/data';

export default function OfficeAdminDashboardPage() {
  const { queue, counters } = useDemoStore();
  const forecast = MOCK_FORECAST;

  const activeCounters = counters.filter(c => c.status === 'ACTIVE').length;
  const totalCounters  = counters.length;
  const utilPct = Math.round((activeCounters / totalCounters) * 100);
  const avgWait = 27;

  const STATUS_STYLE: Record<string, { dot: string; text: string; label: string }> = {
    ACTIVE:  { dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'Active'  },
    PAUSED:  { dot: 'bg-amber-500',   text: 'text-amber-600',   label: 'Paused'  },
    CLOSED:  { dot: 'bg-slate-400',   text: 'text-slate-500',   label: 'Closed'  },
    BREAK:   { dot: 'bg-blue-400',    text: 'text-blue-500',    label: 'Break'   },
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Office Dashboard</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Rajkot District Office · Live operational view</p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          { label: 'Waiting',     value: queue.totalWaiting,   icon: <Users className="w-4 h-4" />,       color: 'text-amber-600',   bg: 'bg-amber-50' },
          { label: 'Serving',     value: queue.totalServing,    icon: <MonitorCheck className="w-4 h-4" />,color: 'text-blue-600',    bg: 'bg-blue-50' },
          { label: 'Completed',   value: queue.totalCompleted,  icon: <CheckCircle2 className="w-4 h-4" />,color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'No-show',     value: queue.totalNoShow,     icon: <UserX className="w-4 h-4" />,       color: 'text-red-600',     bg: 'bg-red-50' },
        ].map(m => (
          <div key={m.label} className="bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className={`w-8 h-8 rounded-xl ${m.bg} flex items-center justify-center ${m.color} mb-3`}>{m.icon}</div>
            <div className="text-[28px] font-black text-slate-900 tracking-tight leading-none">{m.value}</div>
            <div className="text-[12px] text-slate-500 font-semibold mt-1.5 uppercase tracking-wide">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600"><Clock className="w-5 h-5" /></div>
          <div><div className="text-[11.5px] text-slate-400 font-semibold uppercase tracking-wide">Average wait</div><div className="text-[24px] font-black text-slate-900">{avgWait} <span className="text-[14px] font-semibold text-slate-500">min</span></div></div>
        </div>
        <div className="bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600"><Percent className="w-5 h-5" /></div>
          <div><div className="text-[11.5px] text-slate-400 font-semibold uppercase tracking-wide">Counter utilisation</div><div className="text-[24px] font-black text-slate-900">{utilPct}<span className="text-[14px] font-semibold text-slate-500">%</span></div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left col */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Live counters */}
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14.5px] font-bold text-slate-900">Live Counters</h3>
              <span className="text-[12px] text-slate-400">{activeCounters}/{totalCounters} active</span>
            </div>
            <div className="divide-y divide-slate-100">
              {counters.map(c => {
                const s = STATUS_STYLE[c.status] ?? STATUS_STYLE.CLOSED;
                return (
                  <div key={c.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                      <div>
                        <span className="text-[13.5px] font-bold text-slate-900">{c.name}</span>
                        {c.officerName && <span className="text-[12px] text-slate-400 ml-2">— {c.officerName}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {c.currentTokenDisplay
                          ? <><div className="text-[12px] text-slate-400">Serving</div><div className="text-[13.5px] font-black text-slate-900">{c.currentTokenDisplay}</div></>
                          : <div className="text-[12px] text-slate-400">{c.status === 'ACTIVE' ? 'Idle' : '—'}</div>}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
                        c.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-200/80 text-emerald-600' :
                        c.status === 'PAUSED' ? 'bg-amber-50 border-amber-200/80 text-amber-600' :
                        'bg-slate-50 border-slate-200/80 text-slate-500'}`}>
                        {s.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Queue chart */}
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <h3 className="text-[14.5px] font-bold text-slate-900 mb-1">Queue Volume Today</h3>
            <p className="text-[12px] text-slate-400 mb-4">People in queue over time</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={MOCK_QUEUE_CHART_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="qGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#e11d48" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }} />
                <ReferenceLine x="2:18 PM" stroke="#e11d48" strokeDasharray="4 4" label={{ value: 'NOW', fontSize: 10, fill: '#e11d48' }} />
                <Area type="monotone" dataKey="count" stroke="#e11d48" strokeWidth={2.5} fill="url(#qGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right col — AI forecast */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h3 className="text-[14.5px] font-bold text-slate-900">AI Forecast</h3>
            </div>
            <div className="mt-4 px-4 py-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 mb-4">
              <div className="text-[11.5px] font-bold text-amber-700 uppercase tracking-wide">Congestion predicted</div>
              <div className="text-[18px] font-black text-amber-900 mt-0.5">{forecast.congestionWindow}</div>
              <div className="text-[12.5px] text-amber-700 mt-0.5">Expected queue: <strong>{forecast.expectedRange}</strong></div>
            </div>

            <div className="mb-4">
              <div className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wide mb-2">Hourly forecast</div>
              <div className="space-y-1.5">
                {forecast.hourlyForecast.map(h => (
                  <div key={h.hour} className="flex items-center gap-3">
                    <span className="text-[11.5px] font-semibold text-slate-500 w-12 flex-shrink-0">{h.hour}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${h.isCongested ? 'bg-red-500' : 'bg-emerald-400'}`}
                        style={{ width: `${Math.min(100, (h.expected / 90) * 100)}%` }} />
                    </div>
                    <span className={`text-[11.5px] font-bold w-8 text-right ${h.isCongested ? 'text-red-600' : 'text-slate-600'}`}>{h.expected}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wide mb-2">Reasons</div>
              <ul className="space-y-1">
                {forecast.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] text-slate-600">
                    <span className="text-amber-500 mt-0.5">·</span>{r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-[11.5px] font-bold text-slate-600 uppercase tracking-wide">Recommendation</span>
              </div>
              <p className="text-[12.5px] text-slate-700">{forecast.recommendation}</p>
            </div>
          </div>

          {/* Quick queue table */}
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <h3 className="text-[14.5px] font-bold text-slate-900 mb-3">Recent Queue Activity</h3>
            <div className="space-y-1">
              {queue.tokens.slice(0, 6).map(t => (
                <div key={t.tokenId} className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="font-black text-[13px] text-slate-800">{t.displayNumber}</span>
                    <span className="text-[12px] text-slate-500">{t.citizenName}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border text-[10.5px] font-bold ${
                    t.status === 'COMPLETED' ? 'bg-emerald-50 border-emerald-200/60 text-emerald-600' :
                    t.status === 'SERVING'   ? 'bg-blue-50 border-blue-200/60 text-blue-600' :
                    t.status === 'WAITING'   ? 'bg-slate-50 border-slate-200/60 text-slate-500' :
                    'bg-amber-50 border-amber-200/60 text-amber-600'}`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
