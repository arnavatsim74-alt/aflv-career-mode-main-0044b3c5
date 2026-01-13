import { useEffect, useState } from 'react';
import { Plane, Search } from 'lucide-react';
import { SectionCard } from '@/components/ui/section-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

interface FleetAircraft {
  id: string;
  tail_number: string;
  livery: string;
  current_location: string;
  status: 'idle' | 'in_flight' | 'maintenance';
  total_hours: number;
  total_flights: number;
  assigned_to: string | null;
  aircraft: {
    type_code: string;
    name: string;
    family: string;
  };
  profile?: {
    callsign: string;
    name: string;
  } | null;
}

export function VirtualFleetTracker() {
  const [fleet, setFleet] = useState<FleetAircraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

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
        livery,
        current_location,
        status,
        total_hours,
        total_flights,
        assigned_to,
        aircraft:aircraft(type_code, name, family)
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

  // Get unique aircraft types
  const aircraftTypes = [...new Set(fleet.map(f => f.aircraft?.type_code).filter(Boolean))];

  // Filter fleet
  const filteredFleet = fleet.filter(f => {
    const matchesSearch = searchTerm === '' || 
      f.tail_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.current_location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || f.aircraft?.type_code === filterType;
    const matchesStatus = filterStatus === 'all' || f.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate stats
  const totalAircraft = fleet.length;
  const idleCount = fleet.filter(f => f.status === 'idle').length;
  const inFlightCount = fleet.filter(f => f.status === 'in_flight').length;
  const maintenanceCount = fleet.filter(f => f.status === 'maintenance').length;

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
      <SectionCard title="Virtual Fleet Tracker" icon={<Plane className="h-5 w-5" />}>
        <div className="flex items-center justify-center py-12">
          <Plane className="h-8 w-8 animate-pulse text-primary" />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard 
      title="Virtual Fleet Tracker" 
      icon={<Plane className="h-5 w-5 text-muted-foreground" />}
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-secondary/50 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground">Total Aircraft</p>
          <p className="text-2xl font-bold text-card-foreground">{totalAircraft}</p>
        </div>
        <div className="p-4 bg-success/10 rounded-xl border border-success/30">
          <p className="text-sm text-success">Idle</p>
          <p className="text-2xl font-bold text-success">{idleCount}</p>
        </div>
        <div className="p-4 bg-primary/10 rounded-xl border border-primary/30">
          <p className="text-sm text-primary">In Flight</p>
          <p className="text-2xl font-bold text-primary">{inFlightCount}</p>
        </div>
        <div className="p-4 bg-warning/10 rounded-xl border border-warning/30">
          <p className="text-sm text-warning">Maintenance</p>
          <p className="text-2xl font-bold text-warning">{maintenanceCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Filter by Type</label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {aircraftTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Filter by Status</label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="in_flight">In Flight</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tail, location..."
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-primary">Tail Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Livery</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="text-right">Total Hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFleet.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No aircraft found matching your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredFleet.map((aircraft) => (
                <TableRow key={aircraft.id}>
                  <TableCell className="font-medium text-primary">
                    {aircraft.tail_number}
                  </TableCell>
                  <TableCell>{aircraft.aircraft?.type_code || '-'}</TableCell>
                  <TableCell>{aircraft.livery}</TableCell>
                  <TableCell>{aircraft.current_location}</TableCell>
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
                        {aircraft.profile.callsign}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {aircraft.total_hours.toFixed(1)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground text-center pt-4 border-t border-border">
        Showing {filteredFleet.length} of {totalAircraft} aircraft
      </div>
    </SectionCard>
  );
}
