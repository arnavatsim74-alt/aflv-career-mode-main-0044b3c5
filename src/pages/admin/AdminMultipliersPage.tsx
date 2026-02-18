import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminFlightHourMultipliers } from '@/components/admin/AdminFlightHourMultipliers';
import { AdminGuard } from './AdminGuard';

export default function AdminMultipliersPage() {
  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Flight Hour Multipliers</h1>
          <AdminFlightHourMultipliers />
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
