import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminRegistrations } from '@/components/admin/AdminRegistrations';
import { AdminGuard } from './AdminGuard';

export default function AdminRegistrationsPage() {
  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Pilot Registrations</h1>
          <AdminRegistrations />
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
