import { useDemoStore } from '../../stores/demoStore';
import { HeroQueueCard } from '../../components/HeroQueueCard';
import { ServiceDetailsCard } from '../../components/ServiceDetailsCard';
import { CounterStatusCard } from '../../components/CounterStatusCard';
import { RecentUpdatesCard } from '../../components/RecentUpdatesCard';
import { LiveQueueCard } from '../../components/LiveQueueCard';
import { QueueMovementChart } from '../../components/QueueMovementChart';

export default function CitizenHomePage() {
  const { token, queue, counters, notifications } = useDemoStore();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start mt-1">
      {/* Left 7 Columns */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        <HeroQueueCard token={token} queue={queue} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <LiveQueueCard queue={queue} />
          <QueueMovementChart />
        </div>
      </div>
      {/* Right 5 Columns */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        <ServiceDetailsCard token={token} />
        <CounterStatusCard counters={counters} />
        <RecentUpdatesCard notifications={notifications} />
      </div>
    </div>
  );
}
