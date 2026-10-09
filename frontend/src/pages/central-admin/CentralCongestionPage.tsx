import { AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MOCK_OFFICE_SUMMARIES, MOCK_REGION_SUMMARIES } from '../../mock/data';
import type { CongestionLevel } from '../../types';

const CONG_COLOR: Record<CongestionLevel, string> = {
  NORMAL: '#2f7d57',
  BUSY:   '#b7791f',
  HIGH:   '#c62828',
};
const CONG_STYLE: Record<CongestionLevel, { pill: string; label: string }> = {
  NORMAL: { pill: 'bg-emerald-50 border-emerald-200/80 text-emerald-700', label: 'Normal' },
  BUSY:   { pill: 'bg-amber-50 border-amber-200/80 text-amber-700',       label: 'Busy'   },
  HIGH:   { pill: 'bg-red-50 border-red-200/80 text-red-700',             label: 'High'   },
};

const barData = MOCK_REGION_SUMMARIES.map(r => ({
  name: r.name.length > 10 ? r.name.slice(0, 10) + '…' : r.name,
  waiting: r.totalWaiting,
  congestion: r.congestionLevel,
}));

const ttStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 };

export default function CentralCongestionPage() {
  const highOffices  = MOCK_OFFICE_SUMMARIES.filter(o => o.congestion === 'HIGH');
  const busyOffices  = MOCK_OFFICE_SUMMARIES.filter(o => o.congestion === 'BUSY');
  const totalHigh    = MOCK_REGION_SUMMARIES.reduce((a, r) => a + r.highCongestionCount, 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Congestion Intelligence</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Real-time pressure across government offices · <span className="text-amber-600 font-semibold">DEMO DATA</span></p>
      </div>

      {/* Alert banner */}
      <div className="flex items-start gap-4 px-5 py-4 rounded-2xl bg-red-50 border border-red-200/60">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-[14px] font-black text-red-900">{totalHigh} offices reporting high congestion</div>
          <div className="text-[12.5px] text-red-700 mt-0.5">Immediate attention recommended for offices with sustained high demand.</div>
        </div>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-4">
        {([['HIGH', highOffices.length], ['BUSY', busyOffices.length], ['NORMAL', MOCK_OFFICE_SUMMARIES.filter(o => o.congestion === 'NORMAL').length]] as [CongestionLevel, number][]).map(([c, n]) => (
          <div key={c} className={`rounded-[20px] border p-5 ${CONG_STYLE[c].pill}`}>
            <div className="text-[28px] font-black tracking-tight">{n}</div>
            <div className="text-[12px] font-bold uppercase tracking-wide mt-1">{CONG_STYLE[c].label}</div>
            <div className="text-[11.5px] mt-0.5 opacity-70">offices</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bar chart */}
        <div className="lg:col-span-7 bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <h3 className="text-[14.5px] font-bold text-slate-900 mb-1">Waiting by State</h3>
          <p className="text-[12px] text-slate-400 mb-4">Total citizens waiting per state (demo sample)</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={ttStyle} formatter={(v: unknown) => [(v as number).toLocaleString(), 'Waiting']} />
              <Bar dataKey="waiting" radius={[5, 5, 0, 0]}>
                {barData.map((d, i) => (
                  <Cell key={i} fill={CONG_COLOR[d.congestion as CongestionLevel]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 justify-center">
            {(['HIGH','BUSY','NORMAL'] as CongestionLevel[]).map(c => (
              <div key={c} className="flex items-center gap-1.5 text-[11.5px] text-slate-500 font-medium">
                <span className="w-3 h-3 rounded-sm" style={{ background: CONG_COLOR[c] }} />
                {CONG_STYLE[c].label}
              </div>
            ))}
          </div>
        </div>

        {/* High congestion offices */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h3 className="text-[14.5px] font-bold text-slate-900">High Congestion Offices</h3>
            </div>
            <div className="space-y-2">
              {highOffices.map(o => (
                <div key={o.id} className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-red-50/50 border border-red-100/80">
                  <div>
                    <div className="text-[13px] font-bold text-red-900">{o.name}</div>
                    <div className="text-[11.5px] text-red-500 mt-0.5">{o.city} · {o.waiting} waiting · {o.avgWait}m avg</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[18px] font-black text-red-700">{o.waiting}</div>
                    <div className="text-[10.5px] text-red-400">waiting</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <h3 className="text-[14.5px] font-bold text-slate-900">Busy Offices</h3>
            </div>
            <div className="space-y-2">
              {busyOffices.map(o => (
                <div key={o.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-amber-50/40 transition-colors">
                  <div>
                    <div className="text-[13px] font-bold text-amber-900">{o.name}</div>
                    <div className="text-[11.5px] text-amber-500">{o.city} · {o.waiting} waiting</div>
                  </div>
                  <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">BUSY</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
