import { useEffect, useState } from 'react';
import { Shield, Users } from 'lucide-react';
import { SectionCard } from '@/components/ui/section-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Member = {
  user_id: string;
  name: string;
  callsign: string;
  role: 'admin' | 'pilot';
};

export function AdminMembersPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const fetchMembers = async () => {
    setLoading(true);

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, name, callsign')
      .order('callsign', { ascending: true });

    if (profilesError) {
      toast.error(`Failed to load members: ${profilesError.message}`);
      setLoading(false);
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      toast.error(`Failed to load roles: ${rolesError.message}`);
      setLoading(false);
      return;
    }

    const roleMap = new Map<string, 'admin' | 'pilot'>();
    (roles ?? []).forEach((r) => {
      if (r.role === 'admin') {
        roleMap.set(r.user_id, 'admin');
      } else if (!roleMap.has(r.user_id)) {
        roleMap.set(r.user_id, 'pilot');
      }
    });

    const merged: Member[] = (profiles ?? []).map((p) => ({
      user_id: p.user_id,
      name: p.name,
      callsign: p.callsign,
      role: roleMap.get(p.user_id) ?? 'pilot',
    }));

    setMembers(merged);
    setLoading(false);
  };

  useEffect(() => {
    void fetchMembers();
  }, []);

  const setRole = async (userId: string, nextRole: 'admin' | 'pilot') => {
    setSavingUserId(userId);

    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      toast.error(`Failed to update role: ${deleteError.message}`);
      setSavingUserId(null);
      return;
    }

    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: nextRole });

    if (insertError) {
      toast.error(`Failed to assign role: ${insertError.message}`);
      setSavingUserId(null);
      return;
    }

    setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role: nextRole } : m)));
    toast.success('Member role updated');
    setSavingUserId(null);
  };

  return (
    <SectionCard title="Members Access" icon={<Users className="h-5 w-5 text-muted-foreground" />}>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading members...</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members found.</p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.user_id} className="flex items-center justify-between rounded border p-2">
              <div>
                <p className="font-medium">{member.callsign}</p>
                <p className="text-xs text-muted-foreground">{member.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={member.role}
                  onValueChange={(value: 'admin' | 'pilot') => void setRole(member.user_id, value)}
                  disabled={savingUserId === member.user_id}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pilot">Pilot</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
