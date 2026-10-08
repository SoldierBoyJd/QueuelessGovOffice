import { LayoutDashboard, ListOrdered } from 'lucide-react';
import AdminShell from './AdminShell';
import { useAuthStore } from '../stores/authStore';

export default function OfficerLayout() {
  const { user } = useAuthStore();
  return (
    <AdminShell
      roleLabel="Officer"
      officeName={user?.officeId ? 'Rajkot District Office' : undefined}
      sections={[{
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, route: '/officer/dashboard' },
          { id: 'queue', label: 'Queue', icon: ListOrdered, route: '/officer/dashboard' },
        ],
      }]}
    />
  );
}
