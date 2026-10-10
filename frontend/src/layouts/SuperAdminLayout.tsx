import { LayoutDashboard, Server, Users, Brain, ScrollText, Settings } from 'lucide-react';
import AdminShell from './AdminShell';
import { useLocation } from 'react-router-dom';

export default function SuperAdminLayout() {
  const location = useLocation();

  const titleMap: Record<string, { title: string; sub: string }> = {
    '/super-admin/dashboard': { title: 'Platform Overview',  sub: 'System health · AI models · Platform operations' },
    '/super-admin/system':    { title: 'System Health',      sub: 'Live component status and configuration'          },
    '/super-admin/users':     { title: 'User Management',    sub: 'All registered platform users'                    },
    '/super-admin/models':    { title: 'AI Models',          sub: 'Manage and monitor AI prediction models'          },
    '/super-admin/audit':     { title: 'Audit Logs',         sub: 'Platform activity and change history'             },
    '/super-admin/config':    { title: 'Configuration',      sub: 'Platform settings and integrations'               },
  };
  const current = Object.entries(titleMap).find(([k]) => location.pathname.startsWith(k))?.[1];

  return (
    <AdminShell
      roleLabel="Super Admin"
      pageTitle={current?.title}
      pageSubtitle={current?.sub}
      sections={[{
        items: [
          { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard, route: '/super-admin/dashboard' },
          { id: 'system',    label: 'System',     icon: Server,          route: '/super-admin/system'    },
          { id: 'users',     label: 'Users',      icon: Users,           route: '/super-admin/users'     },
          { id: 'models',    label: 'AI Models',  icon: Brain,           route: '/super-admin/models'    },
          { id: 'audit',     label: 'Audit Logs', icon: ScrollText,      route: '/super-admin/audit'     },
          { id: 'config',    label: 'Config',     icon: Settings,        route: '/super-admin/config'    },
        ],
      }]}
    />
  );
}
