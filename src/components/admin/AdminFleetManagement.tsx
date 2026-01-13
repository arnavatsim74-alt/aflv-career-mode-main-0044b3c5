import { useState, useEffect } from "react";
import { Plane, Wrench, RefreshCw } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FleetAircraft {
  id: string;
  tail_number: string;
  status: 'idle' | 'in_flight' | 'maintenance';
  current_location: string;
  total_flights: number;
  total_hours: number;
  aircraft: {
    type_code: string;
    name: string;
  };
  assigned_to: string | null;
  profile?: {
    callsign: string;
    name: string;
  } | null;
}

export function AdminFleetManagement() {
  const [fleet, setFleet] = useState<FleetAircraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchFleet();
  }, []);

  const fetchFleet = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('virtual_fleet')
      .select(`
        id,
        tail_number,
        status,
        current_location,
        total_flights,
        total_hours,
        assigned_to,
        aircraft:aircraft(type_code, name)
      `)
      .order('tail_number');

    if (!error && data) {
      // Fetch profiles for assigned pilots
      const fleetWithProfiles = await Promise.all(
        data.map(async (aircraft) => {
          if (aircraft.assigned_to) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('callsign, name')
              .eq('user_id', aircraft.assigned_to)
              .single();
            return { ...aircraft, profile: profileData } as FleetAircraft;
          }
          return { ...aircraft, profile: null } as FleetAircraft;
        })
      );
      setFleet(fleetWithProfiles);
    }
    
    setIsLoading(false);
  };

  const updateStatus = async (aircraftId: string, newStatus: 'idle' | 'in_flight' | 'maintenance') => {
    setUpdatingId(aircraftId);
    
    const { error } = await supabase
      .from('virtual_fleet')
      .update({ status: newStatus })
      .eq('id', aircraftId);

    if (error) {
      toast.error('Failed to update aircraft status');
    } else {
      toast.success(`Aircraft status updated to ${newStatus}`);
      fetchFleet();
    }
    
    setUpdatingId(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'text-success';
      case 'in_flight': return 'text-primary';
      case 'maintenance': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'idle': return 'bg-success';
      case 'in_flight': return 'bg-primary';
      case 'maintenance': return 'bg-warning';
      default: return 'bg-muted';
    }
  };

  if (isLoading) {
    return (
      <SectionCard title="Fleet Management" icon={<Plane className="h-5 w-5 text-muted-foreground" />}>
        <div className="flex items-center justify-center py-8">
          <Plane className="h-6 w-6 animate-pulse text-primary" />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard 
      title="Fleet Management" 
      icon={<Plane className="h-5 w-5 text-muted-foreground" />}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Manage aircraft status. Aircraft will auto-enter maintenance after every 3 flights.
        </p>
        <Button variant="outline" size="sm" onClick={fetchFleet} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-primary">Tail Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Flights</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fleet.map((aircraft) => (
              <TableRow key={aircraft.id}>
                <TableCell className="font-medium text-primary">
                  {aircraft.tail_number}
                </TableCell>
                <TableCell>{aircraft.aircraft?.type_code || '-'}</TableCell>
                <TableCell>{aircraft.current_location}</TableCell>
                <TableCell>{aircraft.total_flights}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusDot(aircraft.status)}`} />
                    <span className={`capitalize ${getStatusColor(aircraft.status)}`}>
                      {aircraft.status === 'in_flight' ? 'In Flight' : aircraft.status}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {aircraft.profile ? (
                    <span className="text-foreground">
                      {aircraft.profile.callsign} ({aircraft.profile.name})
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={aircraft.status}
                    onValueChange={(value) => updateStatus(aircraft.id, value as 'idle' | 'in_flight' | 'maintenance')}
                    disabled={updatingId === aircraft.id}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idle">Idle</SelectItem>
                      <SelectItem value="in_flight">In Flight</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wrench className="h-4 w-4" />
          <span>Aircraft enter 2-hour maintenance after every 3 flights, then return to idle automatically.</span>
        </div>
      </div>
    </SectionCard>
  );
}
