import { useMemo } from 'react';
import { Wind, Eye, Thermometer, Gauge, CloudRain } from 'lucide-react';

interface MetarWeatherCardProps {
  icao: string;
  label: 'Departure' | 'Arrival' | 'Alternate';
  metar: string;
  runwayHeading?: number;
}

interface ParsedMetar {
  station: string;
  time: string;
  windDir: number | 'VRB';
  windSpeed: number;
  windGust: number | null;
  visibility: string;
  temperature: number | null;
  dewpoint: number | null;
  qnh: number | null;
  phenomena: string[];
  raw: string;
}

function parseMetar(metar: string): ParsedMetar | null {
  if (!metar || metar === 'No METAR data') return null;

  const result: ParsedMetar = {
    station: '',
    time: '',
    windDir: 0,
    windSpeed: 0,
    windGust: null,
    visibility: '',
    temperature: null,
    dewpoint: null,
    qnh: null,
    phenomena: [],
    raw: metar,
  };

  try {
    const parts = metar.trim().split(/\s+/);
    
    // Skip "METAR" if present
    let startIndex = 0;
    if (parts[0] === 'METAR' || parts[0] === 'SPECI') {
      startIndex = 1;
    }

    // Station (4-letter ICAO)
    if (parts[startIndex]?.match(/^[A-Z]{4}$/)) {
      result.station = parts[startIndex];
      startIndex++;
    }

    // Time (e.g., 141230Z)
    const timeMatch = parts[startIndex]?.match(/^(\d{6})Z$/);
    if (timeMatch) {
      const dayHourMin = timeMatch[1];
      const day = dayHourMin.slice(0, 2);
      const hour = dayHourMin.slice(2, 4);
      const min = dayHourMin.slice(4, 6);
      result.time = `${day} at ${hour}:${min}Z`;
      startIndex++;
    }

    // Wind (e.g., 25006KT, VRB03KT, 25006G12KT)
    for (let i = startIndex; i < parts.length; i++) {
      const windMatch = parts[i]?.match(/^(VRB|\d{3})(\d{2,3})(G(\d{2,3}))?KT$/);
      if (windMatch) {
        result.windDir = windMatch[1] === 'VRB' ? 'VRB' : parseInt(windMatch[1]);
        result.windSpeed = parseInt(windMatch[2]);
        result.windGust = windMatch[4] ? parseInt(windMatch[4]) : null;
        break;
      }
    }

    // Visibility (e.g., 9999, CAVOK, 6000)
    for (const part of parts) {
      if (part === 'CAVOK') {
        result.visibility = '10+ km';
        break;
      }
      const visMatch = part.match(/^(\d{4})$/);
      if (visMatch) {
        const vis = parseInt(visMatch[1]);
        if (vis === 9999) {
          result.visibility = '10+ km';
        } else {
          result.visibility = `${(vis / 1000).toFixed(1)} km`;
        }
        break;
      }
      // US format SM
      const smMatch = part.match(/^(\d+)(\/(\d+))?SM$/);
      if (smMatch) {
        if (smMatch[3]) {
          result.visibility = `${parseInt(smMatch[1]) / parseInt(smMatch[3])} SM`;
        } else {
          result.visibility = `${smMatch[1]} SM`;
        }
        break;
      }
    }

    // Temperature/Dewpoint (e.g., 26/06, M02/M05)
    for (const part of parts) {
      const tempMatch = part.match(/^(M)?(\d{2})\/(M)?(\d{2})$/);
      if (tempMatch) {
        result.temperature = parseInt(tempMatch[2]) * (tempMatch[1] ? -1 : 1);
        result.dewpoint = parseInt(tempMatch[4]) * (tempMatch[3] ? -1 : 1);
        break;
      }
    }

    // QNH (e.g., Q1016, A2992)
    for (const part of parts) {
      const qnhMatch = part.match(/^Q(\d{4})$/);
      if (qnhMatch) {
        result.qnh = parseInt(qnhMatch[1]);
        break;
      }
      const altMatch = part.match(/^A(\d{4})$/);
      if (altMatch) {
        // Convert altimeter to hPa
        result.qnh = Math.round(parseInt(altMatch[1]) / 100 * 33.8639);
        break;
      }
    }

    // Weather phenomena
    const wxCodes: Record<string, string> = {
      'RA': 'Rain', 'SN': 'Snow', 'DZ': 'Drizzle', 'GR': 'Hail', 'GS': 'Small Hail',
      'FG': 'Fog', 'BR': 'Mist', 'HZ': 'Haze', 'DU': 'Dust', 'SA': 'Sand',
      'TS': 'Thunderstorm', 'SH': 'Shower', 'FZ': 'Freezing', 'SQ': 'Squall',
      'FC': 'Funnel Cloud', 'VA': 'Volcanic Ash', '+': 'Heavy', '-': 'Light',
      'VC': 'Vicinity', 'BC': 'Patches', 'BL': 'Blowing', 'MI': 'Shallow',
      'PR': 'Partial', 'DR': 'Drifting',
    };

    for (const part of parts) {
      if (part.match(/^[-+]?(VC)?(TS|SH|FZ|BC|BL|MI|PR|DR)?(RA|SN|DZ|GR|GS|FG|BR|HZ|DU|SA|SQ|FC|VA)+$/)) {
        let description = '';
        let intensity = '';
        let remaining = part;
        
        if (remaining.startsWith('+')) {
          intensity = 'Heavy ';
          remaining = remaining.slice(1);
        } else if (remaining.startsWith('-')) {
          intensity = 'Light ';
          remaining = remaining.slice(1);
        }
        
        // Parse two-letter codes
        for (let i = 0; i < remaining.length; i += 2) {
          const code = remaining.slice(i, i + 2);
          if (wxCodes[code]) {
            description += wxCodes[code] + ' ';
          }
        }
        
        if (description) {
          result.phenomena.push((intensity + description).trim());
        }
      }
    }

    return result;
  } catch (e) {
    console.error('Error parsing METAR:', e);
    return null;
  }
}

