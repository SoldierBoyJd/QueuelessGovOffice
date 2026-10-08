import React from 'react';

interface LogoProps { dark?: boolean; }
export const Logo: React.FC<LogoProps> = ({ dark }) => {
  return (
    <div className="flex items-center gap-3">
      {/* Red Ribbon 'S' Monogram */}
      <div className="relative w-11 h-11 flex-shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="logoRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            <linearGradient id="logoFoldGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
          </defs>

          {/* S Ribbon Top Swirl */}
          <path
            d="M36 10 C28 6, 14 7, 12 15 C10 21, 20 23, 27 25 C35 27, 39 31, 37 38 C35 44, 25 45, 14 43 L12 37 C22 39, 30 38, 31 34 C32 29, 23 27, 17 24 C9 20, 8 13, 13 8 C19 3, 33 3, 39 7 Z"
            fill="url(#logoRedGrad)"
          />

          {/* S Ribbon lower swoosh with arrow tip */}
          <path
            d="M13 36 C18 41, 28 42, 38 38 L34 32 C28 35, 19 34, 15 30 Z"
            fill="url(#logoFoldGrad)"
          />

          {/* Queue people silhouettes in the lower curve */}
          {/* Person 1 */}
          <circle cx="16" cy="31" r="1.8" fill="#ffffff" />
          <path d="M13.5 37.5 C13.5 35 18.5 35 18.5 37.5 Z" fill="#ffffff" />

          {/* Person 2 */}
          <circle cx="21" cy="32" r="1.8" fill="#ffffff" />
          <path d="M18.5 38.5 C18.5 36 23.5 36 23.5 38.5 Z" fill="#ffffff" />

          {/* Person 3 (with arrow head pointing forward) */}
          <circle cx="26" cy="33" r="1.8" fill="#ffffff" />
          <path d="M23.5 39.5 C23.5 37 28.5 37 28.5 39.5 Z" fill="#ffffff" />

          {/* Directional arrow pointer */}
          <path d="M37 32 L44 35.5 L36 41 Z" fill="#dc2626" />
        </svg>
      </div>

      {/* Brand Name Typography */}
      <div className="flex flex-col leading-tight">
        <div className="flex items-baseline tracking-tight">
          <span className="font-extrabold text-[21px] tracking-tight" style={{ color: dark ? '#ffffff' : '#0f172a' }}>Skip</span>
          <span className="font-medium text-[15px] ml-1" style={{ color: dark ? '#94a3b8' : '#1e293b' }}>the</span>
          <span className="font-black text-[21px] text-[#dc2626] ml-1 tracking-tight">LINE</span>
        </div>
        <span className="text-[10px] font-medium tracking-tight -mt-0.5" style={{ color: dark ? '#64748b' : '#94a3b8' }}>
          Skip the queue, reach your turn.
        </span>
      </div>
    </div>
  );
};
