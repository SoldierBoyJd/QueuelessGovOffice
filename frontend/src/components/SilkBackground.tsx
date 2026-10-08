import React from 'react';

export const SilkBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Bottom-Left subtle red silk glow (refracting through the translucent frosted sidebar) */}
      <svg
        className="absolute bottom-0 left-0 w-[420px] h-[380px] opacity-75 transition-opacity"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="silkSidebarGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#e11d48" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#be123c" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <path
          d="M -50 400 C 50 310, 140 270, 180 295 C 250 330, 200 390, 280 400 Z"
          fill="url(#silkSidebarGrad)"
          filter="blur(28px)"
          opacity="0.45"
        />
        <path
          d="M -30 380 C 40 330, 110 300, 150 315 C 210 340, 180 390, 230 400 Z"
          stroke="#e11d48"
          strokeWidth="3.5"
          opacity="0.3"
          filter="blur(10px)"
        />
      </svg>
    </div>
  );
};
