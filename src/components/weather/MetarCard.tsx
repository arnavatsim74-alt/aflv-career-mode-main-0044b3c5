import { useEffect, useState } from 'react';
import { Cloud, Wind, Eye, Thermometer, Gauge, AlertCircle, RefreshCw } from 'lucide-react';
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
  clouds?: { cover: string; base: number | null }[];
  wxString?: string;
}

interface MetarCardProps {
  icao: string;
  label?: string;
}

export function MetarCard({ icao, label }: MetarCardProps) {
  const [metar, setMetar] = useState<MetarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetar = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://aviationweather.gov/api/data/metar?ids=${icao.toUpperCase()}&format=json`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch METAR');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        setMetar(data[0]);
      } else {
        setError('No METAR data available');
      }
    } catch (err) {
      setError('Unable to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (icao) {
      fetchMetar();
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

  if (error) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="font-semibold text-card-foreground">{icao}</span>
            {label && <span className="text-xs text-muted-foreground">({label})</span>}
          </div>
          <Button variant="ghost" size="icon" onClick={fetchMetar} className="h-8 w-8">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!metar) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" />
          <span className="font-bold text-card-foreground">{metar.icaoId}</span>
          {label && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{label}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {new Date(metar.reportTime).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              timeZoneName: 'short'
            })}
          </span>
          <Button variant="ghost" size="icon" onClick={fetchMetar} className="h-7 w-7">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Raw METAR */}
      <div className="bg-muted/50 rounded-lg p-2 mb-3 font-mono text-xs text-muted-foreground break-all">
        {metar.rawOb}
      </div>

      {/* Decoded Data Grid */}
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

      {/* Clouds */}
      {metar.clouds && metar.clouds.length > 0 && (
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
      {metar.wxString && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Weather</p>
          <span className="text-sm font-medium text-warning">{metar.wxString}</span>
        </div>
      )}
    </div>
  );
}
