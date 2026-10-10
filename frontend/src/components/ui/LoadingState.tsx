import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  compact?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading…',
  compact = false,
}) => (
  <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-20'}`}>
    <Loader2 className="w-8 h-8 text-red-600 animate-spin mb-3" />
    <p className="text-[13.5px] font-semibold text-slate-500">{message}</p>
  </div>
);

/** Skeleton shimmer block — use for card placeholders */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-slate-200/80 rounded-xl animate-pulse ${className}`} />
);

/** Card-shaped skeleton */
export const CardSkeleton: React.FC = () => (
  <div className="bg-white/95 rounded-[24px] border border-slate-100/90 p-5 space-y-3">
    <Skeleton className="h-5 w-1/3" />
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="h-4 w-1/2" />
    <div className="pt-2 grid grid-cols-3 gap-3">
      {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
    </div>
  </div>
);
