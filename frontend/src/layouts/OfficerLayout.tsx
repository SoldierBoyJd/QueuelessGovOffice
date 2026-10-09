import { LayoutDashboard, ListOrdered, MonitorCheck, Users } from 'lucide-react';
import AdminShell from './AdminShell';
import { useAuthStore } from '../stores/authStore';
import { useLocation } from 'react-router-dom';

export default function OfficerLayout() {
  const { user } = useAuthStore();
  const location = useLocation();

  const titleMap: Record<string, { title: string; sub: string }> = {
    '/officer/dashboard': { title: 'Officer Dashboard', sub: 'Rajkot District Office · Counter 01' },
  };
  const current = Object.entries(titleMap).find(([k]) => location.pathname.startsWith(k))?.[1];

  return (
    <AdminShell
      roleLabel="Officer"
      officeName="Rajkot District Office"
      pageTitle={current?.title}
      pageSubtitle={current?.sub ?? `Signed in as ${user?.name ?? 'Officer'}`}
      sections={[{
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, route: '/officer/dashboard' },
          { id: 'queue',     label: 'Live Queue', icon: ListOrdered,    route: '/officer/dashboard' },
          { id: 'counters',  label: 'Counters',   icon: MonitorCheck,   route: '/officer/dashboard' },
          { id: 'officers',  label: 'Officers',   icon: Users,          route: '/officer/dashboard' },
        ],
      }]}
    />
  );
}
