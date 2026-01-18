import { useEffect, useState } from 'react';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { Plane, ArrowLeft, RefreshCw, Map, Navigation, Fuel, CloudRain, List, Info, FileText, Download, ExternalLink } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useSimBriefOFP, OFPData } from '@/hooks/useSimBriefOFP';
import { IFAirportCard } from '@/components/aviation/IFAirportCard';
import { ATISCard } from '@/components/aviation/ATISCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function OFPViewer() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { ofpData, loading, error, fetchOFP } = useSimBriefOFP();
  const [activeTab, setActiveTab] = useState('overview');

  const legId = searchParams.get('legId') || '';
  const simbriefPid = profile?.simbrief_pid;

  useEffect(() => {
    if (simbriefPid && !ofpData && !loading) {
      fetchOFP(simbriefPid);
    }
  }, [simbriefPid, ofpData, loading, fetchOFP]);

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

  if (!simbriefPid) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Info className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">SimBrief PID Required</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Please add your SimBrief Pilot ID in your profile settings to view OFP data.
          </p>
          <Button variant="outline" onClick={() => navigate('/dispatch')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dispatch
          </Button>
        </div>
      </DashboardLayout>
    );
  }

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

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/dispatch')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dispatch
          </Button>
          {ofpData && (
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Operational Flight Plan
              </h1>
              <p className="text-sm text-muted-foreground">
                Aeroflot Virtual • Digital Dispatch
              </p>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchOFP(simbriefPid)} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
          {error}
        </div>
      )}

      {ofpData && (
        <>
          {/* Flight Summary Header */}
          <div className="bg-gradient-to-r from-card to-muted/50 border border-border rounded-xl p-6 mb-6">
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
                <p className="text-xs text-muted-foreground uppercase">Reg</p>
                <p className="font-bold text-lg text-foreground">{ofpData.aircraft.reg || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 mb-6 bg-muted/50">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="map" className="text-xs">Map</TabsTrigger>
              <TabsTrigger value="route" className="text-xs">Route</TabsTrigger>
              <TabsTrigger value="fuel" className="text-xs">Fuel & Weights</TabsTrigger>
              <TabsTrigger value="weather" className="text-xs">Weather</TabsTrigger>
              <TabsTrigger value="navlog" className="text-xs">Nav Log</TabsTrigger>
              <TabsTrigger value="info" className="text-xs">Special Info</TabsTrigger>
              <TabsTrigger value="charts" className="text-xs">Charts</TabsTrigger>
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

              {/* Airport Info from Infinite Flight */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <IFAirportCard icao={ofpData.origin.icao_code} label="Departure" />
                <IFAirportCard icao={ofpData.destination.icao_code} label="Arrival" />
              </div>

              {/* ATIS Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ATISCard icao={ofpData.origin.icao_code} label="Departure" />
                <ATISCard icao={ofpData.destination.icao_code} label="Arrival" />
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
                  <div className=
