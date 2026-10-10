import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCentralData } from '../../hooks/useCentralData';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { parseApiError } from '../../services/api/client';

const ttStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 };

export default function CentralAnalyticsPage() {
  const { regions, overview, isLoading, error, refetch } = useCentralData();
  const regionalData = regions.map(r => ({
    name: r.name,
    waiting: r.totalWaiting,
    avgWait: r.avgWaitMinutes,
    offices: r.officeCount,
  }));

  if (isLoading) return <LoadingState message="Loading network data…" />;
  if (error) return <ErrorState message={parseApiError(error).message} onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">National Analytics</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          Aggregate service performance across all offices
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          { label: 'Completed (24h)',   value: (overview?.completedLast24h ?? 0).toLocaleString() },
          { label: 'Avg Wait (24h)',    value: overview?.avgWaitMinutes != null ? `${overview.avgWaitMinutes} min` : '—' },
          { label: 'Active Counters',   value: `${overview?.activeCounters ?? 0}/${overview?.totalCounters ?? 0}` },
          { label: 'Offices',           value: String(overview?.officeCount ?? 0) },
        ].map(m => (
          <div key={m.label} className="bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className="text-[11.5px] text-slate-400 font-semibold uppercase tracking-wide mb-1">{m.label}</div>
            <div className="text-[26px] font-black text-slate-900 tracking-tight">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Regional comparison */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <h3 className="text-[14.5px] font-bold text-slate-900 mb-1">Regional Waiting Comparison</h3>
          <p className="text-[12px] text-slate-400 mb-4">Citizens waiting by state</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={regionalData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={ttStyle} formatter={(v: unknown) => [(v as number).toLocaleString(), 'Waiting']} />
              <Bar dataKey="waiting" name="Waiting" fill="#e11d48" radius={[0, 4, 4, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Average wait by state */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <h3 className="text-[14.5px] font-bold text-slate-900 mb-1">Average Wait by State</h3>
          <p className="text-[12px] text-slate-400 mb-4">Minutes, from tokens served in the last 24 hours</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={regionalData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={ttStyle} formatter={(v: unknown) => [`${v as number} min`, 'Avg wait']} />
              <Bar dataKey="avgWait" name="Avg wait" fill="#2f7d57" radius={[0, 4, 4, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
