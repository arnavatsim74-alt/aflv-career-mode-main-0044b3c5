import { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import { SectionCard } from '@/components/ui/section-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type Rule = {
  id: string;
  name: string;
  min_hours: number;
  max_hours: number | null;
  multiplier: number;
  is_active: boolean;
};

export function AdminFlightHourMultipliers() {
  const { user } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [name, setName] = useState('');
  const [minHours, setMinHours] = useState('0');
  const [maxHours, setMaxHours] = useState('');
  const [multiplier, setMultiplier] = useState('1');
  const [loading, setLoading] = useState(false);

  const loadRules = async () => {
    const { data, error } = await supabase
      .from('flight_hour_multipliers')
      .select('id, name, min_hours, max_hours, multiplier, is_active')
      .order('min_hours', { ascending: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    setRules((data ?? []) as Rule[]);
  };

  useEffect(() => {
    void loadRules();
  }, []);

  const createRule = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from('flight_hour_multipliers').insert({
      name,
      min_hours: Number(minHours),
      max_hours: maxHours ? Number(maxHours) : null,
      multiplier: Number(multiplier),
      is_active: true,
      created_by: user.id,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setName('');
    setMinHours('0');
    setMaxHours('');
    setMultiplier('1');
    toast.success('Flight hour multiplier created');
    void loadRules();
  };

  const removeRule = async (id: string) => {
    const { error } = await supabase.from('flight_hour_multipliers').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Flight hour multiplier removed');
    void loadRules();
  };

  return (
    <SectionCard title="Flight Hour Multipliers" icon={<Gauge className="h-5 w-5 text-muted-foreground" />}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <Input placeholder="Rule name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Min hours" type="number" value={minHours} onChange={(e) => setMinHours(e.target.value)} />
          <Input placeholder="Max hours (optional)" type="number" value={maxHours} onChange={(e) => setMaxHours(e.target.value)} />
          <Input placeholder="Multiplier" type="number" step="0.01" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} />
          <Button onClick={createRule} disabled={loading || !name}>Add Rule</Button>
        </div>

        <div className="space-y-2">
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No flight-hour rules configured.</p>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <span>
                  {rule.name}: {rule.min_hours}h - {rule.max_hours ?? '∞'}h → {rule.multiplier}x
                </span>
                <Button variant="destructive" size="sm" onClick={() => removeRule(rule.id)}>Remove</Button>
              </div>
            ))
          )}
        </div>
      </div>
    </SectionCard>
  );
}
