import { useState, useEffect } from 'react';
import { Plane, UserPlus, Check, X, Mail, Tag, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/section-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Registration {
  id: string;
  user_id: string;
  email: string;
  name: string;
  callsign: string;
  base_airport: string;
  status: string;
  submitted_at: string;
}

export function AdminRegistrations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    const { data } = await supabase
      .from('registration_approvals')
      .select('*')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });

    if (data) {
      setRegistrations(data);
    }
    setLoading(false);
  };

  const handleApprove = async (registration: Registration) => {
    // Update registration status
    const { error: regError } = await supabase
      .from('registration_approvals')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user!.id,
      })
      .eq('id', registration.id);

    if (regError) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: regError.message,
      });
      return;
    }

    // Ensure profile exists + mark approved (upsert fixes missing profile rows)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: registration.user_id,
          name: registration.name,
          callsign: registration.callsign,
          base_airport: registration.base_airport,
          is_approved: true,
        },
        { onConflict: 'user_id' }
      );

    if (profileError) {
      toast({
        variant: 'destructive',
        title: 'Error updating profile',
        description: profileError.message,
      });
      return;
    }

    // Ensure pilot role exists
    await supabase
      .from('user_roles')
      .upsert(
        { user_id: registration.user_id, role: 'pilot' },
        { onConflict: 'user_id,role' }
      );

    toast({
      title: 'Registration Approved',
      description: `${registration.callsign} has been approved and can now log in.`,
    });

    fetchRegistrations();
  };

  const openRejectDialog = (registration: Registration) => {
    setSelectedRegistration(registration);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedRegistration) return;

    const { error } = await supabase
      .from('registration_approvals')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user!.id,
        rejection_reason: rejectionReason || null,
      })
      .eq('id', selectedRegistration.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      return;
    }

    toast({
      title: 'Registration Rejected',
      description: `${selectedRegistration.callsign}'s registration has been rejected.`,
    });

    setRejectDialogOpen(false);
    setSelectedRegistration(null);
    fetchRegistrations();
  };

  if (loading) {
    return (
      <SectionCard title="Pilot Applications" badge={0}>
        <div className="flex items-center justify-center h-24">
          <Plane className="h-6 w-6 animate-pulse text-primary" />
        </div>
      </SectionCard>
    );
  }

  return (
    <>
      <SectionCard 
        title="Pilot Applications" 
        badge={registrations.length}
        icon={<UserPlus className="h-5 w-5 text-muted-foreground" />}
      >
        {registrations.length === 0 ? (
          <p className="text-muted-foreground text-sm">No pending applications</p>
        ) : (
          <div className="space-y-3">
            {registrations.map((reg) => (
              <div key={reg.id} className="p-4 bg-secondary/50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="font-medium text-card-foreground">{reg.name}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        <span>{reg.callsign}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{reg.email}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{reg.base_airport}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Applied: {new Date(reg.submitted_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openRejectDialog(reg)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleApprove(reg)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Rejecting application for <strong>{selectedRegistration?.callsign}</strong>
            </p>
            <div className="space-y-2">
              <Label>Rejection Reason (optional)</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
