import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminRouteCatalog } from '@/components/admin/AdminRouteCatalog';
import { AdminGuard } from './AdminGuard';

export default function AdminRoutesPage() {
  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Route Import</h1>
          <AdminRouteCatalog />
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
