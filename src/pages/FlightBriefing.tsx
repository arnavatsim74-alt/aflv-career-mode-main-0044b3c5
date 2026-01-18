import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plane, ArrowLeft, RefreshCw, Map, FileText, ExternalLink, Search, Send, Info, Download } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useSimBriefOFP, OFPData } from '@/hooks/useSimBriefOFP';
import { IFAirportCard } from '@/components/aviation/IFAirportCard';
import { ATISCard } from '@/components/aviation/ATISCard';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

const AIRCRAFT_TYPES = [
  { code: 'A20N', name: 'Airbus A320neo' },
  { code: 'A21N', name: 'Airbus A321neo' },
  { code: 'A320', name: 'Airbus A320' },
  { code: 'A321', name: 'Airbus A321' },
  { code: 'A332', name: 'Airbus A330-200' },
  { code: 'A333', name: 'Airbus A330-300' },
  { code: 'A339', name: 'Airbus A330-900neo' },
  { code: 'A359', name: 'Airbus A350-900' },
  { code: 'A35K', name: 'Airbus A350-1000' },
  { code: 'B738', name: 'Boeing 737-800' },
  { code: 'B739', name: 'Boeing 737-900' },
  { code: 'B77L', name: 'Boeing 777-200LR' },
  { code: 'B77W', name: 'Boeing 777-300ER' },
  { code: 'B78X', name: 'Boeing 787-10' },
  { code: 'B789', name: 'Boeing 787-9' },
  { code: 'B788', name: 'Boeing 787-8' },
];

