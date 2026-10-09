import { useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import { MOCK_OFFICE_SUMMARIES } from '../../mock/data';
import type { CongestionLevel } from '../../types';

const CONG_STYLE: Record<CongestionLevel, string> = {
  NORMAL: 'bg-emerald-50 border-emerald-200/80 text-emerald-700',
  BUSY:   'bg-amber-50 border-amber-200/80 text-amber-700',
  HIGH:   'bg-red-50 border-red-200/80 text-red-700',
};

export default function CentralOfficesPage() {
  const [query, setQuery] = useState('');
  const [filterCong, setFilterCong] = useState<CongestionLevel | 'ALL'>('ALL');

  const filtered = MOCK_OFFICE_SUMMARIES.filter(o => {
    const q = query.toLowerCase();
    const matchQ = !q || o.name.toLowerCase().includes(q) || o.city.toLowerCase().includes(q) || o.state.toLowerCase().includes(q);
    const matchC = filterCong === 'ALL' || o.congestion === filterCong;
    return matchQ && matchC;
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Office Directory</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">All monitored government offices</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="liquid-glass-search rounded-xl px-3.5 py-2 flex items-center gap-2.5 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search offices, cities, states…"
            className="w-full bg-transparent text-[13px] text-slate-800 placeholder-slate-400 outline-none font-medium" />
        </div>
        <div className="flex gap-2">
          {(['ALL','NORMAL','BUSY','HIGH'] as const).map(f => (
            <button key={f} onClick={() => setFilterCong(f)}
              className={`px-3.5 py-2 rounded-xl border text-[12px] font-bold transition-all ${filterCong === f ? 'bg-red-600 border-red-600 text-white shadow-[0_2px_8px_rgba(220,38,38,0.2)]' : 'border-slate-200/80 bg-white/90 text-slate-600 hover:bg-slate-50'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[12.5px] text-slate-400 -mt-2">{filtered.length} offices</p>

      {/* Table */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-slate-100 text-[11.5px] font-semibold text-slate-400 uppercase tracking-wide">
          <div className="col-span-4">Office</div>
          <div className="col-span-2 text-right">Waiting</div>
          <div className="col-span-2 text-right">Avg Wait</div>
          <div className="col-span-2 text-right">Counters Active</div>
          <div className="col-span-2 text-right">Congestion</div>
        </div>
        <div className="divide-y divide-slate-50">
          {filtered.map(o => (
            <div key={o.id} className="grid grid-cols-12 items-center px-5 py-3.5 hover:bg-slate-50/50 transition-colors cursor-pointer group">
              <div className="col-span-4 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-slate-900 group-hover:text-red-600 transition-colors">{o.name}</div>
                  <div className="text-[11.5px] text-slate-400">{o.city}, {o.state}</div>
                </div>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-[15px] font-black text-slate-900">{o.waiting}</span>
              </div>
              <div className="col-span-2 text-right text-[13px] font-semibold text-slate-600">
                {o.avgWait > 0 ? `${o.avgWait} min` : '—'}
              </div>
              <div className="col-span-2 text-right text-[13px] font-semibold text-slate-600">
                {o.activeCounters}
              </div>
              <div className="col-span-2 flex justify-end">
                <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${CONG_STYLE[o.congestion]}`}>
                  {o.congestion}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px] text-slate-400">No offices match your filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
