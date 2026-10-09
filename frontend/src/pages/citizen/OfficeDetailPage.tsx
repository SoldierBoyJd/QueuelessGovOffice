import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Clock, Phone, ChevronLeft, Users, Layers, Check } from 'lucide-react';
import { MOCK_OFFICES } from '../../mock/data';

export default function OfficeDetailPage() {
  const { officeId } = useParams();
  const navigate = useNavigate();
  const office = MOCK_OFFICES.find(o => o.id === officeId) ?? MOCK_OFFICES[0];
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [taking, setTaking] = useState(false);
  const [taken, setTaken] = useState(false);

  const handleTakeToken = async () => {
    if (!selectedService) return;
    setTaking(true);
    await new Promise(r => setTimeout(r, 900));
    setTaking(false);
    setTaken(true);
    await new Promise(r => setTimeout(r, 800));
    navigate('/citizen/token');
  };

  return (
    <div className="flex flex-col gap-5 mt-1">
      {/* Back */}
      <button onClick={() => navigate('/citizen/offices')} className="flex items-center gap-2 text-[13px] font-semibold text-slate-600 hover:text-slate-900 transition-colors w-fit">
        <ChevronLeft className="w-4 h-4" /> Back to offices
      </button>

      {/* Office header card */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-[22px] font-black text-slate-900 tracking-tight">{office.name}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[12.5px] text-slate-500">{office.address}</span>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-[11.5px] font-bold border ${office.isOpen ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
            {office.isOpen ? 'Open Now' : 'Closed'}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-100 pt-4">
          {[
            { icon: <Users className="w-4 h-4" />, label: 'Waiting', value: office.totalWaiting },
            { icon: <Layers className="w-4 h-4" />, label: 'Active Counters', value: `${office.activeCounters}/${office.totalCounters}` },
            { icon: <Clock className="w-4 h-4" />, label: 'Avg Wait', value: `${office.avgWaitMinutes} min` },
            { icon: <Phone className="w-4 h-4" />, label: 'Hours', value: `${office.openTime} – ${office.closeTime}` },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-500">{s.icon}</div>
              <div>
                <div className="text-[10.5px] text-slate-400 font-medium">{s.label}</div>
                <div className="text-[13.5px] font-black text-slate-900">{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Select service */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6">
        <h2 className="text-[16px] font-black text-slate-900 mb-4">Select a Service</h2>
        <div className="space-y-4">
          {office.departments.map(dept => (
            <div key={dept.id}>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{dept.name}</div>
              <div className="space-y-2">
                {dept.services.map(svc => {
                  const isSelected = selectedService === svc.id;
                  return (
                    <button key={svc.id} onClick={() => setSelectedService(svc.id)}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all text-left ${isSelected ? 'bg-red-50/80 border-red-300/80 shadow-[0_2px_8px_rgba(220,38,38,0.08)]' : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60'}`}>
                      <div>
                        <div className={`text-[13.5px] font-bold ${isSelected ? 'text-red-700' : 'text-slate-900'}`}>{svc.name}</div>
                        <div className="text-[12px] text-slate-400 mt-0.5">{svc.description} · ~{svc.avgServiceMinutes} min</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-red-600 border-red-600' : 'border-slate-300'}`}>
                        {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {office.departments.length === 0 && (
            <p className="text-[13px] text-slate-400 text-center py-6">No services available for this office.</p>
          )}
        </div>

        {/* Live queue preview */}
        {selectedService && (
          <div className="mt-4 px-4 py-3.5 rounded-2xl bg-[#f8fafc] border border-slate-200/80">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12.5px] font-bold text-slate-800">Live queue · Passport Services</p>
                <p className="text-[12px] text-slate-500 mt-0.5">37 waiting · 4 counters active · ~42 min estimated wait</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400 font-medium">Your position</p>
                <p className="text-[18px] font-black text-slate-900">#12</p>
              </div>
            </div>
          </div>
        )}

        <button onClick={handleTakeToken} disabled={!selectedService || taking || taken}
          className={`w-full mt-4 py-3 rounded-xl font-bold text-[14px] tracking-wide transition-all ${selectedService ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_4px_12px_rgba(220,38,38,0.25)]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'} disabled:opacity-60`}>
          {taken ? '✓ Token Issued — Redirecting…' : taking ? 'Issuing Token…' : 'Take Virtual Token →'}
        </button>
      </div>
    </div>
  );
}
