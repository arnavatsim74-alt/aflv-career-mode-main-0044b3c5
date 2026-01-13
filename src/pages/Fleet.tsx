import { Navigate } from 'react-router-dom';
import { Plane } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VirtualFleetTracker } from '@/components/fleet/VirtualFleetTracker';
import { useAuth } from '@/hooks/useAuth';

export default function Fleet() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Plane className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  
  if (profile && !profile.is_approved) {
    return <Navigate to="/pending-approval" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Virtual Fleet</h1>
          <p className="text-muted-foreground">Track all aircraft in the Aeroflot Virtual fleet</p>
        </div>
        
        <VirtualFleetTracker />
      </div>
    </DashboardLayout>
  );
}
