import React, { useState, useEffect } from 'react';

interface HeaderGreetingProps {
  userName?: string;
  greeting?: string;
  dateStr?: string;
  timeStr?: string;
}

export const HeaderGreeting: React.FC<HeaderGreetingProps> = ({
  userName = 'there',
  greeting,
}) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hour = now.getHours();
  const liveGreeting = greeting ?? (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');
  const displayDate = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const displayTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

  return (
    <div className="w-full relative flex items-center justify-between pt-2 pb-4" style={{ zIndex: 1 }}>
      <div>
        <h1 className="text-[22px] sm:text-[28px] lg:text-[34px] font-black text-slate-900 tracking-tight leading-tight">
          {liveGreeting}, {userName}
        </h1>
        <p className="text-[12px] sm:text-[14px] text-slate-500 font-medium mt-0.5 sm:mt-1">
          Here's the latest update on your token and queue.
        </p>
      </div>
      {/* Hide on mobile — shown in AdminShell heading instead */}
      <div className="text-right flex-col items-end hidden sm:flex">
        <span className="text-[12px] sm:text-[13.5px] font-semibold text-slate-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
          {displayDate}
        </span>
        <span className="text-[24px] sm:text-[32px] lg:text-[40px] font-black text-[#dc2626] tracking-tight leading-none mt-1 drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]">
          {displayTime}
        </span>
      </div>
    </div>
  );
};
