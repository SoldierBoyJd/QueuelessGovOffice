import React from 'react';

export const IndiaEmblem: React.FC<{ className?: string }> = ({ className = "w-16 h-24" }) => {
  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* Official State Emblem of India (Lion Capital of Ashoka with Satyameva Jayate) */}
      <img
        src="/emblem_of_india.svg"
        alt="State Emblem of India"
        className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.08)] opacity-90 hover:opacity-100 transition-opacity"
      />
    </div>
  );
};
