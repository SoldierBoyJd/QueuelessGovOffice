import { LayoutDashboard, MonitorCheck, BarChart2, CloudLightning, ShieldCheck, Users } from 'lucide-react';
import AdminShell from './AdminShell';
import { useLocation } from 'react-router-dom';
import { useMyOffice } from '../hooks/useMyOffice';

export default function OfficeAdminLayout() {
  const location = useLocation();
  const { data: office } = useMyOffice();
  const officeName = office?.name ?? '';

  const titleMap: Record<string, { title: string; sub: string }> = {
    '/office-admin/dashboard':    { title: 'Office Dashboard',       sub: `${officeName} · Live operational view` },
    '/office-admin/counters':     { title: 'Counter Management',     sub: `${officeName} · Manage and monitor counters` },
    '/office-admin/analytics':    { title: 'Analytics',              sub: `${officeName} · Service performance` },
    '/office-admin/forecast':     { title: 'Congestion Forecast', sub: `${officeName} · Forecast for today` },
    '/office-admin/verification': { title: 'Verification Applications', sub: 'Review officer and admin role requests' },
    '/office-admin/officers':     { title: 'Officers',               sub: `${officeName} · Manage officers` },
  };
  const current = Object.entries(titleMap).find(([k]) => location.pathname.startsWith(k))?.[1];

  return (
    <AdminShell
      roleLabel="Office Admin"
      officeName={officeName}
      pageTitle={current?.title}
      pageSubtitle={current?.sub}
      sections={[{
        items: [
          { id: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard, route: '/office-admin/dashboard'    },
          { id: 'counters',     label: 'Counters',     icon: MonitorCheck,    route: '/office-admin/counters'     },
          { id: 'officers',     label: 'Officers',     icon: Users,           route: '/office-admin/officers'     },
          { id: 'analytics',   label: 'Analytics',    icon: BarChart2,       route: '/office-admin/analytics'    },
          { id: 'forecast',    label: 'Forecast',  icon: CloudLightning,  route: '/office-admin/forecast'     },
          { id: 'verification',label: 'Verification', icon: ShieldCheck,     route: '/office-admin/verification' },
        ],
      }]}
    />
  );
}
