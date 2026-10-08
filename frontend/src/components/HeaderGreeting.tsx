import React, { useState, useEffect } from 'react';

interface HeaderGreetingProps {
  userName?: string;
  greeting?: string;
  dateStr?: string;
  timeStr?: string;
}

export const HeaderGreeting: React.FC<HeaderGreetingProps> = ({
  userName = 'Jainam',
  greeting = 'Good afternoon',
  dateStr,
  timeStr,
}) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const displayDate = dateStr || now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const displayTime = timeStr || now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  const hour = now.getHours();
  const liveGreeting = greeting || (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');

  return (
    <div className="w-full relative flex items-center justify-between pt-2 pb-4" style={{ zIndex: 1 }}>
      <div>
        <h1 className="text-3xl lg:text-[34px] font-black text-slate-900 tracking-tight leading-tight">
          {liveGreeting}, {userName}
        </h1>
        <p className="text-[14px] text-slate-500 font-medium mt-1">
          Here's the latest update on your token and queue.
        </p>
      </div>
      <div className="text-right flex flex-col items-end">
        <span className="text-[13.5px] font-semibold text-slate-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
          {displayDate}
        </span>
        <span className="text-3xl lg:text-[40px] font-black text-[#dc2626] tracking-tight leading-none mt-1 drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]">
          {displayTime}
        </span>
      </div>
    </div>
  );
};
