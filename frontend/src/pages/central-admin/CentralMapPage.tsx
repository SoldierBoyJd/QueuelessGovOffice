import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { CongestionLevel } from '../../types';
import { MapPin, Users, Clock } from 'lucide-react';
import { useCentralData } from '../../hooks/useCentralData';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { parseApiError } from '../../services/api/client';

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

export default function CentralMapPage() {
  const { offices, isLoading, error, refetch } = useCentralData();
  const [mapReady, setMapReady] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [filterCong, setFilterCong] = useState<CongestionLevel | 'ALL'>('ALL');

  useEffect(() => { setMapReady(true); }, []);

  const filtered = offices.filter(
    o => (filterCong === 'ALL' || o.congestion === filterCong) && !!o.lat && !!o.lng
  );
  const selectedOffice = selected ? offices.find(o => o.id === selected) : null;

  if (isLoading) return <LoadingState message="Loading network data…" />;
  if (error) return <ErrorState message={parseApiError(error).message} onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-5">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[13px] font-semibold text-slate-600">Filter:</span>
        {(['ALL', 'NORMAL', 'BUSY', 'HIGH'] as const).map(f => (
          <button key={f} onClick={() => setFilterCong(f)}
            className={`px-3.5 py-1.5 rounded-xl border text-[12px] font-bold transition-all ${
              filterCong === f
                ? 'bg-red-600 border-red-600 text-white shadow-[0_2px_8px_rgba(220,38,38,0.2)]'
                : 'border-slate-200/80 bg-white/90 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f}
          </button>
        ))}
        <div className="flex items-center gap-3 ml-4">
          {(['NORMAL', 'BUSY', 'HIGH'] as CongestionLevel[]).map(c => (
            <div key={c} className="flex items-center gap-1.5 text-[11.5px] text-slate-500 font-medium">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: CONG_COLOR[c] }} />
              {c.charAt(0) + c.slice(1).toLowerCase()}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Map */}
        <div className="lg:col-span-8 bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-[14.5px] font-bold text-slate-900">Live Office Map</h3>
            <span className="text-[12px] text-slate-400 font-medium">{filtered.length} offices shown</span>
          </div>
          <div className="h-[520px]">
            {mapReady ? (
              <MapContainer center={[20.5937, 78.9629]} zoom={5}
                style={{ height: '100%', width: '100%' }}
                attributionControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {filtered.map(office => (
                  <CircleMarker
                    key={office.id}
                    center={[office.lat, office.lng]}
                    radius={office.congestion === 'HIGH' ? 16 : office.congestion === 'BUSY' ? 12 : 9}
                    pathOptions={{
                      color: CONG_COLOR[office.congestion],
                      fillColor: CONG_COLOR[office.congestion],
                      fillOpacity: 0.78, weight: 2.5,
                    }}
                    eventHandlers={{ click: () => setSelected(office.id) }}
                  >
                    <Popup>
                      <div className="p-1 min-w-[190px]">
                        <div className="font-bold text-[13px] text-slate-900 mb-1">{office.name}</div>
                        <div className="text-[12px] text-slate-500 mb-2">{office.city}, {office.state}</div>
                        <div className="grid grid-cols-2 gap-2 text-[12px]">
                          <div><span className="text-slate-400">Waiting:</span> <strong>{office.waiting}</strong></div>
                          <div><span className="text-slate-400">Avg wait:</span> <strong>{office.avgWait} min</strong></div>
                          <div><span className="text-slate-400">Counters:</span> <strong>{office.activeCounters}</strong></div>
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
              <div className="flex items-center justify-center h-full">
                <div className="text-[13px] text-slate-400 font-medium">Loading map…</div>
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Selected office detail */}
          {selectedOffice ? (
            <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-[14px] font-black text-slate-900">{selectedOffice.name}</h3>
                <button onClick={() => setSelected(null)} className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold">Clear</button>
              </div>
              <div className="flex items-center gap-1.5 mb-4">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[12px] text-slate-500">{selectedOffice.city}, {selectedOffice.state}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: <Users className="w-4 h-4" />, label: 'Waiting',  value: selectedOffice.waiting, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { icon: <Clock className="w-4 h-4" />, label: 'Avg wait', value: `${selectedOffice.avgWait}m`, color: 'text-blue-600', bg: 'bg-blue-50' },
                ].map(m => (
                  <div key={m.label} className="bg-slate-50/80 rounded-2xl p-3">
                    <div className={`w-7 h-7 rounded-xl ${m.bg} flex items-center justify-center ${m.color} mb-2`}>{m.icon}</div>
                    <div className="text-[18px] font-black text-slate-900">{m.value}</div>
                    <div className="text-[10.5px] text-slate-400 font-semibold uppercase">{m.label}</div>
                  </div>
                ))}
              </div>
              <div className={`mt-3 px-3 py-2 rounded-xl border text-[12px] font-bold text-center ${CONG_STYLE[selectedOffice.congestion]}`}>
                {selectedOffice.congestion} CONGESTION
              </div>
            </div>
          ) : (
            <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 text-center">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-[13px] font-bold text-slate-700">Click any office</p>
              <p className="text-[12px] text-slate-400 mt-0.5">Select a marker on the map to see details</p>
            </div>
          )}

          {/* Office list */}
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 flex-1">
            <h3 className="text-[14px] font-bold text-slate-900 mb-3">Office List</h3>
            <div className="space-y-1.5 overflow-y-auto max-h-[340px]" style={{ scrollbarWidth: 'thin' }}>
              {filtered.map(o => (
                <button key={o.id} onClick={() => setSelected(o.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all hover:bg-slate-50 ${selected === o.id ? 'bg-red-50/60 border border-red-200/50' : ''}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CONG_COLOR[o.congestion] }} />
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-bold text-slate-900 truncate">{o.name}</div>
                      <div className="text-[11px] text-slate-400">{o.city}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-[13px] font-black text-slate-900">{o.waiting}</div>
                    <div className="text-[10px] text-slate-400">waiting</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
