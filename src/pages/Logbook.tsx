import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plane, BookOpen, Search, Filter, Calendar, Clock, Map } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SectionCard } from '@/components/ui/section-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { FlightMap } from '@/components/logbook/FlightMap';

interface LogbookEntry {
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
  tail_number: string | null;
  aircraft: {
    name: string;
    type_code: string;
  };
}

export default function Logbook() {
  const { user, loading } = useAuth();
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<LogbookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [aircraftFilter, setAircraftFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchLogbook();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [entries, searchTerm, statusFilter, aircraftFilter]);

  const fetchLogbook = async () => {
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
        tail_number,
        aircraft:aircraft(name, type_code)
      `)
      .eq('user_id', user!.id)
      .eq('status', 'approved')
      .order('submitted_at', { ascending: false });

    if (data) {
      setEntries(data as unknown as LogbookEntry[]);
    }
    
    setIsLoading(false);
  };

  const applyFilters = () => {
    let result = [...entries];
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(entry => 
        entry.flight_number.toLowerCase().includes(term) ||
        entry.departure_airport.toLowerCase().includes(term) ||
        entry.arrival_airport.toLowerCase().includes(term) ||
        entry.aircraft?.type_code.toLowerCase().includes(term)
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(entry => entry.status === statusFilter);
    }
    
    // Aircraft filter
    if (aircraftFilter !== 'all') {
      result = result.filter(entry => entry.aircraft?.type_code === aircraftFilter);
    }
    
    setFilteredEntries(result);
  };

  const uniqueAircraft = [...new Set(entries.map(e => e.aircraft?.type_code).filter(Boolean))];
  
  // Stats
  const totalFlights = filteredEntries.length;
  const totalHours = filteredEntries.reduce((acc, e) => acc + Number(e.flight_time_hrs) + (e.flight_time_mins / 60), 0);
  const totalEarnings = filteredEntries.reduce((acc, e) => acc + (Number(e.money_earned) || 0), 0);

  if (loading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Plane className="h-8 w-8 animate-pulse text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Pilot Logbook
        </h1>
        <p className="text-muted-foreground">Your complete flight history</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-card-foreground">{totalFlights}</p>
          <p className="text-sm text-muted-foreground">Total Flights</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-card-foreground">{totalHours.toFixed(1)}h</p>
          <p className="text-sm text-muted-foreground">Flight Hours</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-success">{formatCurrency(totalEarnings)}</p>
          <p className="text-sm text-muted-foreground">Earnings</p>
        </div>
      </div>

      {/* Flight Map */}
      {entries.length > 0 && (
        <SectionCard title="Flight Routes" icon={<Map className="h-5 w-5 text-muted-foreground" />} className="mb-6">
          <FlightMap flights={entries.map(e => ({
            departure_airport: e.departure_airport,
            arrival_airport: e.arrival_airport,
            flight_number: e.flight_number,
          }))} />
        </SectionCard>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search flights, airports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={aircraftFilter} onValueChange={setAircraftFilter}>
          <SelectTrigger className="w-full md:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Aircraft" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Aircraft</SelectItem>
            {uniqueAircraft.map(ac => (
              <SelectItem key={ac} value={ac!}>{ac}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SectionCard title="Flight Log" icon={<BookOpen className="h-5 w-5 text-muted-foreground" />}>
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2 text-card-foreground">No Flights Found</h3>
            <p className="text-muted-foreground">
              {entries.length === 0 
                ? 'Complete flights and get them approved to build your logbook.'
                : 'Try adjusting your filters to see more results.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Date</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Flight</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Route</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Aircraft</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">Time</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">PAX</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">Landing</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">Earned</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(entry.submitted_at).toLocaleDateString('ru-RU')}
                      </div>
                    </td>
                    <td className="py-3 px-2 font-medium text-card-foreground">{entry.flight_number}</td>
                    <td className="py-3 px-2 text-card-foreground">
                      {entry.departure_airport} → {entry.arrival_airport}
                    </td>
                    <td className="py-3 px-2">
                      <span className="bg-muted px-2 py-0.5 rounded text-xs">
                        {entry.aircraft?.type_code}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1 text-info">
                        <Clock className="h-3 w-3" />
                        {Number(entry.flight_time_hrs).toFixed(0)}h {entry.flight_time_mins}m
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-card-foreground">
                      {entry.passengers || '-'}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={entry.landing_rate && Math.abs(entry.landing_rate) < 200 ? 'text-success' : 'text-card-foreground'}>
                        {entry.landing_rate ? `${entry.landing_rate} fpm` : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-success font-medium">
                      {formatCurrency(Number(entry.money_earned) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </DashboardLayout>
  );
}
