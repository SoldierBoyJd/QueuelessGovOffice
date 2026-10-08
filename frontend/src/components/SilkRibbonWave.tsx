import React from 'react';

export const SilkRibbonWave: React.FC = () => {
  return (
    <div
      className="absolute right-0 top-0 h-full pointer-events-none select-none"
      style={{
        width: '72%',
        zIndex: 0,
        // CSS mask fades: left edge (horizontal), and top+bottom edges (vertical)
        // Both gradients are multiplied together so all three edges fade naturally
        WebkitMaskImage: [
          'linear-gradient(to right, transparent 0%, black 32%, black 100%)',
          'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)',
        ].join(', '),
        maskImage: [
          'linear-gradient(to right, transparent 0%, black 32%, black 100%)',
          'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)',
        ].join(', '),
        WebkitMaskComposite: 'intersect',
        maskComposite: 'intersect',
      }}
    >
      <svg
        viewBox="0 0 700 220"
        style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '100%',
          height: '170%',
          overflow: 'visible',
        }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="satinMain" x1="0" y1="110" x2="700" y2="55" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#f43f5e" stopOpacity="0" />
            <stop offset="25%"  stopColor="#fda4af" stopOpacity="0.28" />
            <stop offset="50%"  stopColor="#fb7185" stopOpacity="0.65" />
            <stop offset="75%"  stopColor="#e11d48" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#be123c" stopOpacity="0.88" />
          </linearGradient>

          <linearGradient id="satinShadow" x1="0" y1="100" x2="700" y2="115" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#881337" stopOpacity="0" />
            <stop offset="30%"  stopColor="#881337" stopOpacity="0.28" />
            <stop offset="70%"  stopColor="#9f1239" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#9f1239" stopOpacity="0.3" />
          </linearGradient>

          <linearGradient id="satinSheer" x1="0" y1="90" x2="700" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#fda4af" stopOpacity="0" />
            <stop offset="35%"  stopColor="#fda4af" stopOpacity="0.22" />
            <stop offset="65%"  stopColor="#fb7185" stopOpacity="0.46" />
            <stop offset="100%" stopColor="#fda4af" stopOpacity="0.2" />
          </linearGradient>

          <linearGradient id="satinGlint" x1="0" y1="0" x2="700" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0" />
            <stop offset="28%"  stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="56%"  stopColor="#ffffff" stopOpacity="0.88" />
            <stop offset="82%"  stopColor="#ffe4e6" stopOpacity="0.76" />
            <stop offset="100%" stopColor="#fda4af" stopOpacity="0.28" />
          </linearGradient>

          <filter id="glow" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        {/* Ambient glow */}
        <path
          d="M 0,118 C 150,110 290,152 430,145 C 540,138 625,82 700,50
             L 700,138 C 625,164 540,208 430,210 C 290,213 150,156 0,118 Z"
          fill="#be123c"
          opacity="0.18"
          filter="url(#glow)"
        />

        {/* Underfold shadow */}
        <path
          d="M 0,118 C 150,113 290,152 430,145 C 540,138 625,82 700,52
             L 700,96 C 625,124 540,178 430,182 C 290,186 150,145 0,118 Z"
          fill="url(#satinShadow)"
        />

        {/* Main ribbon body */}
        <path
          d="M 0,112 C 148,106 285,144 418,137 C 528,130 620,70 700,38
             L 700,104 C 620,136 528,192 418,196 C 285,200 148,141 0,112 Z"
          fill="url(#satinMain)"
        />

        {/* Sheer upper ripple */}
        <path
          d="M 0,103 C 140,97 278,130 405,123 C 515,117 610,58 700,24
             L 700,70 C 610,100 515,155 405,160 C 278,165 140,127 0,103 Z"
          fill="url(#satinSheer)"
        />

        {/* Specular glint */}
        <path
          d="M 0,110 C 148,104 285,140 418,134 C 528,128 620,67 700,36"
          stroke="url(#satinGlint)"
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {/* Secondary highlight */}
        <path
          d="M 0,101 C 142,95 280,128 408,122 C 518,116 612,56 700,22"
          stroke="#ffffff"
          strokeWidth="1.3"
          strokeOpacity="0.46"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
