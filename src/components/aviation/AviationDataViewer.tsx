import { useMemo } from 'react';
import { Cloud, Plane, MapPin, Radio, Wind, Eye, Thermometer, Gauge, AlertTriangle, Building2, Navigation } from 'lucide-react';
import { useAviationData } from '@/hooks/useAviationData';
import { WindCompass } from './WindCompass';
import { Skeleton } from '@/components/ui/skeleton';

interface AviationDataViewerProps {
  icao: string;
  label: 'Departure' | 'Arrival';
}

export function AviationDataViewer({ icao, label }: AviationDataViewerProps) {
  const { metar, airport, loading, error } = useAviationData(icao);

  const flightCategoryColor = useMemo(() => {
    switch (metar?.fltCat) {
      case 'VFR': return 'text-success';
      case 'MVFR': return 'text-info';
      case 'IFR': return 'text-warning';
      case 'LIFR': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  }, [metar?.fltCat]);

  const formatVisibility = (visib: number | string | null) => {
    if (visib === null || visib === undefined) return 'N/A';
    if (typeof visib === 'string') return visib;
    if (visib >= 10) return '10+';
    return visib.toString();
  };

  const formatObsTime = (reportTime: string | null) => {
    if (!reportTime) return 'N/A';
    try {
      const date = new Date(reportTime);
      return date.toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return reportTime;
    }
  };

  const getSurfaceType = (surface: string) => {
    const types: Record<string, string> = {
      'H': 'Hard Surface',
      'S': 'Soft Surface',
      'T': 'Turf',
      'G': 'Gravel',
      'W': 'Water',
      'P': 'Paved',
    };
    return types[surface] || surface;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-warning rounded-full" />
            <h3 className="text-lg font-semibold text-foreground">{label} Weather</h3>
          </div>
          <Skeleton className="h-[300px] w-full" />
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  if (error || (!metar && !airport)) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-warning rounded-full" />
          <h3 className="text-lg font-semibold text-foreground">{label} Weather</h3>
        </div>
        <div className="flex items-center justify-center text-muted-foreground py-8">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <span>No data available for {icao}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Weather Section */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-warning rounded-full" />
          <h3 className="text-lg font-semibold text-foreground">{label} Weather</h3>
        </div>

        {metar && (
          <>
            {/* Wind Compass */}
            <WindCompass
              icao={icao}
              label={label === 'Departure' ? 'DEPARTURE' : 'ARRIVAL'}
              windDir={metar.wdir}
              windSpeed={metar.wspd}
              windGust={metar.wgst}
              runways={airport?.runways?.map(r => ({ id: r.id, alignment: r.alignment })) || []}
            />

            {/* Raw METAR */}
            <div className="mt-4 bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-warning font-semibold mb-1">METAR</p>
              <p className="text-sm font-mono text-foreground break-all">{metar.rawOb}</p>
            </div>

            {/* Decoded METAR Data */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Station:</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{metar.icaoId}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${flightCategoryColor} bg-muted`}>
                    {metar.fltCat || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span className="flex items-center gap-1">
                  <Cloud className="h-4 w-4" />
                  Observation Time
                </span>
                <span className="text-foreground">{formatObsTime(metar.reportTime)}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Wind className="h-3 w-3" /> Wind
                  </p>
                  <p className="font-semibold text-foreground">
                    {typeof metar.wdir === 'number' ? `${metar.wdir}°` : metar.wdir || 'Calm'} / {metar.wspd || 0} kt
                    {metar.wgst && <span className="text-destructive"> G{metar.wgst}</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Eye className="h-3 w-3" /> Visibility
                  </p>
                  <p className="font-semibold text-foreground">{formatVisibility(metar.visib)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Thermometer className="h-3 w-3" /> Temp / Dewpoint
                  </p>
                  <p className="font-semibold text-foreground">
                    {metar.temp !== null ? `${metar.temp}°C` : 'N/A'} / {metar.dewp !== null ? `${metar.dewp}°C` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Gauge className="h-3 w-3" /> QNH
                  </p>
                  <p className="font-semibold text-foreground">
                    {metar.altim ? `${Math.round(metar.altim)} hPa` : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Weather Phenomena</p>
                <p className="font-semibold text-foreground">
                  {metar.wxString || 'None'}
                </p>
              </div>

              {metar.clouds && metar.clouds.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Clouds</p>
                  <div className="space-y-1">
                    {metar.clouds.map((cloud, idx) => (
                      <p key={idx} className="font-semibold text-foreground">
                        {cloud.cover} at {cloud.base} ft
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Airport Section */}
      {airport && (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-warning rounded-full" />
            <h3 className="text-lg font-semibold text-foreground">{label} Airport</h3>
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="text-xl font-bold text-foreground uppercase">{airport.name}</h4>
              <p className="text-sm text-muted-foreground">
                {airport.state ? `${airport.state}, ` : ''}{airport.country}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Building2 className="h-3 w-3" /> Type
                </p>
                <p className="font-semibold text-foreground">{airport.type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <MapPin className="h-3 w-3" /> Elevation
                </p>
                <p className="font-semibold text-foreground">{airport.elev} ft</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Navigation className="h-3 w-3" /> Mag Var
                </p>
                <p className="font-semibold text-foreground">{airport.magdec || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <MapPin className="h-3 w-3" /> Coordinates
                </p>
                <p className="font-semibold text-foreground text-sm">
                  {airport.lat.toFixed(4)}° N, {airport.lon.toFixed(4)}° E
                </p>
              </div>
            </div>

            {/* Runways */}
            {airport.runways && airport.runways.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                  <Plane className="h-4 w-4" /> Runways ({airport.runways.length})
                </p>
                <div className="space-y-3">
                  {airport.runways.map((runway, idx) => (
                    <div key={idx} className="bg-muted/50 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Runway</p>
                          <p className="font-semibold text-primary">{runway.id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Heading</p>
                          <p className="font-semibold text-foreground">{runway.alignment}°</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Dimensions</p>
                          <p className="font-semibold text-foreground">{runway.dimension} ft</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Surface</p>
                          <p className="font-semibold text-foreground">{getSurfaceType(runway.surface)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Frequencies */}
            {airport.freqs && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Radio className="h-3 w-3" /> Frequencies
                </p>
                <p className="font-mono text-sm text-foreground">{airport.freqs}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
        <p className="text-xs text-warning">
          Data provided for informational purposes only. Not for flight planning or operational use.
        </p>
      </div>
    </div>
  );
}
