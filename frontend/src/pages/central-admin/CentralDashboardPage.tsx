import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MOCK_OFFICE_SUMMARIES, MOCK_REGION_SUMMARIES } from '../../mock/data';
import type { CongestionLevel } from '../../types';

const CONG_COLOR: Record<CongestionLevel, string> = {
  NORMAL: '#2f7d57',
  BUSY:   '#b7791f',
  HIGH:   '#c62828',
};
const CONG_STYLE: Record<CongestionLevel, string> = {
  NORMAL: 'bg-emerald-50 border-emerald-200/80 text-emerald-700',
  BUSY:   'bg-amber-50 border-amber-200/80 text-amber-700',
  HIGH:   'bg-red-50 border-red-200/80 text-red-700',
};

export default function CentralDashboardPage() {
  const [mapReady, setMapReady] = useState(false);
  const [, setSelectedOffice] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => { setMapReady(true); }, []);

  const topMetrics = [
    { label: 'Offices Monitored', value: '4,821', icon: <Building2 className="w-4 h-4" />, color: 'text-slate-600', bg: 'bg-slate-50' },
    { label: 'Citizens Waiting',  value: '38,291',icon: <Users className="w-4 h-4" />,    color: 'text-blue-600',  bg: 'bg-blue-50' },
    { label: 'Average Wait',      value: '27 min', icon: <Clock className="w-4 h-4" />,    color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'High Congestion',   value: '127',    icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 tracking-tight">National Overview</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Live government service intelligence ·{' '}
            <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> DEMO DATA
            </span>
          </p>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {topMetrics.map(m => (
          <div key={m.label} className="bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className={`w-8 h-8 rounded-xl ${m.bg} flex items-center justify-center ${m.color} mb-3`}>{m.icon}</div>
            <div className="text-[26px] font-black text-slate-900 tracking-tight leading-none">{m.value}</div>
            <div className="text-[11.5px] text-slate-400 font-semibold uppercase tracking-wide mt-1.5">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Map — 8 cols */}
        <div className="lg:col-span-8 bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-x-auto">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-[14.5px] font-bold text-slate-900">Office Congestion Map</h3>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              {(['NORMAL','BUSY','HIGH'] as CongestionLevel[]).map(c => (
                <div key={c} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: CONG_COLOR[c] }} />
                  <span className="text-slate-500">{c.charAt(0) + c.slice(1).toLowerCase()}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[420px] relative">
            {mapReady ? (
              <MapContainer
                center={[20.5937, 78.9629]}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
                attributionControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="© OpenStreetMap contributors"
                />
                {MOCK_OFFICE_SUMMARIES.map(office => (
                  <CircleMarker
                    key={office.id}
                    center={[office.lat, office.lng]}
                    radius={office.congestion === 'HIGH' ? 14 : office.congestion === 'BUSY' ? 10 : 8}
                    pathOptions={{
                      color: CONG_COLOR[office.congestion],
                      fillColor: CONG_COLOR[office.congestion],
                      fillOpacity: 0.75,
                      weight: 2,
                    }}
                    eventHandlers={{ click: () => setSelectedOffice(office.id) }}
                  >
                    <Popup>
                      <div className="p-1 min-w-[560px]">
                        <div className="font-bold text-[13px] text-slate-900 mb-1">{office.name}</div>
                        <div className="text-[12px] text-slate-500">{office.city}, {office.state}</div>
                        <div className="mt-2 flex justify-between text-[12px]">
                          <span className="text-slate-500">Waiting:</span>
                          <span className="font-bold text-slate-900">{office.waiting}</span>
                        </div>
                        <div className="flex justify-between text-[12px]">
                          <span className="text-slate-500">Avg wait:</span>
                          <span className="font-bold text-slate-900">{office.avgWait} min</span>
                        </div>
                        <div className={`mt-2 px-2 py-0.5 rounded-full border text-[11px] font-bold text-center ${CONG_STYLE[office.congestion]}`}>
                          {office.congestion}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">Loading map…</div>
            )}
          </div>
        </div>

        {/* Regional table — 4 cols */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14.5px] font-bold text-slate-900">Regional Summary</h3>
              <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">DEMO</span>
            </div>
            <div className="space-y-2">
              {MOCK_REGION_SUMMARIES.map(r => (
                <div key={r.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50/60 transition-colors cursor-pointer group"
                  onClick={() => navigate('/central/offices')}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${r.congestionLevel === 'HIGH' ? 'bg-red-500' : r.congestionLevel === 'BUSY' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <div>
                      <div className="text-[13px] font-bold text-slate-900">{r.name}</div>
                      <div className="text-[11px] text-slate-400">{r.officeCount.toLocaleString()} offices</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[13px] font-black text-slate-900">{r.totalWaiting.toLocaleString()}</div>
                      <div className="text-[10.5px] text-slate-400">waiting</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* High congestion alert */}
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-red-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h3 className="text-[13.5px] font-bold text-red-800">High Congestion Offices</h3>
            </div>
            <div className="space-y-2">
              {MOCK_OFFICE_SUMMARIES.filter(o => o.congestion === 'HIGH').slice(0, 3).map(o => (
                <div key={o.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-red-50/50">
                  <div>
                    <div className="text-[12.5px] font-bold text-red-900">{o.name}</div>
                    <div className="text-[11px] text-red-500">{o.waiting} waiting · {o.avgWait} min</div>
                  </div>
                  <span className="text-[11px] font-bold text-red-600 bg-red-100 border border-red-200/80 px-2 py-0.5 rounded-full">HIGH</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Drilldown table */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14.5px] font-bold text-slate-900">All Monitored Offices</h3>
          <span className="text-[12px] text-slate-400">{MOCK_OFFICE_SUMMARIES.length} offices</span>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-12 min-w-[560px] text-[11px] font-bold text-slate-400 uppercase tracking-wide px-2 py-2 border-b border-slate-100">
              <div className="col-span-4">Office</div>
              <div className="col-span-2 text-right">Waiting</div>
              <div className="col-span-2 text-right">Avg Wait</div>
              <div className="col-span-2 text-right">Counters</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            <div className="divide-y divide-slate-50">
              {MOCK_OFFICE_SUMMARIES.map(o => (
                <div key={o.id} className="grid grid-cols-12 min-w-[560px] items-center px-2 py-3 hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => navigate('/central/offices')}>
                  <div className="col-span-4">
                    <div className="text-[13px] font-bold text-slate-900 truncate">{o.name}</div>
                    <div className="text-[11px] text-slate-400">{o.city}, {o.state}</div>
                  </div>
                  <div className="col-span-2 text-right font-black text-[14px] text-slate-900">{o.waiting}</div>
                  <div className="col-span-2 text-right text-[12.5px] font-semibold text-slate-600">{o.avgWait > 0 ? `${o.avgWait}m` : '—'}</div>
                  <div className="col-span-2 text-right text-[12.5px] font-semibold text-slate-600">{o.activeCounters}</div>
                  <div className="col-span-2 flex justify-end">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${CONG_STYLE[o.congestion]}`}>{o.congestion}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden space-y-2">
          {MOCK_OFFICE_SUMMARIES.map(o => (
            <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100 cursor-pointer hover:bg-slate-100/60 transition-colors" onClick={() => navigate('/central/offices')}>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold text-slate-900 truncate">{o.name}</div>
                <div className="text-[11px] text-slate-400">{o.city} · {o.waiting} waiting · {o.avgWait > 0 ? `${o.avgWait}m avg` : 'Closed'}</div>
              </div>
              <span className={`ml-3 px-2.5 py-0.5 rounded-full border text-[11px] font-bold flex-shrink-0 ${CONG_STYLE[o.congestion]}`}>{o.congestion}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
