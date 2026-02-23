import { AdminFlightHourMultipliers } from '@/components/admin/AdminFlightHourMultipliers';
import { AdminGuardLayout } from './AdminGuardLayout';

export default function AdminMultipliersPage() {
  return (
    <AdminGuardLayout title="Admin Multipliers">
      <AdminFlightHourMultipliers />
    </AdminGuardLayout>
  );
}
