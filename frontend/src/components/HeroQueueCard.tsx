import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Info, BadgeCheck, Building } from 'lucide-react';
import type { Token, Queue } from '../types';

interface HeroQueueCardProps {
  token?: Token;
  queue?: Queue;
}

const STATUS_BADGE: Record<string, { bg: string; dot: string; text: string; label: string }> = {
  WAITING:  { bg: 'bg-amber-50 border-amber-200/80',  dot: 'bg-amber-500 animate-pulse', text: 'text-amber-600',  label: 'WAITING' },
  CALLED:   { bg: 'bg-blue-50 border-blue-200/80',    dot: 'bg-blue-500 animate-pulse',  text: 'text-blue-600',   label: 'CALLED' },
  SERVING:  { bg: 'bg-emerald-50 border-emerald-200/80', dot: 'bg-emerald-500',           text: 'text-emerald-600', label: 'SERVING' },
  HOLD:     { bg: 'bg-slate-50 border-slate-200/80',  dot: 'bg-slate-400',               text: 'text-slate-500',  label: 'ON HOLD' },
  COMPLETED:{ bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500',              text: 'text-emerald-600', label: 'DONE' },
};

export const HeroQueueCard: React.FC<HeroQueueCardProps> = ({ token, queue }) => {
  const navigate = useNavigate();
  const displayNum  = token?.displayNumber   ?? 'A-184';
  const status      = token?.status          ?? 'WAITING';
  const serviceName = token?.serviceName     ?? 'Passport Services';
  const officeName  = token?.officeName      ?? 'Rajkot District Office';
  const peopleAhead = token?.peopleAhead     ?? 11;
  const waitMin     = token?.prediction?.estimatedWaitMinutes ?? 42;
  const turnTime    = token?.prediction?.estimatedTurnTime   ?? '2:42 PM';
  const arrivalTime = token?.prediction?.recommendedArrival  ?? '2:27 PM';
  const confidence  = token?.prediction?.confidence          ?? 92;
  const lowerBound  = token?.prediction?.lowerBoundMinutes   ?? 35;
  const upperBound  = token?.prediction?.upperBoundMinutes   ?? 51;
  const totalQueue  = queue?.totalWaiting    ?? 31;
  const activeCount = queue?.activeCounters  ?? 4;

  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.WAITING;

  // Compute arrival window from bounds
  const now = new Date();
  const lowerTime = new Date(now.getTime() + lowerBound * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const upperTime = new Date(now.getTime() + upperBound * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-[28px] border-y border-r border-slate-100/90 border-l-4 border-l-red-500 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-7 transition-all">
      {/* Top Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
        <div>
          <span className="text-[12px] font-semibold text-slate-400 tracking-wide uppercase">Your Token</span>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-[44px] font-black text-slate-900 tracking-tight leading-none">{displayNum}</span>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${badge.bg} ${badge.text} text-[11px] font-bold tracking-wide`}>
              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
              {badge.label}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-slate-600">
            <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
              <BadgeCheck className="w-3.5 h-3.5 stroke-[2]" />
            </div>
            <span className="text-[13.5px] font-bold text-slate-900">{serviceName}</span>
            <span className="text-[12.5px] text-slate-400 ml-1">{officeName}</span>
          </div>
        </div>

        <div className="flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[12px] font-semibold text-slate-400 tracking-wide uppercase">Estimated Turn</span>
              <div className="text-[44px] font-black text-slate-900 tracking-tight leading-none mt-1">{turnTime}</div>
            </div>
            <button onClick={() => navigate('/citizen/token')} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-3 flex items-center flex-wrap gap-x-2 text-slate-600 text-[12.5px]">
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              Arrive around {arrivalTime}
              <Info className="w-3.5 h-3.5 text-slate-400 inline" />
            </span>
            <span className="text-slate-400 text-[12px]">Likely between {lowerTime} – {upperTime}</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-b border-slate-100">
        {[
          { value: peopleAhead, label: 'People ahead of you' },
          { value: totalQueue,  label: 'Total in queue for this service' },
          { value: activeCount, label: 'Active counters' },
          { value: `${confidence}%`, label: 'Prediction confidence', info: true },
        ].map((m, i) => (
          <div key={i}>
            <div className="text-[28px] font-black text-slate-900 tracking-tight leading-none">{m.value}</div>
            <div className="text-[12px] text-slate-500 font-normal leading-snug mt-1.5 flex items-center gap-1">
              {m.label}
              {m.info && <Info className="w-3 h-3 text-slate-400" />}
            </div>
          </div>
        ))}
      </div>

      {/* Progress Stepper — hidden on xs, visible on sm+ */}
      <div className="pt-6 hidden sm:block">
        <div className="relative flex items-center justify-between">
          <div className="flex flex-col items-start z-10">
            <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-sm shadow-red-200">
              <Check className="w-4 h-4 stroke-[2.8]" />
            </div>
            <div className="mt-2.5">
              <div className="text-[11.5px] font-extrabold text-slate-900 uppercase tracking-wider">NOW</div>
              <div className="text-[12px] text-slate-500 font-normal">You are in queue</div>
              <div className="text-[11px] text-slate-400 font-medium">
                ({new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()})
              </div>
            </div>
          </div>
          <div className="flex-1 h-[2px] bg-red-600 mx-2 -mt-10" />
          <div className="flex flex-col items-center z-10">
            <div className="w-7 h-7 rounded-full border-2 border-red-600 bg-white flex items-center justify-center shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
            </div>
            <div className="mt-2.5 text-center">
              <div className="text-[11.5px] font-extrabold text-slate-900 tracking-wider">{displayNum}</div>
              <div className="text-[12px] text-slate-500 font-normal">Your turn (est.)</div>
              <div className="text-[12px] font-bold text-slate-900">{turnTime}</div>
            </div>
          </div>
          <div className="flex-1 border-t-2 border-dashed border-slate-300 mx-2 -mt-10" />
          <div className="flex flex-col items-end z-10">
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center">
              <Building className="w-3.5 h-3.5 stroke-[2]" />
            </div>
            <div className="mt-2.5 text-right">
              <div className="text-[11.5px] font-extrabold text-slate-900 uppercase tracking-wider">SERVICE</div>
              <div className="text-[12px] text-slate-500 font-normal">At counter</div>
              <div className="text-[11px] text-slate-400 font-medium">(~{waitMin > 0 ? `${Math.round(waitMin / 5) * 5}` : '5'}–{Math.round(waitMin / 5) * 5 + 2} min)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
