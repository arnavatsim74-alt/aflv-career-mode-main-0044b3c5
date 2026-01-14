import { useEffect, useState } from 'react';

import { Cloud, Wind, Eye, Thermometer, Gauge, AlertCircle, RefreshCw, MapPin, Plane, Radio } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface MetarData {

  icaoId: string;

  reportTime: string;

  temp: number | null;

  dewp: number | null;

  wdir: number | null;

  wspd: number | null;

  wgst: number | null;

  visib: string | number | null;

  altim: number | null;

  rawOb: string;

  name?: string;

  fltCat?: string;

  clouds?: { cover: string; base: number | null }[];

  wxString?: string;

}

interface AirportData {

  icaoId: string;

  iataId: string | null;

  name: string;

  lat: number;

  lon: number;

  elev: number;

  country: string;

  state?: string;

  freqs?: string;

  runways?: { id: string; dimension: string; surface: string; alignment: number }[];

}

interface MetarCardProps {

  icao: string;

  label?: string;

}

export function MetarCard({ icao, label }: MetarCardProps) {

  const [metar, setMetar] = useState<MetarData | null>(null);

  const [airport, setAirport] = useState<AirportData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {

    setLoading(true);

    setError(null);

    

    try {

      // Fetch both METAR and Airport data in parallel

      const [metarResponse, airportResponse] = await Promise.all([

        fetch(`https://aviationweather.gov/api/data/metar?ids=${icao.toUpperCase()}&format=json`),

        fetch(`https://aviationweather.gov/api/data/airport?ids=${icao.toUpperCase()}&format=json`)

      ]);

      

      if (metarResponse.ok) {

        const metarData = await metarResponse.json();

        if (metarData && metarData.length > 0) {

          setMetar(metarData[0]);

        }

      }

      

      if (airportResponse.ok) {

        const airportData = await airportResponse.json();

        if (airportData && airportData.length > 0) {

          setAirport(airportData[0]);

        }

      }

      

      // Only show error if both failed

      if (!metarResponse.ok && !airportResponse.ok) {

        setError('Unable to fetch weather data');

      }

    } catch (err) {

      setError('Unable to fetch data');

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    if (icao) {

      fetchData();

    }

  }, [icao]);

  const getWindDirection = (degrees: number | null) => {

    if (degrees === null) return 'VRB';

    if (degrees === 0) return 'VRB';

    return `${degrees.toString().padStart(3, '0')}°`;

  };

  const getCloudCover = (cover: string) => {

    const covers: Record<string, string> = {

      'FEW': 'Few',

      'SCT': 'Scattered',

      'BKN': 'Broken',

      'OVC': 'Overcast',

      'CLR': 'Clear',

      'SKC': 'Sky Clear',

      'CAVOK': 'CAVOK',

    };

    return covers[cover] || cover;

  };

  const getFlightCategoryColor = (cat: string | undefined) => {

    switch (cat) {

      case 'VFR': return 'text-success bg-success/10';

      case 'MVFR': return 'text-info bg-info/10';

      case 'IFR': return 'text-warning bg-warning/10';

      case 'LIFR': return 'text-destructive bg-destructive/10';

      default: return 'text-muted-foreground bg-muted';

    }

  };

  const parseFrequencies = (freqs: string | undefined) => {

    if (!freqs) return [];

    return freqs.split(';').map(f => {

      const [type, freq] = f.split(',');

      return { type, freq };

    });

  };

  if (loading) {

    return (

      <div className="bg-card border border-border rounded-xl p-4 animate-pulse">

        <div className="flex items-center gap-2 mb-3">

          <div className="h-5 w-5 bg-muted rounded"></div>

          <div className="h-5 w-20 bg-muted rounded"></div>

        </div>

        <div className="space-y-2">

          <div className="h-4 w-full bg-muted rounded"></div>

          <div className="h-4 w-3/4 bg-muted rounded"></div>

        </div>

      </div>

    );

  }

  if (error && !metar && !airport) {

    return (

      <div className="bg-card border border-border rounded-xl p-4">

        <div className="flex items-center justify-between mb-2">

          <div className="flex items-center gap-2">

            <AlertCircle className="h-5 w-5 text-destructive" />

            <span className="font-semibold text-card-foreground">{icao}</span>

            {label && <span className="text-xs text-muted-foreground">({label})</span>}

          </div>

          <Button variant="ghost" size="icon" onClick={fetchData} className="h-8 w-8">

            <RefreshCw className="h-4 w-4" />

          </Button>

        </div>

        <p className="text-sm text-muted-foreground">{error}</p>

      </div>

    );

  }

  return (

    <div className="bg-card border border-border rounded-xl p-4">

      {/* Header */}

      <div className="flex items-center justify-between mb-3">

        <div className="flex items-center gap-2">

          <Cloud className="h-5 w-5 text-primary" />

          <span className="font-bold text-card-foreground">{icao}</span>

          {airport?.iataId && (

            <span className="text-xs text-muted-foreground">({airport.iataId})</span>

          )}

          {label && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{label}</span>}

          {metar?.fltCat && (

            <span className={`text-xs px-2 py-0.5 rounded font-medium ${getFlightCategoryColor(metar.fltCat)}`}>

              {metar.fltCat}

            </span>

          )}

        </div>

        <div className="flex items-center gap-2">

          {metar?.reportTime && (

            <span className="text-xs text-muted-foreground">

              {new Date(metar.reportTime).toLocaleTimeString('en-US', { 

                hour: '2-digit', 

                minute: '2-digit',

                timeZoneName: 'short'

              })}

            </span>

          )}

          <Button variant="ghost" size="icon" onClick={fetchData} className="h-7 w-7">

            <RefreshCw className="h-3 w-3" />

          </Button>

        </div>

      </div>

      {/* Airport Info */}

      {airport && (

        <div className="bg-muted/30 rounded-lg p-3 mb-3">

          <div className="flex items-start gap-2 mb-2">

            <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />

            <div>

              <p className="text-sm font-medium text-card-foreground">{airport.name}</p>

              <p className="text-xs text-muted-foreground">

                {airport.state ? `${airport.state}, ` : ''}{airport.country} • Elev: {airport.elev} ft

              </p>

            </div>

          </div>

          

          {/* Runways */}

          {airport.runways && airport.runways.length > 0 && (

            <div className="flex items-start gap-2 mt-2">

              <Plane className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />

              <div className="flex flex-wrap gap-1">

                {airport.runways.map((rwy, idx) => (

                  <span key={idx} className="text-xs bg-background px-2 py-0.5 rounded text-card-foreground">

                    RWY {rwy.id} ({rwy.dimension.split('x')[0]}ft)

                  </span>

                ))}

              </div>

            </div>

          )}

          {/* Frequencies */}

          {airport.freqs && (

            <div className="flex items-start gap-2 mt-2">

              <Radio className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />

              <div className="flex flex-wrap gap-1">

                {parseFrequencies(airport.freqs).slice(0, 4).map((f, idx) => (

                  <span key={idx} className="text-xs bg-background px-2 py-0.5 rounded text-card-foreground">

                    {f.type}: {f.freq}

                  </span>

                ))}

              </div>

            </div>

          )}

        </div>

      )}

      {/* Raw METAR */}

      {metar?.rawOb && (

        <div className="bg-muted/50 rounded-lg p-2 mb-3 font-mono text-xs text-muted-foreground break-all">

          {metar.rawOb}

        </div>

      )}

      {/* Decoded Data Grid */}

      {metar && (

        <div className="grid grid-cols-2 gap-3">

          {/* Wind */}

          <div className="flex items-center gap-2">

            <Wind className="h-4 w-4 text-info" />

            <div>

              <p className="text-xs text-muted-foreground">Wind</p>

              <p className="text-sm font-medium text-card-foreground">

                {getWindDirection(metar.wdir)} @ {metar.wspd || 0} kt

                {metar.wgst && <span className="text-warning"> G{metar.wgst}</span>}

              </p>

            </div>

          </div>

          {/* Visibility */}

          <div className="flex items-center gap-2">

            <Eye className="h-4 w-4 text-info" />

            <div>

              <p className="text-xs text-muted-foreground">Visibility</p>

              <p className="text-sm font-medium text-card-foreground">

                {metar.visib === 'P6' ? '>6 SM' : `${metar.visib} SM`}

              </p>

            </div>

          </div>

          {/* Temperature */}

          <div className="flex items-center gap-2">

            <Thermometer className="h-4 w-4 text-destructive" />

            <div>

              <p className="text-xs text-muted-foreground">Temp / Dewpoint</p>

              <p className="text-sm font-medium text-card-foreground">

                {metar.temp !== null ? `${metar.temp}°C` : '--'} / {metar.dewp !== null ? `${metar.dewp}°C` : '--'}

              </p>

            </div>

          </div>

          {/* Altimeter */}

          <div className="flex items-center gap-2">

            <Gauge className="h-4 w-4 text-success" />

            <div>

              <p className="text-xs text-muted-foreground">Altimeter</p>

              <p className="text-sm font-medium text-card-foreground">

                {metar.altim ? `${(metar.altim * 0.02953).toFixed(2)}" / ${Math.round(metar.altim)} hPa` : '--'}

              </p>

            </div>

          </div>

        </div>

      )}

      {/* Clouds */}

      {metar?.clouds && metar.clouds.length > 0 && (

        <div className="mt-3 pt-3 border-t border-border">

          <p className="text-xs text-muted-foreground mb-1">Clouds</p>

          <div className="flex flex-wrap gap-2">

            {metar.clouds.map((cloud, idx) => (

              <span key={idx} className="text-xs bg-muted px-2 py-1 rounded text-card-foreground">

                {getCloudCover(cloud.cover)}{cloud.base !== null ? ` @ ${cloud.base * 100}ft` : ''}

              </span>

            ))}

          </div>

        </div>

      )}

      {/* Weather Phenomena */}

      {metar?.wxString && (

        <div className="mt-3 pt-3 border-t border-border">

          <p className="text-xs text-muted-foreground mb-1">Weather</p>

          <span className="text-sm font-medium text-warning">{metar.wxString}</span>

        </div>

      )}

      {/* No METAR message */}

      {!metar && airport && (

        <div className="text-sm text-muted-foreground text-center py-2">

          No METAR data available for this airport

        </div>

      )}

    </div>

  );

          }