function calculateWindComponents(
  windDir: number,
  windSpeed: number,
  runwayHeading: number
): { headwind: number; crosswind: number; crosswindDir: 'L' | 'R' } {
  let relativeAngle = windDir - runwayHeading;
  
  while (relativeAngle > 180) relativeAngle -= 360;
  while (relativeAngle < -180) relativeAngle += 360;
  
  const radians = (relativeAngle * Math.PI) / 180;
  const headwind = Math.round(windSpeed * Math.cos(radians));
  const crosswindValue = windSpeed * Math.sin(radians);
  const crosswind = Math.abs(Math.round(crosswindValue));
  const crosswindDir: 'L' | 'R' = crosswindValue > 0 ? 'R' : 'L';
  
  return { headwind, crosswind, crosswindDir };
}

export function MetarWeatherCard({ icao, label, metar, runwayHeading = 0 }: MetarWeatherCardProps) {
  const parsed = useMemo(() => parseMetar(metar), [metar]);

  if (!parsed) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-warning rounded-full" />
          <h3 className="text-lg font-semibold text-foreground">{label} Weather</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <CloudRain className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No weather data available</p>
        </div>
      </div>
    );
  }

  const windDirection = parsed.windDir === 'VRB' ? 0 : parsed.windDir;
  const isVariable = parsed.windDir === 'VRB';
  const windComponents = useMemo(() => {
    if (isVariable || !runwayHeading) return null;
    return calculateWindComponents(windDirection, parsed.windSpeed, runwayHeading);
  }, [windDirection, parsed.windSpeed, runwayHeading, isVariable]);

  // SVG dimensions for compass
  const size = 240;
  const center = size / 2;
  const radius = 85;
  const runwayLength = 70;
  const runwayWidth = 22;

  // Wind arrow position
  const windArrowAngle = ((windDirection - 90) * Math.PI) / 180;
  const windArrowStart = {
    x: center + (radius + 5) * Math.cos(windArrowAngle),
    y: center + (radius + 5) * Math.sin(windArrowAngle),
  };
  const windArrowEnd = {
    x: center + (radius - 35) * Math.cos(windArrowAngle),
    y: center + (radius - 35) * Math.sin(windArrowAngle),
  };

  // Calculate runway number from heading
  const runwayNum = runwayHeading ? Math.round(runwayHeading / 10).toString().padStart(2, '0') : '--';
  const oppositeRunway = runwayHeading ? (((Math.round(runwayHeading / 10) + 18) % 36) || 36).toString().padStart(2, '0') : '--';

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-warning rounded-full" />
        <h3 className="text-lg font-semibold text-foreground">{label} Weather - {icao}</h3>
      </div>

      {/* Wind Compass Card */}
      <div className="bg-muted/30 rounded-xl p-4 mb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground font-medium">
            {icao} - {label.toUpperCase()}
          </span>
          <div className="bg-muted px-3 py-1 rounded-lg">
            <span className="text-info font-mono font-bold">
              {isVariable ? 'VRB' : `${windDirection.toString().padStart(3, '0')}°`}
            </span>
            <span className="text-muted-foreground"> / </span>
            <span className="text-warning font-mono font-bold">{parsed.windSpeed}kt</span>
            {parsed.windGust && (
              <>
                <span className="text-muted-foreground"> G</span>
                <span className="text-destructive font-mono font-bold">{parsed.windGust}kt</span>
              </>
            )}
          </div>
        </div>

        {/* Compass Diagram */}
        <div className="flex justify-center">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Compass circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            
            {/* Compass marks */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
              const angle = ((deg - 90) * Math.PI) / 180;
              const innerR = radius - 6;
              const outerR = radius;
              const x1 = center + innerR * Math.cos(angle);
              const y1 = center + innerR * Math.sin(angle);
              const x2 = center + outerR * Math.cos(angle);
              const y2 = center + outerR * Math.sin(angle);
              return (
                <line
                  key={deg}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth="2"
                  opacity={deg % 90 === 0 ? 0.8 : 0.4}
                />
              );
            })}
            
            {/* Cardinal directions */}
            {[
              { label: 'N', deg: 0 },
              { label: 'E', deg: 90 },
              { label: 'S', deg: 180 },
              { label: 'W', deg: 270 },
            ].map(({ label: dir, deg }) => {
              const angle = ((deg - 90) * Math.PI) / 180;
              const textR = radius + 16;
              const x = center + textR * Math.cos(angle);
              const y = center + textR * Math.sin(angle);
              return (
                <text
                  key={dir}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={dir === 'N' ? 'hsl(var(--info))' : 'hsl(var(--muted-foreground))'}
                  fontSize="13"
                  fontWeight="bold"
                >
                  {dir}
                </text>
              );
            })}
            
            {/* Runway */}
            {runwayHeading > 0 && (
              <g transform={`rotate(${runwayHeading}, ${center}, ${center})`}>
                <rect
                  x={center - runwayWidth / 2}
                  y={center - runwayLength / 2}
                  width={runwayWidth}
                  height={runwayLength}
                  fill="hsl(var(--muted))"
                  rx="2"
                />
                {/* Threshold stripes */}
                {[-5, -1.5, 1.5, 5].map((offset) => (
                  <line
                    key={`top-${offset}`}
                    x1={center + offset}
                    y1={center - runwayLength / 2 + 4}
                    x2={center + offset}
                    y2={center - runwayLength / 2 + 10}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="1"
                  />
                ))}
                {[-5, -1.5, 1.5, 5].map((offset) => (
                  <line
                    key={`bottom-${offset}`}
                    x1={center + offset}
                    y1={center + runwayLength / 2 - 4}
                    x2={center + offset}
                    y2={center + runwayLength / 2 - 10}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="1"
                  />
                ))}
                {/* Runway numbers */}
                <text
                  x={center}
                  y={center - 12}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="hsl(var(--foreground))"
                  fontSize="11"
                  fontWeight="bold"
                  transform={`rotate(180, ${center}, ${center - 12})`}
                >
                  {runwayNum}
                </text>
                <text
                  x={center}
                  y={center + 12}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="hsl(var(--foreground))"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {oppositeRunway}
                </text>
              </g>
            )}
            
            {/* Wind arrow */}
            {!isVariable && parsed.windSpeed > 0 && (
              <>
                <defs>
                  <marker
                    id={`windArrow-${icao}-${label}`}
                    markerWidth="8"
                    markerHeight="8"
                    refX="4"
                    refY="4"
                    orient="auto"
                  >
                    <polygon points="0,0 8,4 0,8" fill="hsl(var(--info))" />
                  </marker>
                </defs>
                <line
                  x1={windArrowStart.x}
                  y1={windArrowStart.y}
                  x2={windArrowEnd.x}
                  y2={windArrowEnd.y}
                  stroke="hsl(var(--info))"
                  strokeWidth="3"
                  markerEnd={`url(#windArrow-${icao}-${label})`}
                />
                <text
                  x={windArrowStart.x}
                  y={windArrowStart.y + (windArrowStart.y > center ? 14 : -10)}
                  textAnchor="middle"
                  fill="hsl(var(--info))"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {parsed.windSpeed}kt
                </text>
              </>
            )}
          </svg>
        </div>

        {/* Wind Components */}
        {windComponents && runwayHeading > 0 && (
          <div className="flex justify-center gap-8 mt-3 pt-3 border-t border-border/50">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Headwind</p>
              <p className={`text-lg font-bold ${windComponents.headwind >= 0 ? 'text-success' : 'text-destructive'}`}>
                {windComponents.headwind >= 0 ? windComponents.headwind : Math.abs(windComponents.headwind)} kt
                {windComponents.headwind < 0 && <span className="text-xs ml-1">(tail)</span>}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Crosswind {windComponents.crosswindDir}
              </p>
              <p className="text-lg font-bold text-warning">{windComponents.crosswind} kt</p>
            </div>
          </div>
        )}
      </div>

      {/* METAR Raw */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground uppercase mb-1">METAR</p>
        <p className="font-mono text-sm text-foreground bg-muted/50 p-2 rounded break-all">
          {parsed.raw}
        </p>
      </div>

      {/* Station Info */}
      <div className="flex items-center justify-between text-sm mb-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Station:</span>
          <span className="font-bold text-foreground">{parsed.station}</span>
        </div>
        {parsed.time && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <span>{parsed.time}</span>
          </div>
        )}
      </div>

      {/* Weather Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-start gap-2">
          <Wind className="h-4 w-4 text-info mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground">Wind</p>
            <p className="font-semibold text-foreground">
              {isVariable ? 'VRB' : `${windDirection}°`} / {parsed.windSpeed} kt
              {parsed.windGust && ` G${parsed.windGust}`}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Eye className="h-4 w-4 text-info mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground">Visibility</p>
            <p className="font-semibold text-foreground">{parsed.visibility || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Thermometer className="h-4 w-4 text-info mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground">Temp / Dewpoint</p>
            <p className="font-semibold text-foreground">
              {parsed.temperature !== null ? `${parsed.temperature}°C` : 'N/A'} / {parsed.dewpoint !== null ? `${parsed.dewpoint}°C` : 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Gauge className="h-4 w-4 text-info mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground">QNH</p>
            <p className="font-semibold text-foreground">{parsed.qnh ? `${parsed.qnh} hPa` : 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Weather Phenomena */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground mb-1">Weather Phenomena</p>
        <p className="font-semibold text-foreground">
          {parsed.phenomena.length > 0 ? parsed.phenomena.join(', ') : 'None'}
        </p>
      </div>
    </div>
  );
}
