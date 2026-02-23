import { AdminFleetManagement } from '@/components/admin/AdminFleetManagement';
import { AdminGuardLayout } from './AdminGuardLayout';

export default function AdminFleetPage() {
  return (
    <AdminGuardLayout title="Admin Fleet Tracker">
      <AdminFleetManagement />
    </AdminGuardLayout>
  );
}
