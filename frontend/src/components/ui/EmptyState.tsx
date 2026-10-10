import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, Hash, Bell, History } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; to?: string; onClick?: () => void };
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  compact = false,
}) => {
  const navigate = useNavigate();

  const handleAction = () => {
    if (action?.to)      navigate(action.to);
    if (action?.onClick) action.onClick();
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-6'}`}>
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center mb-4 text-slate-400">
        {icon ?? <Inbox className="w-7 h-7" />}
      </div>
      <h3 className="text-[15px] font-black text-slate-700 mb-1">{title}</h3>
      {description && <p className="text-[13px] text-slate-400 max-w-[320px] leading-relaxed">{description}</p>}
      {action && (
        <button onClick={handleAction}
          className="mt-5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] transition-colors shadow-[0_2px_8px_rgba(220,38,38,0.2)]">
          {action.label}
        </button>
      )}
    </div>
  );
};

// ── Common preset empties ─────────────────────────────────────────────────────

export const NoActiveToken: React.FC = () => (
  <EmptyState
    icon={<Hash className="w-7 h-7" />}
    title="No active token"
    description="You don't have an active queue token. Find a service and take a virtual token to join the queue."
    action={{ label: 'Find a Service', to: '/citizen/offices' }}
  />
);

export const NoNotifications: React.FC = () => (
  <EmptyState
    icon={<Bell className="w-7 h-7" />}
    title="No notifications"
    description="You're all caught up. Updates about your token and queue will appear here."
    compact
  />
);

export const NoHistory: React.FC = () => (
  <EmptyState
    icon={<History className="w-7 h-7" />}
    title="No history yet"
    description="Your past queue tokens and visits will appear here."
    action={{ label: 'Find a Service', to: '/citizen/offices' }}
    compact
  />
);
