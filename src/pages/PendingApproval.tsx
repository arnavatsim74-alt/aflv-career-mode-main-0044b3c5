import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { Clock, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface RegistrationStatus {
  status: string;
  rejection_reason: string | null;
}

export default function PendingApproval() {
  const { user, profile, signOut, loading, refreshProfile } = useAuth();
  const [regStatus, setRegStatus] = useState<RegistrationStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const checkRegistrationStatus = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('registration_approvals')
      .select('status, rejection_reason')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setRegStatus(data);
    }
    setCheckingStatus(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      checkRegistrationStatus();
    }
  }, [user, checkRegistrationStatus]);

  // Poll for approval status every 5 seconds
  useEffect(() => {
    if (!user || profile?.is_approved) return;

    const interval = setInterval(async () => {
      await refreshProfile();
      await checkRegistrationStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [user, profile?.is_approved, refreshProfile, checkRegistrationStatus]);

  const handleRefresh = async () => {
    setCheckingStatus(true);
    await refreshProfile();
    await checkRegistrationStatus();
  };

  if (loading || checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Clock className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If approved, redirect to dashboard
  if (profile?.is_approved) {
    return <Navigate to="/dashboard" replace />;
  }

  const isRejected = regStatus?.status === 'rejected';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-xl text-center">
        <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${isRejected ? 'bg-destructive/10' : 'bg-warning/10'}`}>
          {isRejected ? (
            <XCircle className="h-8 w-8 text-destructive" />
          ) : (
            <Clock className="h-8 w-8 text-warning" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-card-foreground mb-2">
          {isRejected ? 'Application Rejected' : 'Application Pending'}
        </h1>

        {isRejected ? (
          <>
            <p className="text-muted-foreground mb-4">
              Unfortunately, your pilot application has been rejected.
            </p>
            {regStatus?.rejection_reason && (
              <div className="p-4 bg-destructive/10 rounded-lg mb-6">
                <p className="text-sm text-destructive font-medium">Reason:</p>
                <p className="text-sm text-card-foreground">{regStatus.rejection_reason}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground mb-6">
              Please contact administration if you believe this was an error.
            </p>
          </>
        ) : (
          <>
            <p className="text-muted-foreground mb-6">
              Your pilot application is being reviewed by our administration team. 
              You will be able to access the Operations Panel once approved.
            </p>
            <div className="flex items-center justify-center gap-2 p-4 bg-warning/10 rounded-lg mb-6">
              <AlertCircle className="h-5 w-5 text-warning" />
              <span className="text-sm text-warning">Awaiting admin approval</span>
            </div>
            <Button variant="outline" onClick={handleRefresh} className="w-full mb-3 gap-2">
              <RefreshCw className="h-4 w-4" />
              Check Status
            </Button>
          </>
        )}

        <Button variant="outline" onClick={signOut} className="w-full">
          Sign Out
        </Button>
      </div>

      <p className="relative z-10 mt-6 text-sm text-muted-foreground text-center">
        Aeroflot Virtual Operations
      </p>
    </div>
  );
}
