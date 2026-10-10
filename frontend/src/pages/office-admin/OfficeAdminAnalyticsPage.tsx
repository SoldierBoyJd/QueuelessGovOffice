import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api/analytics';
import { useMyOffice } from '../../hooks/useMyOffice';
import { useLiveStore } from '../../stores/liveStore';
import { LoadingState } from '../../components/ui/LoadingState';

const isoDay = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const ttStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 };

export default function OfficeAdminAnalyticsPage() {
  const { data: office } = useMyOffice();
  const counters = useLiveStore(st => st.counters);
  const { data: summary, isLoading } = useQuery({ queryKey: ['analytics', 'office'], queryFn: () => analyticsApi.officeSummary(), refetchInterval: 30_000 });
  const { data: movement = [] } = useQuery({ queryKey: ['analytics', 'movement'], queryFn: () => analyticsApi.queueMovement(), refetchInterval: 60_000 });
  const { data: week = [] } = useQuery({
    queryKey: ['analytics', 'week'],
    queryFn: async () => {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d;
      });
      return Promise.all(days.map(async d => {
        const r = await analyticsApi.officeSummary(undefined, isoDay(d));
        return { day: d.toLocaleDateString('en-IN', { weekday: 'short' }), completed: r.completed, noShow: r.noShow };
      }));
    },
    staleTime: 60_000,
  });
  const nowPoint = movement.find(p => p.isNow);
  const maxServed = Math.max(1, ...counters.map(c => c.tokensServedToday));

  if (isLoading) return <LoadingState />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Analytics</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">{office?.name ?? ''} · Today, {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          { label: 'Tokens issued',   value: summary ? String(summary.totalTokens) : '—' },
          { label: 'Avg wait (min)',  value: summary?.avgWaitMinutes != null ? String(summary.avgWaitMinutes) : '—' },
          { label: 'Avg service (m)', value: summary?.avgServiceMinutes != null ? String(summary.avgServiceMinutes) : '—' },
          { label: 'No-show rate',    value: summary?.noShowRate != null ? `${(summary.noShowRate * 100).toFixed(1)}%` : '—' },
        ].map(m => (
          <div key={m.label} className="bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className="text-[11.5px] text-slate-400 font-semibold uppercase tracking-wide mb-1">{m.label}</div>
            <div className="text-[28px] font-black text-slate-900 tracking-tight">{m.value}</div>
            <div className="text-[12px] font-medium mt-1 text-slate-400">Today</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Queue volume */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <h3 className="text-[14.5px] font-bold text-slate-900 mb-1">Queue Volume</h3>
          <p className="text-[12px] text-slate-400 mb-4">Tokens created and served per hour</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={movement} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#e11d48" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={ttStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {nowPoint && <ReferenceLine x={nowPoint.time} stroke="#e11d48" strokeDasharray="4 4" />}
              <Area type="monotone" dataKey="count" stroke="#e11d48" strokeWidth={2.2} fill="url(#g1)" name="Created" />
              <Area type="monotone" dataKey="served" stroke="#2f7d57" strokeWidth={2} fill="none" name="Served" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly throughput */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <h3 className="text-[14.5px] font-bold text-slate-900 mb-1">Last 7 Days</h3>
          <p className="text-[12px] text-slate-400 mb-4">Tokens completed vs no-show per day</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={week} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={ttStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="completed" name="Completed" fill="#2f7d57" radius={[4, 4, 0, 0]} />
              <Bar dataKey="noShow"    name="No-show"   fill="#e9a3a3" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Counter throughput */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <h3 className="text-[14.5px] font-bold text-slate-900 mb-1">Counter Throughput</h3>
          <p className="text-[12px] text-slate-400 mb-5">Tokens served today per counter</p>
          <div className="space-y-3.5">
            {counters.length === 0 && <p className="text-[12.5px] text-slate-400">No counters configured.</p>}
            {counters.map(c => (
              <div key={c.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold text-slate-700">{c.name} <span className="text-slate-400 font-medium">· {c.serviceName ?? 'All services'}</span></span>
                  <span className="text-[13px] font-black text-slate-900">{c.tokensServedToday}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all bg-emerald-500" style={{ width: `${(c.tokensServedToday / maxServed) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
