import { MapPin, Plane, Radio, Navigation, Building2, AlertTriangle } from 'lucide-react';
import { useInfiniteFlightAirport } from '@/hooks/useInfiniteFlightAirport';
import { Skeleton } from '@/components/ui/skeleton';

interface IFAirportCardProps {
  icao: string;
  label: 'Departure' | 'Arrival' | 'Alternate';
}

const surfaceTypes: Record<number, string> = {
  0: 'Concrete',
  1: 'Asphalt',
  2: 'Grass',
  3: 'Dirt',
  4: 'Gravel',
  5: 'Water',
  6: 'Snow',
  7: 'Ice',
};

const frequencyTypes: Record<number, string> = {
  0: 'GND',
  1: 'TWR',
  2: 'APP',
  3: 'DEP',
  4: 'CTR',
  5: 'ATIS',
  6: 'MULTI',
  7: 'UNI',
  8: 'CLR',
};

export function IFAirportCard({ icao, label }: IFAirportCardProps) {
  const { airportData, loading, error } = useInfiniteFlightAirport(icao);

  // Add console logging for debugging
  console.log(`IFAirportCard ${label}:`, { icao, loading, error, airportData });

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-warning rounded-full" />
          <h3 className="text-lg font-semibold text-foreground">{label} Airport</h3>
        </div>
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (error || !airportData) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-warning rounded-full" />
          <h3 className="text-lg font-semibold text-foreground">{label} Airport</h3>
        </div>
        <div className="flex items-center justify-center text-muted-foreground py-8">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <span>No data available for {icao}</span>
        </div>
      </div>
    );
  }

  // Safely access nested properties
  const airportName = airportData?.name || 'Unknown Airport';
  const airportCity = airportData?.city || '';
  const airportState = airportData?.state || '';
  const airportCountry = airportData?.country || '';
  const airportICAO = airportData?.icao || icao;
  const airportIATA = airportData?.iata || '';
  const elevation = airportData?.elevation ? Math.round(airportData.elevation) : 0;
  const magneticVariation = airportData?.magneticVariation || 0;
  const latitude = airportData?.latitude || 0;
  const longitude = airportData?.longitude || 0;
  const runways = airportData?.runways || [];
  const frequencies = airportData?.frequencies || [];

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-warning rounded-full" />
        <h3 className="text-lg font-semibold text-foreground">{label} Airport</h3>
      </div>

      <div className="space-y-4">
        {/* Airport Name */}
        <div>
          <h4 className="text-xl font-bold text-foreground uppercase">{airportName}</h4>
          <p className="text-sm text-muted-foreground">
            {airportCity && `${airportCity}, `}
            {airportState && `${airportState}, `}
            {airportCountry}
          </p>
        </div>

        {/* Basic Info Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Building2 className="h-3 w-3" /> ICAO / IATA
            </p>
            <p className="font-semibold text-foreground">
              {airportICAO} {airportIATA && `/ ${airportIATA}`}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <MapPin className="h-3 w-3" /> Elevation
            </p>
            <p className="font-semibold text-foreground">{elevation} ft</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Navigation className="h-3 w-3" /> Mag Var
            </p>
            <p className="font-semibold text-foreground">
              {magneticVariation > 0 ? 'E' : 'W'}{Math.abs(magneticVariation).toFixed(1)}°
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <MapPin className="h-3 w-3" /> Coordinates
            </p>
            <p className="font-semibold text-foreground text-xs">
              {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
            </p>
          </div>
        </div>

        {/* Runways */}
        {runways.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
              <Plane className="h-4 w-4" /> Runways ({runways.length})
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {runways.slice(0, 6).map((runway, idx) => {
                // Safe access to runway properties
                const runwayName = runway?.name || `RWY ${idx + 1}`;
                const runwayLength = runway?.length ? Math.round(runway.length) : 0;
                const runwayWidth = runway?.width ? Math.round(runway.width) : 0;
                const runwaySurface = runway?.surface !== undefined 
                  ? (surfaceTypes[runway.surface] || 'Unknown') 
                  : 'Unknown';
                const hasILS = runway?.ils || false;

                return (
                  <div key={idx} className="bg-muted/50 rounded-lg p-2 text-xs">
                    <p className="font-semibold text-primary">{runwayName}</p>
                    <p className="text-muted-foreground">
                      {runwayLength}ft x {runwayWidth}ft
                    </p>
                    <p className="text-muted-foreground">
                      {runwaySurface}
                      {hasILS && ' • ILS'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Frequencies */}
        {frequencies.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
              <Radio className="h-3 w-3" /> Frequencies
            </p>
            <div className="flex flex-wrap gap-2">
              {frequencies.slice(0, 8).map((freq, idx) => {
                // Safe access to frequency properties
                const freqType = freq?.type !== undefined 
                  ? (frequencyTypes[freq.type] || 'COM') 
                  : 'COM';
                const freqValue = freq?.frequency 
                  ? (freq.frequency / 1000).toFixed(3) 
                  : '000.000';

                return (
                  <span key={idx} className="bg-muted/50 px-2 py-1 rounded text-xs">
                    <span className="text-warning font-semibold">{freqType}</span>
                    <span className="text-foreground ml-1">{freqValue}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
