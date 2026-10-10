import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ChevronRight, MapPin, Clock, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Token } from '../types';
import { officesApi } from '../services/api/offices';

interface ServiceDetailsCardProps {
  token?: Token;
}

export const ServiceDetailsCard: React.FC<ServiceDetailsCardProps> = ({ token }) => {
  const navigate = useNavigate();
  const serviceName = token?.serviceName    ?? '—';
  const officeName  = token?.officeName     ?? '—';
  const officeId    = token?.officeId       ?? '';
  const dept        = token?.departmentName ?? '—';
  const { data: office } = useQuery({
    queryKey: ['office', officeId],
    queryFn: () => officesApi.get(officeId),
    enabled: !!officeId,
  });

  const openMaps = () => {
    // Opens Google Maps with the office address
    const query = encodeURIComponent(office ? `${office.name}, ${office.address}` : officeName);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <h3 className="text-[14.5px] font-bold text-slate-900">Service Details</h3>
        <button
          onClick={() => navigate(`/citizen/offices/${officeId}`)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-red-600 hover:text-red-700 transition-colors group"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300" />
          Change Service
        </button>
      </div>

      <button
        onClick={() => navigate(`/citizen/offices/${officeId}`)}
        className="w-full flex items-center justify-between py-3.5 border-b border-slate-100 group hover:bg-slate-50/60 -mx-2 px-2 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100/80 flex items-center justify-center text-red-600 flex-shrink-0 shadow-sm">
            <BookOpen className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="text-left">
            <div className="text-[13.5px] font-bold text-slate-900 leading-tight">{serviceName}</div>
            <div className="text-[11.5px] text-slate-400 font-medium mt-0.5">{dept}</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
      </button>

      <div className="py-3.5 border-b border-slate-100">
        <div className="flex items-start gap-2.5">
          <MapPin className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-bold text-slate-900">{officeName}</span>
              <button
                onClick={openMaps}
                className="text-[11.5px] font-semibold text-red-600 hover:text-red-700 hover:underline transition-colors"
              >
                View on Map
              </button>
            </div>
            <p className="text-[11.5px] text-slate-400 leading-snug mt-0.5">
              {office?.address ?? ''}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate(`/citizen/offices/${officeId}`)}
        className="w-full pt-3.5 flex items-center justify-between group hover:bg-slate-50/60 -mx-2 px-2 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <div className="text-left">
            <div className="text-[12.5px] font-bold text-slate-900">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div className="text-[11.5px] text-slate-400 font-medium mt-0.5">{office ? `${office.openTime} – ${office.closeTime}` : '—'}</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
      </button>
    </div>
  );
};
