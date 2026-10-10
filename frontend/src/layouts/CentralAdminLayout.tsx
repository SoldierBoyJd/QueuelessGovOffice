import { LayoutDashboard, Building2, AlertTriangle, BarChart2, Map } from 'lucide-react';
import AdminShell from './AdminShell';
import { useLocation } from 'react-router-dom';

export default function CentralAdminLayout() {
  const location = useLocation();

  const titleMap: Record<string, { title: string; sub: string }> = {
    '/central/dashboard':  { title: 'National Overview',         sub: 'Live government service intelligence · Demo data' },
    '/central/offices':    { title: 'Office Directory',          sub: 'All monitored government offices'                },
    '/central/congestion': { title: 'Congestion Intelligence',   sub: 'Real-time pressure across government offices'    },
    '/central/analytics':  { title: 'National Analytics',        sub: 'Aggregate service performance'                   },
    '/central/map':        { title: 'Live Map',                  sub: 'Real-time office congestion across India'        },
  };
  const current = Object.entries(titleMap).find(([k]) => location.pathname.startsWith(k))?.[1];

  return (
    <AdminShell
      roleLabel="Central Admin"
      pageTitle={current?.title}
      pageSubtitle={current?.sub}
      sections={[{
        items: [
          { id: 'dashboard',  label: 'Overview',     icon: LayoutDashboard, route: '/central/dashboard'  },
          { id: 'offices',    label: 'Offices',      icon: Building2,       route: '/central/offices'    },
          { id: 'congestion', label: 'Congestion',   icon: AlertTriangle,   route: '/central/congestion' },
          { id: 'analytics',  label: 'Analytics',    icon: BarChart2,       route: '/central/analytics'  },
          { id: 'map',        label: 'Live Map',     icon: Map,             route: '/central/map'        },
        ],
      }]}
    />
  );
}
