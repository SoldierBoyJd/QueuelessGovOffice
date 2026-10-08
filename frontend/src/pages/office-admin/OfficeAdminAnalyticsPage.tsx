import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MOCK_QUEUE_CHART_DATA } from '../../mock/data';

const SERVICE_TIME_DATA = [
  { hour: '9 AM',  avg: 7.2 }, { hour: '10 AM', avg: 8.4 }, { hour: '11 AM', avg: 9.1 },
  { hour: '12 PM', avg: 7.8 }, { hour: '1 PM',  avg: 8.9 }, { hour: '2 PM',  avg: 10.2 },
  { hour: '3 PM',  avg: 11.4 }, { hour: '4 PM', avg: 9.7 }, { hour: '5 PM',  avg: 8.1 },
];

const THROUGHPUT_DATA = [
  { day: 'Mon', completed: 94, noShow: 8 }, { day: 'Tue', completed: 82, noShow: 6 },
  { day: 'Wed', completed: 108, noShow: 5 }, { day: 'Thu', completed: 97, noShow: 9 },
  { day: 'Fri', completed: 115, noShow: 7 }, { day: 'Sat', completed: 72, noShow: 4 },
];

const COUNTER_UTIL = [
  { name: 'Counter 01', util: 91 }, { name: 'Counter 02', util: 87 },
  { name: 'Counter 03', util: 52 }, { name: 'Counter 04', util: 94 },
];

const ttStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 };

export default function OfficeAdminAnalyticsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Analytics</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Rajkot District Office · Today, {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tokens issued',   value: '127', delta: '+12%', up: true  },
          { label: 'Avg wait (min)',  value: '27',  delta: '-4%',  up: false },
          { label: 'Avg service (m)', value: '8.9', delta: '+0.4', up: false },
          { label: 'No-show rate',    value: '4.7%',delta: '-1.1%',up: false },
        ].map(m => (
          <div key={m.label} className="bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className="text-[11.5px] text-slate-400 font-semibold uppercase tracking-wide mb-1">{m.label}</div>
            <div className="text-[28px] font-black text-slate-900 tracking-tight">{m.value}</div>
            <div className={`text-[12px] font-bold mt-1 ${m.up ? 'text-emerald-600' : 'text-red-500'}`}>{m.delta} vs yesterday</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Queue volume */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <h3 className="text-[14.5px] font-bold text-slate-900 mb-1">Queue Volume</h3>
          <p className="text-[12px] text-slate-400 mb-4">People in queue per interval</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MOCK_QUEUE_CHART_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
              <Area type="monotone" dataKey="count" stroke="#e11d48" strokeWidth={2.2} fill="url(#g1)" name="In queue" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Avg service time */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <h3 className="text-[14.5px] font-bold text-slate-900 mb-1">Avg Service Time</h3>
          <p className="text-[12px] text-slate-400 mb-4">Minutes per service per hour</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={SERVICE_TIME_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} domain={[0, 14]} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="avg" name="Avg min" fill="#e11d48" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly throughput */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <h3 className="text-[14.5px] font-bold text-slate-900 mb-1">Weekly Throughput</h3>
          <p className="text-[12px] text-slate-400 mb-4">Tokens completed vs no-show</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={THROUGHPUT_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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

        {/* Counter utilisation */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <h3 className="text-[14.5px] font-bold text-slate-900 mb-1">Counter Utilisation</h3>
          <p className="text-[12px] text-slate-400 mb-5">% of time actively serving</p>
          <div className="space-y-3.5">
            {COUNTER_UTIL.map(c => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold text-slate-700">{c.name}</span>
                  <span className={`text-[13px] font-black ${c.util >= 80 ? 'text-emerald-600' : c.util >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{c.util}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${c.util >= 80 ? 'bg-emerald-500' : c.util >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${c.util}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
