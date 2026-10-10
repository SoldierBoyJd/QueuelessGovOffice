import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { MOCK_QUEUE_CHART_DATA } from '../mock/data';

export const QueueMovementChart: React.FC = () => {
  const [timeRange, setTimeRange] = useState('Last 1 Hour');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <h3 className="text-[14.5px] font-bold text-slate-900">Queue Movement</h3>
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
                  onClick={() => { setTimeRange(item); setDropdownOpen(false); }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                    timeRange === item ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-[11px] font-medium text-slate-400 mt-1 mb-3">People in queue</div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={MOCK_QUEUE_CHART_DATA} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="qGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#e11d48" stopOpacity={0.30} />
              <stop offset="70%"  stopColor="#e11d48" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            domain={[0, 60]}
            ticks={[0, 20, 40, 60]}
          />
          <Tooltip
            contentStyle={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              fontSize: 11,
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            }}
            formatter={(v: unknown) => [`${v as number} people`, 'In queue']}
            labelFormatter={(l: unknown) => String(l)}
          />
          <ReferenceLine
            x="2:18 PM"
            stroke="#e11d48"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{
              value: 'NOW',
              position: 'top',
              fontSize: 9,
              fill: '#e11d48',
              fontWeight: 700,
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#e11d48"
            strokeWidth={2.5}
            fill="url(#qGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#e11d48', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
