import { AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { MOCK_FORECAST } from '../../mock/data';

export default function OfficeAdminForecastPage() {
  const forecast = MOCK_FORECAST;
  const ttStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">AI Congestion Forecast</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Rajkot District Office · Forecast for today</p>
      </div>

      {/* Alert banner */}
      <div className="flex items-start gap-4 px-5 py-4 rounded-2xl bg-amber-50 border border-amber-300/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200/80 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
        </div>
        <div>
          <div className="text-[14px] font-black text-amber-900">Congestion predicted: {forecast.congestionWindow}</div>
          <div className="text-[12.5px] text-amber-700 mt-0.5">Expected queue size: <strong>{forecast.expectedRange}</strong> tokens · Peak at <strong>{forecast.peakHour}</strong></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main chart */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[14.5px] font-bold text-slate-900">Hourly Queue Forecast</h3>
              <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400 font-medium">
                <div className="w-4 h-4 rounded flex items-center justify-center bg-slate-100">
                  <span className="text-[8px] font-black">AI</span>
                </div>
                Powered by {forecast.officeId ? 'queue-xgb-v1' : 'AI model'}
              </div>
            </div>
            <p className="text-[12px] text-slate-400 mb-4">Expected number of tokens in queue per hour. Red band = predicted congestion window.</p>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={forecast.hourlyForecast} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#e11d48" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="fBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#e9a3a3" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#e9a3a3" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={ttStyle} formatter={(v: unknown, n: unknown) => [`${v as number} tokens`, n as string]} />
                <Legend wrapperStyle={{ fontSize: 11, marginTop: 8 }} />
                <ReferenceLine x="2 PM" stroke="#e11d48" strokeDasharray="4 3" label={{ value: 'Peak start', fontSize: 10, fill: '#e11d48' }} />
                <Area type="monotone" dataKey="upper"    name="Upper bound" stroke="none" fill="url(#fBand)" legendType="none" />
                <Area type="monotone" dataKey="expected" name="Expected"    stroke="#e11d48" strokeWidth={2.5} fill="url(#fGrad)" />
                <Area type="monotone" dataKey="lower"    name="Lower bound" stroke="none" fill="none" legendType="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Hourly table */}
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <h3 className="text-[14.5px] font-bold text-slate-900 mb-4">Hour-by-Hour Breakdown</h3>
            <div className="grid grid-cols-12 text-[11.5px] font-semibold text-slate-400 uppercase tracking-wide px-2 py-2 border-b border-slate-100">
              <div className="col-span-2">Hour</div>
              <div className="col-span-3 text-right">Expected</div>
              <div className="col-span-3 text-right">Range</div>
              <div className="col-span-4 text-right">Status</div>
            </div>
            <div className="divide-y divide-slate-50">
              {forecast.hourlyForecast.map(h => (
                <div key={h.hour} className={`grid grid-cols-12 items-center px-2 py-2.5 ${h.isCongested ? 'bg-red-50/30' : ''}`}>
                  <div className="col-span-2 font-bold text-[13px] text-slate-800">{h.hour}</div>
                  <div className="col-span-3 text-right font-black text-[14px] text-slate-900">{h.expected}</div>
                  <div className="col-span-3 text-right text-[12px] text-slate-400">{h.lower}–{h.upper}</div>
                  <div className="col-span-4 flex justify-end">
                    {h.isCongested
                      ? <span className="px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200/80 text-red-600 text-[11px] font-bold">High demand</span>
                      : <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-600 text-[11px] font-bold">Normal</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Reasons */}
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <h3 className="text-[14.5px] font-bold text-slate-900 mb-3">Forecast Reasons</h3>
            <ul className="space-y-2.5">
              {forecast.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-amber-50 border border-amber-200/80 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-black text-amber-600">{i + 1}</span>
                  </div>
                  <span className="text-[12.5px] text-slate-700">{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendation */}
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="text-[14.5px] font-bold text-slate-900">Recommendation</h3>
            </div>
            <p className="text-[13px] text-slate-700 leading-relaxed">{forecast.recommendation}</p>
          </div>

          {/* AI disclaimer */}
          <div className="px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11.5px] text-slate-500 leading-snug">AI forecasts are probabilistic estimates based on historical patterns. Human judgment should guide operational decisions.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
