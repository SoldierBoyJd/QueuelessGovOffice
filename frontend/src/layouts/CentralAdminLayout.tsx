import { LayoutDashboard, Building2, AlertTriangle, BarChart2 } from 'lucide-react';
import AdminShell from './AdminShell';

export default function CentralAdminLayout() {
  return (
    <AdminShell
      roleLabel="Central Admin"
      sections={[{
        items: [
          { id: 'dashboard',  label: 'Overview',     icon: LayoutDashboard, route: '/central/dashboard' },
          { id: 'offices',    label: 'Offices',      icon: Building2,       route: '/central/offices' },
          { id: 'congestion', label: 'Congestion',   icon: AlertTriangle,   route: '/central/congestion' },
          { id: 'analytics',  label: 'Analytics',    icon: BarChart2,       route: '/central/analytics' },
        ],
      }]}
    />
  );
}
