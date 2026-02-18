import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminPendingPireps } from '@/components/admin/AdminPendingPireps';
import { AdminGuard } from './AdminGuard';

export default function AdminPirepsPage() {
  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Pending PIREPs</h1>
          <AdminPendingPireps />
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
