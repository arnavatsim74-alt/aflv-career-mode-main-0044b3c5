import { AdminMembersPanel } from '@/components/admin/AdminMembersPanel';
import { AdminGuardLayout } from './AdminGuardLayout';

export default function AdminMembersPage() {
  return (
    <AdminGuardLayout title="Members Access Panel">
      <AdminMembersPanel />
    </AdminGuardLayout>
  );
}