export default function FlightBriefing() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { ofpData, loading, error, fetchOFP, generateOFP } = useSimBriefOFP();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Manual input form
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [aircraftType, setAircraftType] = useState('A320');
  const [flightNumber, setFlightNumber] = useState('');
  const [passengers, setPassengers] = useState('');
  const [cargo, setCargo] = useState('');
  
  const simbriefPid = profile?.simbrief_pid;

  if (authLoading) {
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

  const handleFetchRecentFPL = async () => {
    if (!simbriefPid) return;
    await fetchOFP(simbriefPid);
  };

  const handleGenerateOFP = async () => {
    if (!origin || !destination || !aircraftType) return;
    
    await generateOFP({
      airline: 'AFL',
      fltnum: flightNumber || '001',
      orig: origin.toUpperCase(),
      dest: destination.toUpperCase(),
      type: aircraftType,
      pax: passengers ? parseInt(passengers) : undefined,
      cargo: cargo ? parseInt(cargo) : undefined,
    });

    // After generation, fetch the latest OFP
    if (simbriefPid) {
      // Wait a bit for SimBrief to process
      setTimeout(() => fetchOFP(simbriefPid), 3000);
    }
  };

  const formatTime = (seconds: string | null) => {
    if (!seconds) return 'N/A';
    const mins = parseInt(seconds) / 60;
    const hrs = Math.floor(mins / 60);
    const remainingMins = Math.round(mins % 60);
    return `${hrs}h ${remainingMins}m`;
  };

  const formatWeight = (kg: string | null) => {
    if (!kg) return 'N/A';
    return `${parseInt(kg).toLocaleString()} kg`;
  };

  const formatLegTime = (seconds: string): string => {
    if (!seconds) return '0h 0m';
    const totalMins = parseInt(seconds) / 60;
    const hrs = Math.floor(totalMins / 60);
    const mins = Math.round(totalMins % 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/dispatch')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dispatch
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Flight Briefing
            </h1>
            <p className="text-sm text-muted-foreground">
              Create or fetch your flight plan
            </p>
          </div>
        </div>
        {simbriefPid && (
          <Button variant="outline" size="sm" onClick={handleFetchRecentFPL} disabled={loading} className="gap-2">
            <Download className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Fetch Recent FPL
          </Button>
        )}
      </div>

      {/* Manual Input Form */}
      {!ofpData && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-warning rounded-full" />
            <h3 className="text-lg font-semibold text-foreground">Flight Plan Details</h3>
          </div>
          
          {!simbriefPid && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-warning">
                <Info className="h-4 w-4" />
                <p className="text-sm">Add your SimBrief PID in your profile to use flight planning features.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="origin">Origin (ICAO) *</Label>
              <Input
                id="origin"
                placeholder="e.g., UUEE"
                value={origin}
                onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                maxLength={4}
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Destination (ICAO) *</Label>
              <Input
                id="destination"
                placeholder="e.g., LFPG"
                value={destination}
                onChange={(e) => setDestination(e.target.value.toUpperCase())}
                maxLength={4}
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aircraft">Aircraft Type *</Label>
              <Select value={aircraftType} onValueChange={setAircraftType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select aircraft" />
                </SelectTrigger>
                <SelectContent>
                  {AIRCRAFT_TYPES.map((ac) => (
                    <SelectItem key={ac.code} value={ac.code}>
                      {ac.code} - {ac.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="flightNumber">Flight Number</Label>
              <Input
                id="flightNumber"
                placeholder="e.g., 1234"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passengers">Passengers</Label>
              <Input
                id="passengers"
                type="number"
                placeholder="e.g., 150"
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo (kg)</Label>
              <Input
                id="cargo"
                type="number"
                placeholder="e.g., 5000"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={handleGenerateOFP} 
              disabled={!origin || !destination || !simbriefPid || loading}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Generate OFP
            </Button>
            {simbriefPid && (
              <Button variant="outline" onClick={handleFetchRecentFPL} disabled={loading} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Fetch Latest OFP
              </Button>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive mb-6">
          {error}
        </div>
      )}

      {ofpData && (
        <>
          {/* Flight Summary Header */}
          <div className="bg-gradient-to-r from-card to-muted/50 border border-border rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Flight Plan Loaded</h3>
              <Button variant="ghost" size="sm" onClick={handleFetchRecentFPL} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase">Flight</p>
                <p className="font-bold text-lg text-foreground">{ofpData.atc.callsign || ofpData.general.flight_number}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase">Route</p>
                <p className="font-bold text-lg text-foreground">
                  {ofpData.origin.icao_code} → {ofpData.destination.icao_code}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase">Aircraft</p>
                <p className="font-bold text-lg text-foreground">{ofpData.aircraft.icaocode}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase">Time</p>
                <p className="font-bold text-lg text-foreground">{formatTime(ofpData.times.est_time_enroute)}</p>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 mb-6 bg-muted/50 h-auto">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="map" className="text-xs">Map</TabsTrigger>
              <TabsTrigger value="route" className="text-xs">Route</TabsTrigger>
              <TabsTrigger value="fuel" className="text-xs">Fuel & Weights</TabsTrigger>
              <TabsTrigger value="weather" className="text-xs">Weather</TabsTrigger>
              <TabsTrigger value="navlog" className="text-xs">Nav Log</TabsTrigger>
              <TabsTrigger value="airports" className="text-xs">Airports</TabsTrigger>
              <TabsTrigger value="atis" className="text-xs">Live ATIS</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Flight Information */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-warning rounded-full" />
                    <h3 className="text-lg font-semibold text-foreground">Flight Information</h3>
                  </div>
                  <div className="space-y-3">
                    <DataRow label="Departure" value={`${ofpData.origin.icao_code} - ${ofpData.origin.name}`} />
                    <DataRow label="Arrival" value={`${ofpData.destination.icao_code} - ${ofpData.destination.name}`} />
                    <DataRow label="Alternate" value={ofpData.alternate.icao_code || 'N/A'} />
                    <DataRow label="Distance" value={`${ofpData.general.air_distance} NM`} />
                    <DataRow label="Flight Time" value={formatTime(ofpData.times.est_time_enroute)} />
                    <DataRow label="Departure Runway" value={ofpData.origin.plan_rwy || 'N/A'} />
                    <DataRow label="Arrival Runway" value={ofpData.destination.plan_rwy || 'N/A'} />
                  </div>
                </div>

                {/* Performance Data */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-warning rounded-full" />
                    <h3 className="text-lg font-semibold text-foreground">Performance Data</h3>
                  </div>
                  <div className="space-y-3">
                    <DataRow label="Cruise Altitude" value={`FL${ofpData.general.initial_altitude}`} />
                    <DataRow label="Aircraft Type" value={ofpData.aircraft.name} />
                    <DataRow label="Cost Index" value={ofpData.general.costindex || 'N/A'} />
                    <DataRow label="Cruise Speed" value={`M${ofpData.general.cruise_mach} / ${ofpData.general.cruise_tas} kts`} />
                    <DataRow label="Climb Profile" value={ofpData.general.climb_profile || 'N/A'} />
                    <DataRow label="Descent Profile" value={ofpData.general.descent_profile || 'N/A'} />
                  </div>
                </div>
              </div>

              {/* ATC Flight Plan */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-warning rounded-full" />
                  <h3 className="text-lg font-semibold text-foreground">ATC Flight Plan</h3>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs break-all whitespace-pre-wrap">
                  {ofpData.atc.flightplan_text || 'No ATC flight plan data'}
                </div>
              </div>
            </TabsContent>

            {/* Map Tab */}
            <TabsContent value="map" className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-warning rounded-full" />
                  <h3 className="text-lg font-semibold text-foreground">Flight Route Maps</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ofpData.images.maps.map((map, idx) => (
                    <div key={idx} className="bg-muted/50 rounded-lg overflow-hidden">
                      <div className="p-2 border-b border-border">
                        <p className="text-sm font-medium text-foreground">{map.name}</p>
                      </div>
                      <img
                        src={map.fullUrl}
                        alt={map.name}
                        className="w-full h-auto"
                        loading="lazy"
                      />
                      <div className="p-2">
                        <Button variant="ghost" size="sm" className="w-full" onClick={() => window.open(map.fullUrl, '_blank')}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Full Size
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {ofpData.links.skyvector && (
                  <div className="mt-4">
                    <Button variant="outline" onClick={() => window.open(ofpData.links.skyvector, '_blank')}>
                      <Map className="h-4 w-4 mr-2" />
                      View on SkyVector
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Route Tab */}
            <TabsContent value="route" className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-warning rounded-full" />
                  <h3 className="text-lg font-semibold text-foreground">Flight Plan Route</h3>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm break-all border-l-4 border-warning">
                  {ofpData.general.route || 'No route data'}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-warning rounded-full" />
                  <h3 className="text-lg font-semibold text-foreground">Route Details</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <DataBox label="Departure SID" value={ofpData.general.sid_ident || 'N/A'} />
                  <DataBox label="Arrival STAR" value={ofpData.general.star_ident || 'N/A'} />
                  <DataBox label="Air Distance" value={`${ofpData.general.air_distance} NM`} />
                  <DataBox label="Great Circle Distance" value={`${ofpData.general.gc_distance} NM`} />
                </div>
              </div>
            </TabsContent>

            {/* Fuel & Weights Tab */}
            <TabsContent value="fuel" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Fuel Planning */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-warning rounded-full" />
                    <h3 className="text-lg font-semibold text-foreground">Fuel Planning</h3>
                  </div>
                  <div className="space-y-3">
                    <DataRow label="Trip Fuel" value={formatWeight(ofpData.fuel.enroute_burn)} />
                    <DataRow label="Contingency" value={formatWeight(ofpData.fuel.contingency)} />
                    <DataRow label="Alternate" value={formatWeight(ofpData.fuel.alternate_burn)} />
                    <DataRow label="Reserve" value={formatWeight(ofpData.fuel.reserve)} />
                    <DataRow label="Extra" value={formatWeight(ofpData.fuel.extra)} />
                    <DataRow label="Taxi" value={formatWeight(ofpData.fuel.taxi)} />
                    <div className="pt-3 border-t border-border">
                      <DataRow label="Block Fuel" value={formatWeight(ofpData.fuel.plan_ramp)} highlight />
                    </div>
                    <DataRow label="Avg Fuel Flow" value={`${ofpData.fuel.avg_fuel_flow} kg/hr`} />
                  </div>
                </div>

                {/* Weights */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-warning rounded-full" />
                    <h3 className="text-lg font-semibold text-foreground">Weight Planning</h3>
                  </div>
                  <div className="space-y-3">
                    <DataRow label="OEW" value={formatWeight(ofpData.weights.oew)} />
                    <DataRow label="Passengers" value={ofpData.weights.pax_count || 'N/A'} />
                    <DataRow label="Cargo" value={formatWeight(ofpData.weights.cargo)} />
                    <DataRow label="Payload" value={formatWeight(ofpData.weights.payload)} />
                    <div className="pt-3 border-t border-border">
                      <DataRow label="Est ZFW" value={formatWeight(ofpData.weights.est_zfw)} />
                      <DataRow label="Max ZFW" value={formatWeight(ofpData.weights.max_zfw)} muted />
                    </div>
                    <div className="pt-3 border-t border-border">
                      <DataRow label="Est TOW" value={formatWeight(ofpData.weights.est_tow)} highlight />
                      <DataRow label="Max TOW" value={formatWeight(ofpData.weights.max_tow)} muted />
                    </div>
                    <div className="pt-3 border-t border-border">
                      <DataRow label="Est LDW" value={formatWeight(ofpData.weights.est_ldw)} />
                      <DataRow label="Max LDW" value={formatWeight(ofpData.weights.max_ldw)} muted />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Weather Tab */}
            <TabsContent value="weather" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Departure Weather */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-warning rounded-full" />
                    <h3 className="text-lg font-semibold text-foreground">Departure Weather - {ofpData.origin.icao_code}</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-warning font-semibold mb-1">METAR</p>
                      <p className="font-mono text-sm text-foreground bg-muted/50 p-2 rounded break-all">
                        {ofpData.origin.metar || 'No METAR data'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-warning font-semibold mb-1">TAF</p>
                      <p className="font-mono text-xs text-foreground bg-muted/50 p-2 rounded whitespace-pre-wrap">
                        {ofpData.origin.taf || 'No TAF data'}
                      </p>
                    </div>
                    <FlightCategoryBadge category={ofpData.origin.metar_category} />
                  </div>
                </div>

                {/* Destination Weather */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-warning rounded-full" />
                    <h3 className="text-lg font-semibold text-foreground">Arrival Weather - {ofpData.destination.icao_code}</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-warning font-semibold mb-1">METAR</p>
                      <p className="font-mono text-sm text-foreground bg-muted/50 p-2 rounded break-all">
                        {ofpData.destination.metar || 'No METAR data'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-warning font-semibold mb-1">TAF</p>
                      <p className="font-mono text-xs text-foreground bg-muted/50 p-2 rounded whitespace-pre-wrap">
                        {ofpData.destination.taf || 'No TAF data'}
                      </p>
                    </div>
                    <FlightCategoryBadge category={ofpData.destination.metar_category} />
                  </div>
                </div>
              </div>

              {/* Alternate Weather */}
              {ofpData.alternate.icao_code && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-warning rounded-full" />
                    <h3 className="text-lg font-semibold text-foreground">Alternate Weather - {ofpData.alternate.icao_code}</h3>
                  </div>
                  <div>
                    <p className="text-xs text-warning font-semibold mb-1">METAR</p>
                    <p className="font-mono text-sm text-foreground bg-muted/50 p-2 rounded break-all">
                      {ofpData.alternate.metar || 'No METAR data'}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Navigation Log Tab */}
            <TabsContent value="navlog" className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-4 overflow-x-auto">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-warning rounded-full" />
                  <h3 className="text-lg font-semibold text-foreground">Navigation Log</h3>
                </div>
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border text-warning text-xs uppercase">
                      <th className="text-left p-2">Waypoint</th>
                      <th className="text-left p-2">Airway</th>
                      <th className="text-left p-2">Altitude</th>
                      <th className="text-left p-2">Wind</th>
                      <th className="text-left p-2">Distance</th>
                      <th className="text-left p-2">ETE</th>
                      <th className="text-left p-2">Fuel Rem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ofpData.navlog.map((fix, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="p-2 font-semibold text-foreground">{fix.ident}</td>
                        <td className="p-2 text-muted-foreground">{fix.via_airway || 'DCT'}</td>
                        <td className="p-2 text-foreground">FL{Math.round(parseInt(fix.altitude_feet || '0') / 100)}</td>
                        <td className="p-2 text-muted-foreground">{fix.wind_dir}/{fix.wind_spd}</td>
                        <td className="p-2 text-foreground">{fix.distance} NM</td>
                        <td className="p-2 text-muted-foreground">{formatLegTime(fix.time_total)}</td>
                        <td className="p-2 text-foreground">{parseInt(fix.fuel_plan_onboard || '0').toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Airports Tab */}
            <TabsContent value="airports" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <IFAirportCard icao={ofpData.origin.icao_code} label="Departure" />
                <IFAirportCard icao={ofpData.destination.icao_code} label="Arrival" />
              </div>
              {ofpData.alternate.icao_code && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <IFAirportCard icao={ofpData.alternate.icao_code} label="Alternate" />
                </div>
              )}
            </TabsContent>

            {/* Live ATIS Tab */}
            <TabsContent value="atis" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ATISCard icao={ofpData.origin.icao_code} label="Departure" />
                <ATISCard icao={ofpData.destination.icao_code} label="Arrival" />
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-4 justify-between items-center">
            <Button variant="outline" onClick={() => navigate('/dispatch')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Dispatch
            </Button>
            <Button onClick={() => navigate('/pirep')} className="gap-2">
              <Plane className="h-4 w-4" />
              Proceed to File PIREP
            </Button>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

function DataRow({ label, value, highlight, muted }: { label: string; value: string; highlight?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-warning text-lg' : muted ? 'text-muted-foreground text-xs' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

function DataBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <p className="text-xs text-muted-foreground uppercase mb-1">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}

function FlightCategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    vfr: 'bg-success/20 text-success border-success',
    mvfr: 'bg-info/20 text-info border-info',
    ifr: 'bg-warning/20 text-warning border-warning',
    lifr: 'bg-destructive/20 text-destructive border-destructive',
  };

  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase border ${colors[category] || 'bg-muted text-muted-foreground border-border'}`}>
      {category || 'Unknown'}
    </span>
  );
}
