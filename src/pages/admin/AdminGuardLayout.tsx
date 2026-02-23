import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Plane } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

interface AdminGuardLayoutProps {
  title: string;
  children: ReactNode;
}

export function AdminGuardLayout({ title, children }: AdminGuardLayoutProps) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Plane className="h-8 w-8 animate-pulse text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {children}
      </div>
    </DashboardLayout>
  );
}
