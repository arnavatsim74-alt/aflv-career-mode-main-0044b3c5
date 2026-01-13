import { useEffect, useState } from 'react';
import { Users, X, Check, Plane } from 'lucide-react';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CareerRequest {
  id: string;
  user_id: string;
  status: string;
  requested_at: string;
  profile: {
    name: string;
    callsign: string;
    rank: string;
  };
}

export function AdminCareerRequests() {
  const [requests, setRequests] = useState<CareerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    
    const { data } = await supabase
      .from('career_requests')
      .select(`
        id,
        user_id,
        status,
        requested_at
      `)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });

    if (data) {
      // Fetch profiles for each request
      const requestsWithProfiles = await Promise.all(
        data.map(async (req) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, callsign, rank')
            .eq('user_id', req.user_id)
            .single();
          
          return {
            ...req,
            profile: profileData || { name: 'Unknown', callsign: '---', rank: 'Cadet' },
          } as CareerRequest;
        })
      );
      
      setRequests(requestsWithProfiles);
    }
    
    setIsLoading(false);
  };

  const rejectRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('career_requests')
      .update({ 
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) {
      toast.error('Failed to reject request');
    } else {
      toast.success('Request rejected');
      fetchRequests();
    }
  };

  const autoAssignRequest = async (req: CareerRequest) => {
    setProcessingId(req.id);
    
    try {
      // First delete the pending request since auto-assign will create its own
      await supabase
        .from('career_requests')
        .delete()
        .eq('id', req.id);

      // Now trigger auto-assign for this user (we need to call as admin)
      // Since we can't impersonate, we'll create an approved request and legs directly
      const { error } = await supabase.functions.invoke('auto-assign-career-admin', {
        body: { userId: req.user_id },
      });

      if (error) throw error;

      toast.success(`vCAREER auto-assigned to ${req.profile.callsign}!`);
      fetchRequests();
    } catch (e: any) {
      toast.error(e?.message ?? 'Auto assignment failed');
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <SectionCard title="Career Requests" icon={<Users className="h-5 w-5" />}>
        <div className="flex items-center justify-center py-8">
          <Plane className="h-6 w-6 animate-pulse text-primary" />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard 
      title={`Career Requests (${requests.length})`} 
      icon={<Users className="h-5 w-5 text-muted-foreground" />}
    >
      {requests.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">No pending career requests</p>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div 
              key={req.id}
              className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border"
            >
              <div>
                <p className="font-medium">{req.profile.name}</p>
                <p className="text-sm text-primary">{req.profile.callsign}</p>
                <p className="text-xs text-muted-foreground">
                  Rank: {req.profile.rank} • Requested: {new Date(req.requested_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => rejectRequest(req.id)}
                  disabled={processingId === req.id}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                <Button 
                  size="sm" 
                  className="gap-2 bg-success hover:bg-success/90"
                  onClick={() => autoAssignRequest(req)}
                  disabled={processingId === req.id}
                >
                  <Check className="h-4 w-4" />
                  {processingId === req.id ? 'Assigning...' : 'Auto Assign'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
