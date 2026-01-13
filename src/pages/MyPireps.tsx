import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plane, FileText } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Pirep {
  id: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  status: string;
  submitted_at: string;
  flight_time_hrs: number;
  flight_time_mins: number;
  passengers: number | null;
  landing_rate: number | null;
  fuel_used: number | null;
  xp_earned: number | null;
  money_earned: number | null;
  rejection_reason: string | null;
  aircraft: {
    name: string;
    type_code: string;
  };
}

export default function MyPireps() {
  const { user, loading } = useAuth();
  const [pireps, setPireps] = useState<Pirep[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPireps();
    }
  }, [user]);

  const fetchPireps = async () => {
    setIsLoading(true);
    
    const { data } = await supabase
      .from('pireps')
      .select(`
        id,
        flight_number,
        departure_airport,
        arrival_airport,
        status,
        submitted_at,
        flight_time_hrs,
        flight_time_mins,
        passengers,
        landing_rate,
        fuel_used,
        xp_earned,
        money_earned,
        rejection_reason,
        aircraft:aircraft(name, type_code)
      `)
      .eq('user_id', user!.id)
      .order('submitted_at', { ascending: false });

    if (data) {
      setPireps(data as unknown as Pirep[]);
    }
    
    setIsLoading(false);
  };

  if (loading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Plane className="h-8 w-8 animate-pulse text-va-gold" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const formatRub = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <SectionCard 
        title="My PIREPs" 
        icon={<FileText className="h-5 w-5 text-muted-foreground" />}
      >
        {pireps.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No PIREPs Yet</h3>
            <p className="text-muted-foreground">
              Complete flights and submit PIREPs to see them here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pireps.map((pirep) => (
              <div 
                key={pirep.id}
                className="p-4 bg-muted rounded-lg border border-border"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-lg font-bold">
                        {pirep.flight_number} • {pirep.departure_airport} → {pirep.arrival_airport}
                      </p>
                      <StatusBadge status={pirep.status as any} />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Aircraft</p>
                        <p className="font-medium">{pirep.aircraft?.type_code}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Flight Time</p>
                        <p className="font-medium">
                          {pirep.flight_time_hrs}h {pirep.flight_time_mins}m
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Landing Rate</p>
                        <p className="font-medium">
                          {pirep.landing_rate ? `${pirep.landing_rate} fpm` : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Submitted</p>
                        <p className="font-medium">
                          {new Date(pirep.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {pirep.status === 'approved' && (
                      <div className="flex gap-4 mt-3 pt-3 border-t border-border">
                        <p className="text-success">
                          +{pirep.xp_earned || 0} XP
                        </p>
                        <p className="text-va-gold">
                          {formatRub(Number(pirep.money_earned) || 0)}
                        </p>
                      </div>
                    )}

                    {pirep.status === 'rejected' && pirep.rejection_reason && (
                      <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                        <p className="text-sm text-destructive">
                          <strong>Rejection Reason:</strong> {pirep.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </DashboardLayout>
  );
}
