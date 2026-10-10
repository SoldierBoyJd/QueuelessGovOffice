import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Users, Clock, ChevronRight, Wifi, WifiOff } from 'lucide-react';
import type { CongestionLevel } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { officesApi } from '../../services/api/offices';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { parseApiError } from '../../services/api/client';

const CONGESTION: Record<CongestionLevel, { label: string; dot: string; text: string; bg: string }> = {
  NORMAL: { label: 'Normal',      dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200/60' },
  BUSY:   { label: 'Busy',        dot: 'bg-amber-500',   text: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200/60' },
  HIGH:   { label: 'High Demand', dot: 'bg-red-500',     text: 'text-red-600',     bg: 'bg-red-50 border-red-200/60' },
};

export default function FindServicesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { data: offices = [], isLoading, error, refetch } = useQuery({
    queryKey: ['offices', 'with-services'],
    queryFn: officesApi.listWithServices,
    refetchInterval: 30_000,
  });

  const filtered = offices.filter(o =>
    o.name.toLowerCase().includes(query.toLowerCase()) ||
    o.city.toLowerCase().includes(query.toLowerCase()) ||
    o.departments.some(d => d.services.some(s => s.name.toLowerCase().includes(query.toLowerCase())))
  );

  return (
    <div className="flex flex-col gap-5 mt-1">
      {/* Search bar */}
      <div className="liquid-glass-search rounded-2xl px-4 py-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search offices, services, or departments…"
          className="w-full bg-transparent text-[13.5px] text-slate-800 placeholder-slate-400 font-medium outline-none" />
      </div>

      {/* Header */}
      <div>
        <h2 className="text-[18px] font-black text-slate-900 tracking-tight">Find a Government Service</h2>
        <p className="text-[13px] text-slate-500 mt-0.5">{filtered.length} offices available · Showing live queue conditions</p>
      </div>

      {isLoading && <LoadingState message="Loading offices…" />}
      {error && <ErrorState message={parseApiError(error).message} onRetry={() => void refetch()} />}

      {/* Office Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(office => {
          const cong = CONGESTION[office.congestion];
          return (
            <div key={office.id}
              className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all cursor-pointer group"
              onClick={() => navigate(`/citizen/offices/${office.id}`)}>

              {/* Office header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-[14.5px] font-bold text-slate-900 group-hover:text-red-600 transition-colors">{office.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[12px] text-slate-500">{office.city}, {office.state}</span>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${cong.bg} ${cong.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cong.dot}`} />
                  {cong.label}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-100">
                {[
                  { label: 'Waiting', value: office.totalWaiting, icon: <Users className="w-3.5 h-3.5" /> },
                  { label: 'Counters', value: `${office.activeCounters}/${office.totalCounters}`, icon: <Wifi className="w-3.5 h-3.5" /> },
                  { label: 'Avg wait', value: office.isOpen ? `${office.avgWaitMinutes}m` : '—', icon: <Clock className="w-3.5 h-3.5" /> },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">{s.icon}
                      <span className="text-[10.5px] font-semibold uppercase tracking-wide">{s.label}</span>
                    </div>
                    <div className="text-[16px] font-black text-slate-900">{s.value}</div>
                  </div>
                ))}
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

              {/* CTA */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {office.isOpen
                    ? <span className="flex items-center gap-1 text-[11.5px] font-semibold text-emerald-600"><Wifi className="w-3 h-3" />Open now · closes {office.closeTime}</span>
                    : <span className="flex items-center gap-1 text-[11.5px] font-semibold text-slate-400"><WifiOff className="w-3 h-3" />Currently closed</span>}
                </div>
                <button className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-bold rounded-xl transition-colors shadow-[0_2px_8px_rgba(220,38,38,0.2)]">
                  Take Token <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-[14px] font-bold text-slate-700">No offices found</p>
          <p className="text-[12.5px] text-slate-400 mt-1">Try a different search term.</p>
        </div>
      )}
    </div>
  );
}
