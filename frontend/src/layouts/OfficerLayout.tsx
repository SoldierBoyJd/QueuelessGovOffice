import { LayoutDashboard, ListOrdered, MonitorCheck, Users } from 'lucide-react';
import AdminShell from './AdminShell';
import { useAuthStore } from '../stores/authStore';
import { useLocation } from 'react-router-dom';
import { useMyOffice } from '../hooks/useMyOffice';
import { useLiveStore } from '../stores/liveStore';

export default function OfficerLayout() {
  const { user } = useAuthStore();
  const location = useLocation();
  const { data: office } = useMyOffice();
  const counterName = useLiveStore(st => st.officer?.counterName);
  const officeName = office?.name ?? '';

  const titleMap: Record<string, { title: string; sub: string }> = {
    '/officer/dashboard': { title: 'Officer Dashboard',  sub: `${counterName ?? 'No counter'} · ${officeName}` },
    '/officer/queue':     { title: 'Live Queue',          sub: `${officeName} · All services` },
    '/officer/counters':  { title: 'Counter Overview',    sub: `${officeName} · All counters` },
    '/officer/officers':  { title: 'Officers On Duty',    sub: officeName },
  };
  const current = Object.entries(titleMap).find(([k]) => location.pathname.startsWith(k))?.[1];

  return (
    <AdminShell
      roleLabel="Officer"
      officeName={officeName}
      pageTitle={current?.title}
      pageSubtitle={current?.sub ?? `Signed in as ${user?.name ?? 'Officer'}`}
      sections={[{
        items: [
          { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard, route: '/officer/dashboard' },
          { id: 'queue',     label: 'Live Queue', icon: ListOrdered,     route: '/officer/queue'     },
          { id: 'counters',  label: 'Counters',   icon: MonitorCheck,    route: '/officer/counters'  },
          { id: 'officers',  label: 'Officers',   icon: Users,           route: '/officer/officers'  },
        ],
      }]}
    />
  );
}
