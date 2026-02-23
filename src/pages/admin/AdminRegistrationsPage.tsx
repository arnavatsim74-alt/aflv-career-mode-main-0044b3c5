import { AdminRegistrations } from '@/components/admin/AdminRegistrations';
import { AdminGuardLayout } from './AdminGuardLayout';

export default function AdminRegistrationsPage() {
  return (
    <AdminGuardLayout title="Admin Registrations">
      <AdminRegistrations />
    </AdminGuardLayout>
  );
}
