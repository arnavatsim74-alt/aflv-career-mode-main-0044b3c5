import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminFleetManagement } from '@/components/admin/AdminFleetManagement';
import { AdminGuard } from './AdminGuard';

export default function AdminFleetPage() {
  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Fleet Management</h1>
          <AdminFleetManagement />
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
