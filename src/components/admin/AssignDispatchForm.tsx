import { useEffect, useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Aircraft {
  id: string;
  name: string;
  type_code: string;
  family: string;
}

interface LegInput {
  departure_airport: string;
  arrival_airport: string;
  flight_number: string;
  distance_nm: string;
  flight_time_hrs: string;
}

interface AssignDispatchFormProps {
  userId: string;
  callsign: string;
  requestId: string;
  onSuccess: () => void;
}

export function AssignDispatchForm({ userId, callsign, requestId, onSuccess }: AssignDispatchFormProps) {
  const { user } = useAuth();
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedAircraftId, setSelectedAircraftId] = useState('');
  const [tailNumber, setTailNumber] = useState('');
  const [legs, setLegs] = useState<LegInput[]>([{ 
    departure_airport: '', 
    arrival_airport: '', 
    flight_number: '',
    distance_nm: '',
    flight_time_hrs: ''
  }]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);

    const { data: aircraftData } = await supabase
      .from('aircraft')
      .select('*')
      .order('name');

    if (aircraftData) setAircraft(aircraftData);

    setIsLoading(false);
  };

  const addLeg = () => {
    setLegs([...legs, { 
      departure_airport: '', 
      arrival_airport: '', 
      flight_number: '',
      distance_nm: '',
      flight_time_hrs: ''
    }]);
  };

  const removeLeg = (index: number) => {
    if (legs.length > 1) {
      setLegs(legs.filter((_, i) => i !== index));
    }
  };

  const updateLeg = (index: number, field: keyof LegInput, value: string) => {
    const newLegs = [...legs];
    if (field === 'departure_airport' || field === 'arrival_airport' || field === 'flight_number') {
      newLegs[index] = { ...newLegs[index], [field]: value.toUpperCase() };
    } else {
      newLegs[index] = { ...newLegs[index], [field]: value };
    }
    setLegs(newLegs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAircraftId) {
      toast.error('Please select an aircraft');
      return;
    }

    if (legs.some(leg => !leg.departure_airport || !leg.arrival_airport)) {
      toast.error('Please enter departure and arrival airports for all legs');
      return;
    }

    setIsSaving(true);

    // Generate a dispatch group ID
    const dispatchGroupId = crypto.randomUUID();

    // First, create routes for each leg
    const routeInserts = legs.map((leg, index) => ({
      flight_number: leg.flight_number || `${callsign}-${index + 1}`,
      departure_airport: leg.departure_airport,
      arrival_airport: leg.arrival_airport,
      distance_nm: parseFloat(leg.distance_nm) || 0,
      estimated_time_hrs: parseFloat(leg.flight_time_hrs) || 0,
    }));

    const { data: createdRoutes, error: routesError } = await supabase
      .from('routes')
      .insert(routeInserts)
      .select();

    if (routesError || !createdRoutes) {
      toast.error('Failed to create routes: ' + (routesError?.message || 'Unknown error'));
      setIsSaving(false);
      return;
    }

    // Create dispatch legs with the new route IDs
    const legInserts = createdRoutes.map((route, index) => ({
      user_id: userId,
      route_id: route.id,
      aircraft_id: selectedAircraftId,
      callsign: callsign,
      tail_number: tailNumber || null,
      leg_number: index + 1,
      dispatch_group_id: dispatchGroupId,
      assigned_by: user!.id,
      status: 'assigned',
    }));

    const { error: legsError } = await supabase
      .from('dispatch_legs')
      .insert(legInserts);

    if (legsError) {
      toast.error('Failed to assign dispatch: ' + legsError.message);
      setIsSaving(false);
      return;
    }

    // Update career request status
    const { error: requestError } = await supabase
      .from('career_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user!.id,
      })
      .eq('id', requestId);

    if (requestError) {
      toast.error('Failed to update request status');
    } else {
      toast.success(`Dispatch assigned to ${callsign}!`);
      onSuccess();
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  const selectedAircraft = aircraft.find(a => a.id === selectedAircraftId);
  const totalLegs = legs.filter(leg => leg.departure_airport && leg.arrival_airport).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Aircraft Selection */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Aircraft *</Label>
          <Select value={selectedAircraftId} onValueChange={setSelectedAircraftId}>
            <SelectTrigger>
              <SelectValue placeholder="Select aircraft" />
            </SelectTrigger>
            <SelectContent>
              {aircraft.map((ac) => (
                <SelectItem key={ac.id} value={ac.id}>
                  {ac.name} ({ac.type_code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tail Number</Label>
          <Input
            value={tailNumber}
            onChange={(e) => setTailNumber(e.target.value.toUpperCase())}
            placeholder="VT-CIF"
          />
        </div>
      </div>

      {/* Legs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Flight Legs *</Label>
          <Button type="button" size="sm" variant="outline" onClick={addLeg} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Leg
          </Button>
        </div>

        {legs.map((leg, index) => (
          <div key={index} className="space-y-2 p-4 bg-secondary/30 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-primary">LEG {index + 1}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removeLeg(index)}
                disabled={legs.length === 1}
                className="text-destructive hover:text-destructive h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={leg.departure_airport}
                onChange={(e) => updateLeg(index, 'departure_airport', e.target.value)}
                placeholder="Departure (ICAO)"
                maxLength={4}
              />
              <Input
                value={leg.arrival_airport}
                onChange={(e) => updateLeg(index, 'arrival_airport', e.target.value)}
                placeholder="Arrival (ICAO)"
                maxLength={4}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={leg.flight_number}
                onChange={(e) => updateLeg(index, 'flight_number', e.target.value)}
                placeholder="Flight # (e.g. AFL001)"
              />
              <Input
                type="number"
                value={leg.distance_nm}
                onChange={(e) => updateLeg(index, 'distance_nm', e.target.value)}
                placeholder="Distance (NM)"
                min="0"
              />
              <Input
                type="number"
                step="0.1"
                value={leg.flight_time_hrs}
                onChange={(e) => updateLeg(index, 'flight_time_hrs', e.target.value)}
                placeholder="Flight Time (hrs)"
                min="0"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {totalLegs > 0 && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Legs</p>
            <p className="text-lg font-bold text-va-gold">{totalLegs}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Aircraft</p>
            <p className="text-lg font-bold text-va-gold">{selectedAircraft?.type_code || '-'}</p>
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-4 pt-4 border-t border-border">
        <Button type="submit" disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Assigning...' : 'Assign Dispatch'}
        </Button>
      </div>
    </form>
  );
}
