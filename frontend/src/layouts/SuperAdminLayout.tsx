import { LayoutDashboard, Server, Users, Brain, ScrollText } from 'lucide-react';
import AdminShell from './AdminShell';

export default function SuperAdminLayout() {
  return (
    <AdminShell
      roleLabel="Super Admin"
      sections={[{
        items: [
          { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard, route: '/super-admin/dashboard' },
          { id: 'system',    label: 'System',     icon: Server,          route: '/super-admin/system' },
          { id: 'users',     label: 'Users',      icon: Users,           route: '/super-admin/users' },
          { id: 'models',    label: 'AI Models',  icon: Brain,           route: '/super-admin/models' },
          { id: 'audit',     label: 'Audit Logs', icon: ScrollText,      route: '/super-admin/audit' },
        ],
      }]}
    />
  );
}
