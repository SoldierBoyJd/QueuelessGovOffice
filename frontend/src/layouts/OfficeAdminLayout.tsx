import { LayoutDashboard, MonitorCheck, BarChart2, CloudLightning, ShieldCheck } from 'lucide-react';
import AdminShell from './AdminShell';

export default function OfficeAdminLayout() {
  return (
    <AdminShell
      roleLabel="Office Admin"
      officeName="Rajkot District Office"
      sections={[{
        items: [
          { id: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard, route: '/office-admin/dashboard' },
          { id: 'counters',     label: 'Counters',     icon: MonitorCheck,    route: '/office-admin/counters' },
          { id: 'analytics',   label: 'Analytics',    icon: BarChart2,       route: '/office-admin/analytics' },
          { id: 'forecast',    label: 'AI Forecast',  icon: CloudLightning,  route: '/office-admin/forecast' },
          { id: 'verification',label: 'Verification', icon: ShieldCheck,     route: '/office-admin/verification' },
        ],
      }]}
    />
  );
}
