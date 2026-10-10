import { useLiveStore } from '../../stores/liveStore';
import { HeroQueueCard } from '../../components/HeroQueueCard';
import { ServiceDetailsCard } from '../../components/ServiceDetailsCard';
import { RecentUpdatesCard } from '../../components/RecentUpdatesCard';
import { LiveQueueCard } from '../../components/LiveQueueCard';
import { QueueSnapshotCard } from '../../components/QueueSnapshotCard';
import { NoActiveToken } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';

export default function CitizenHomePage() {
  const { token, queue, notifications, loaded } = useLiveStore();

  if (!loaded) return <LoadingState />;

  if (!token) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start mt-1">
        <div className="lg:col-span-7 bg-white/95 backdrop-blur-md rounded-[28px] border border-slate-100/90 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <NoActiveToken />
        </div>
        <div className="lg:col-span-5">
          <RecentUpdatesCard notifications={notifications} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start mt-1">
      {/* Left 7 Columns */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        <HeroQueueCard token={token} queue={queue} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <LiveQueueCard queue={queue} />
          <QueueSnapshotCard queue={queue} />
        </div>
      </div>
      {/* Right 5 Columns */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        <ServiceDetailsCard token={token} />
        <RecentUpdatesCard notifications={notifications} />
      </div>
    </div>
  );
}
