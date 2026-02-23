import { AdminPendingPireps } from '@/components/admin/AdminPendingPireps';
import { AdminGuardLayout } from './AdminGuardLayout';

export default function AdminPirepsPage() {
  return (
    <AdminGuardLayout title="Admin PIREP Review">
      <AdminPendingPireps />
    </AdminGuardLayout>
  );
}
