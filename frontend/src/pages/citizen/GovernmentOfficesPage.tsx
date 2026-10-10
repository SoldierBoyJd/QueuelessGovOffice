import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Clock, Users, ChevronRight, Wifi, WifiOff, Building2 } from 'lucide-react';
import { MOCK_OFFICES } from '../../mock/data';
import type { CongestionLevel } from '../../types';

const CONG: Record<CongestionLevel, { label: string; dot: string; text: string; bg: string }> = {
  NORMAL: { label: 'Normal',      dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200/60' },
  BUSY:   { label: 'Busy',        dot: 'bg-amber-500',   text: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200/60'   },
  HIGH:   { label: 'High Demand', dot: 'bg-red-500',     text: 'text-red-600',     bg: 'bg-red-50 border-red-200/60'       },
};

export default function GovernmentOfficesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('All');

  const states = ['All', ...Array.from(new Set(MOCK_OFFICES.map(o => o.state)))];

  const filtered = MOCK_OFFICES.filter(o => {
    const q = query.toLowerCase();
    const matchQ = !q || o.name.toLowerCase().includes(q) || o.city.toLowerCase().includes(q) || o.state.toLowerCase().includes(q);
    const matchS = stateFilter === 'All' || o.state === stateFilter;
    return matchQ && matchS;
  });

  return (
    <div className="flex flex-col gap-5 mt-1">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-slate-400" />
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Directory</span>
          </div>
          <h1 className="text-[24px] font-black text-slate-900 tracking-tight">Government Offices</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Find offices near you and check live queue conditions</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="liquid-glass-search rounded-2xl px-4 py-2.5 flex items-center gap-2.5 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search offices, cities, districts…"
            className="w-full bg-transparent text-[13px] text-slate-800 placeholder-slate-400 outline-none font-medium" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {states.map(s => (
            <button key={s} onClick={() => setStateFilter(s)}
              className={`px-3.5 py-2 rounded-xl border text-[12px] font-bold transition-all ${stateFilter === s ? 'bg-red-600 border-red-600 text-white shadow-[0_2px_8px_rgba(220,38,38,0.2)]' : 'border-slate-200/80 bg-white/90 text-slate-600 hover:bg-slate-50'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[12.5px] text-slate-400 -mt-2">{filtered.length} office{filtered.length !== 1 ? 's' : ''} found</p>

      {/* Office Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(office => {
          const cong = CONG[office.congestion];
          return (
            <div key={office.id}
              className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all cursor-pointer group"
              onClick={() => navigate(`/citizen/offices/${office.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-[14.5px] font-bold text-slate-900 group-hover:text-red-600 transition-colors leading-snug">{office.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[12px] text-slate-500">{office.address}</span>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold flex-shrink-0 ml-2 ${cong.bg} ${cong.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cong.dot}`} />{cong.label}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-100">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5"><Users className="w-3.5 h-3.5" /></div>
                  <div className="text-[16px] font-black text-slate-900">{office.totalWaiting}</div>
                  <div className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wide">Waiting</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5"><Wifi className="w-3.5 h-3.5" /></div>
                  <div className="text-[16px] font-black text-slate-900">{office.activeCounters}/{office.totalCounters}</div>
                  <div className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wide">Counters</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5"><Clock className="w-3.5 h-3.5" /></div>
                  <div className="text-[16px] font-black text-slate-900">{office.isOpen ? `${office.avgWaitMinutes}m` : '—'}</div>
                  <div className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wide">Avg Wait</div>
                </div>
              </div>

              {/* Services */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {office.departments.flatMap(d => d.services).slice(0, 3).map(s => (
                  <span key={s.id} className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-full text-[11px] font-semibold text-slate-600">{s.name}</span>
                ))}
                {office.departments.flatMap(d => d.services).length > 3 && (
                  <span className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-full text-[11px] font-semibold text-slate-400">
                    +{office.departments.flatMap(d => d.services).length - 3} more
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {office.isOpen
                    ? <span className="flex items-center gap-1 text-[11.5px] font-semibold text-emerald-600"><Wifi className="w-3 h-3" />Open · closes {office.closeTime}</span>
                    : <span className="flex items-center gap-1 text-[11.5px] font-semibold text-slate-400"><WifiOff className="w-3 h-3" />Closed</span>}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/citizen/offices/${office.id}`); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-bold rounded-xl transition-colors shadow-[0_2px_8px_rgba(220,38,38,0.2)]">
                  Take Token <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-16 bg-white/95 rounded-[24px] border border-slate-100/90">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-[14px] font-bold text-slate-700">No offices found</p>
            <p className="text-[12.5px] text-slate-400 mt-1">Try a different search or clear the state filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
