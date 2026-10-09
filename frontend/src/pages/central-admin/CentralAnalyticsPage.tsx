import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { MOCK_REGION_SUMMARIES } from '../../mock/data';

const WEEKLY = [
  { day: 'Mon', tokens: 8420, avgWait: 29 }, { day: 'Tue', tokens: 9180, avgWait: 31 },
  { day: 'Wed', tokens: 10240, avgWait: 35 }, { day: 'Thu', tokens: 9870, avgWait: 33 },
  { day: 'Fri', tokens: 11200, avgWait: 38 }, { day: 'Sat', tokens: 7300, avgWait: 24 },
];

const HOURLY = [
  { h: '8', v: 1200 }, { h: '9', v: 3400 }, { h: '10', v: 5800 }, { h: '11', v: 6200 },
  { h: '12', v: 4900 }, { h: '13', v: 5100 }, { h: '14', v: 7200 }, { h: '15', v: 8100 },
  { h: '16', v: 6400 }, { h: '17', v: 3200 }, { h: '18', v: 1100 },
];

const ttStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 };

export default function CentralAnalyticsPage() {
  const regionalData = MOCK_REGION_SUMMARIES.map(r => ({
    name: r.name,
    waiting: r.totalWaiting,
    avgWait: r.avgWaitMinutes,
    offices: r.officeCount,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">National Analytics</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          Aggregate service performance · <span className="text-amber-600 font-semibold">DEMO DATA</span>
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tokens Today',      value: '62,481', delta: '+8.2%',  up: true  },
          { label: 'Avg National Wait', value: '31 min', delta: '+2.4m',  up: false },
          { label: 'Offices Open',      value: '3,642',  delta: '75.5%',  up: true  },
          { label: 'Satisfaction (est)',value: '78%',    delta: '+1.2pp', up: true  },
        ].map(m => (
          <div key={m.label} className="bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className="text-[11.5px] text-slate-400 font-semibold uppercase tracking-wide mb-1">{m.label}</div>
            <div className="text-[26px] font-black text-slate-900 tracking-tight">{m.value}</div>
            <div className={`text-[12px] font-bold mt-1 ${m.up ? 'text-emerald-600' : 'text-red-500'}`}>{m.delta} vs last week</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Weekly tokens */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <h3 className="text-[14.5px] font-bold text-slate-900 mb-1">Weekly Token Volume</h3>
          <p className="text-[12px] text-slate-400 mb-4">National tokens issued per day</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={WEEKLY} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={ttStyle} formatter={(v: unknown) => [(v as number).toLocaleString(), 'Tokens']} />
              <Bar dataKey="tokens" name="Tokens" fill="#e11d48" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly distribution */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <h3 className="text-[14.5px] font-bold text-slate-900 mb-1">Hourly Demand Pattern</h3>
          <p className="text-[12px] text-slate-400 mb-4">Tokens issued by hour of day (national avg)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={HOURLY} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="h" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}h`} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={ttStyle} formatter={(v: unknown) => [(v as number).toLocaleString(), 'Tokens']} />
              <Bar dataKey="v" name="Tokens" fill="#8a8a8a" radius={[4, 4, 0, 0]} fillOpacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>

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

        {/* Wait time trend */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <h3 className="text-[14.5px] font-bold text-slate-900 mb-1">Avg Wait vs Token Volume</h3>
          <p className="text-[12px] text-slate-400 mb-4">Weekly correlation</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={WEEKLY} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={ttStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="left"  type="monotone" dataKey="tokens"  name="Tokens"   stroke="#e11d48" strokeWidth={2.2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="avgWait" name="Avg wait" stroke="#2f7d57" strokeWidth={2.2} dot={false} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
