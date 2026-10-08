import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const QueueMovementChart: React.FC = () => {
  const [timeRange, setTimeRange] = useState('Last 1 Hour');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Chart coordinates mapping (Width: 460, Height: 160)
  // Y: 0 is at 60 people (svg y=15), Y: 60 is at 0 people (svg y=135)
  // Points along the curve matching screenshot
  const points = [
    { x: 30, y: 125, time: '1:00 PM', value: 8 },
    { x: 50, y: 110, time: '1:08 PM', value: 16 },
    { x: 70, y: 116, time: '1:14 PM', value: 14 },
    { x: 95, y: 104, time: '1:22 PM', value: 20 },
    { x: 120, y: 108, time: '1:28 PM', value: 18 },
    { x: 145, y: 92, time: '1:35 PM', value: 26 },
    { x: 175, y: 84, time: '1:42 PM', value: 30 },
    { x: 210, y: 64, time: '1:52 PM', value: 40 },
    { x: 250, y: 52, time: '2:02 PM', value: 46 },
    { x: 280, y: 44, time: '2:08 PM', value: 50 },
    { x: 300, y: 50, time: '2:12 PM', value: 47 },
    { x: 326, y: 72, time: '2:18 PM', value: 36, isNow: true }, // Current "NOW" point at 2:18 PM
    { x: 350, y: 90, time: '2:22 PM', value: 27 },
    { x: 380, y: 98, time: '2:27 PM', value: 23 },
    { x: 410, y: 110, time: '2:30 PM', value: 18 },
  ];

  // SVG smooth cubic bezier path generator
  const getSvgPath = () => {
    return `M 30,125 
      C 42,112 55,108 70,116 
      C 80,121 88,107 95,104 
      C 105,100 112,110 120,108 
      C 132,106 138,94 145,92 
      C 158,88 165,85 175,84 
      C 192,82 198,68 210,64 
      C 228,58 238,53 250,52 
      C 265,51 272,42 280,44 
      C 290,46 295,49 300,50 
      C 310,52 318,65 326,72 
      C 336,81 342,88 350,90 
      C 365,94 372,97 380,98 
      C 392,100 402,106 410,110`;
  };

  const pathD = getSvgPath();
  const areaD = `${pathD} L 410,135 L 30,135 Z`;

  const nowPoint = points.find((p) => p.isNow) || { x: 326, y: 72 };

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <h3 className="text-[14.5px] font-bold text-slate-900">
          Queue Movement
        </h3>

        {/* Dropdown Filter */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200/90 text-slate-700 text-[11.5px] font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <span>{timeRange}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-xl shadow-lg border border-slate-100 p-1.5 z-30">
              {['Last 1 Hour', 'Last 2 Hours', 'Today', 'This Week'].map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setTimeRange(item);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                    timeRange === item
                      ? 'bg-red-50 text-red-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Y-Axis Label */}
      <div className="text-[11px] font-medium text-slate-400 mt-1">
        People in queue
      </div>

      {/* Interactive SVG Chart */}
      <div className="relative w-full h-[180px] mt-1 select-none">
        <svg
          viewBox="0 0 440 160"
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Red gradient fill under chart */}
            <linearGradient id="queueAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.32" />
              <stop offset="60%" stopColor="#f43f5e" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>

            <filter id="shadowRed" x="-10%" y="-10%" width="120%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#e11d48" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Horizontal Gridlines and Y-axis labels */}
          {/* 60 */}
          <line x1="26" y1="25" x2="420" y2="25" stroke="#f1f5f9" strokeWidth="1" />
          <text x="18" y="28" textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="500">
            60
          </text>

          {/* 40 */}
          <line x1="26" y1="62" x2="420" y2="62" stroke="#f1f5f9" strokeWidth="1" />
          <text x="18" y="65" textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="500">
            40
          </text>

          {/* 20 */}
          <line x1="26" y1="99" x2="420" y2="99" stroke="#f1f5f9" strokeWidth="1" />
          <text x="18" y="102" textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="500">
            20
          </text>

          {/* 0 */}
          <line x1="26" y1="135" x2="420" y2="135" stroke="#e2e8f0" strokeWidth="1" />
          <text x="18" y="138" textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="500">
            0
          </text>

          {/* Area Fill */}
          <path d={areaD} fill="url(#queueAreaGrad)" />

          {/* Main Curve Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#e11d48"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#shadowRed)"
          />

          {/* Vertical Guideline for "NOW" point */}
          <line
            x1={nowPoint.x}
            y1={nowPoint.y}
            x2={nowPoint.x}
            y2="135"
            stroke="#e11d48"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            strokeOpacity="0.8"
          />

          {/* "NOW" Indicator Point */}
          <circle
            cx={nowPoint.x}
            cy={nowPoint.y}
            r="4.5"
            fill="#e11d48"
            stroke="#ffffff"
            strokeWidth="2.5"
            className="drop-shadow-md"
          />
        </svg>

        {/* Floating Tooltip Pill for "Now / 2:18 PM" */}
        <div
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: `${(nowPoint.x / 440) * 100}%`,
            top: `${(nowPoint.y / 160) * 100 - 6}%`,
          }}
        >
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-lg px-2 py-0.5 shadow-md flex flex-col items-center">
            <span className="text-[9px] text-slate-400 font-medium uppercase leading-tight">
              Now
            </span>
            <span className="text-[10.5px] font-extrabold text-slate-900 leading-tight">
              2:18 PM
            </span>
            {/* Little downward arrow tick */}
            <div className="w-1.5 h-1.5 bg-white border-r border-b border-slate-200/90 transform rotate-45 -mb-1 mt-0.5" />
          </div>
        </div>

        {/* X-Axis Timestamps */}
        <div className="flex items-center justify-between px-6 pt-1 text-[10.5px] text-slate-400 font-medium">
          <span>1:00 PM</span>
          <span>1:30 PM</span>
          <span>2:00 PM</span>
          <span>2:30 PM</span>
        </div>
      </div>
    </div>
  );
};
