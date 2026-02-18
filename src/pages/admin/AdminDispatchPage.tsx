import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminCareerRequests } from '@/components/admin/AdminCareerRequests';
import { AdminGuard } from './AdminGuard';

export default function AdminDispatchPage() {
  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Career Dispatch Assignment</h1>
          <AdminCareerRequests />
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
