import { useMemo } from 'react';

interface WindCompassProps {
  icao: string;
  label: 'DEPARTURE' | 'ARRIVAL';
  windDir: number | string | null;
  windSpeed: number | null;
  windGust: number | null;
  runways: Array<{ id: string; alignment: number }>;
}

export function WindCompass({ icao, label, windDir, windSpeed, windGust, runways }: WindCompassProps) {
  const windDirection = typeof windDir === 'number' ? windDir : 0;
  const speed = windSpeed || 0;
  const isVariable = windDir === 'VRB' || typeof windDir === 'string';

  // Get primary runway for calculations
  const primaryRunway = runways?.[0];
  const runwayHeading = primaryRunway?.alignment || 0;

  // Calculate headwind and crosswind components
  const { headwind, crosswind, crosswindDirection } = useMemo(() => {
    if (!windDir || isVariable || !primaryRunway) {
      return { headwind: 0, crosswind: 0, crosswindDirection: '' };
    }

    const windRad = (windDirection * Math.PI) / 180;
    const runwayRad = (runwayHeading * Math.PI) / 180;
    const angleDiff = windRad - runwayRad;

    const headwindComponent = Math.round(speed * Math.cos(angleDiff));
    const crosswindComponent = Math.round(speed * Math.sin(angleDiff));

    return {
      headwind: Math.abs(headwindComponent),
      crosswind: Math.abs(crosswindComponent),
      crosswindDirection: crosswindComponent > 0 ? 'R' : crosswindComponent < 0 ? 'L' : '',
    };
  }, [windDirection, speed, runwayHeading, isVariable, primaryRunway]);

  // Create runway display (e.g., "09 | 27")
  const runwayDisplay = primaryRunway?.id || 'N/A';

  return (
    <div className="bg-[hsl(var(--card))]/60 backdrop-blur-sm rounded-xl p-4 border border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-muted-foreground font-medium text-sm">
          {icao} - {label}
        </span>
        <span className="bg-[hsl(var(--muted))] px-3 py-1 rounded-lg text-sm font-mono">
          <span className="text-info">{isVariable ? 'VRB' : `${windDirection.toString().padStart(3, '0')}°`}</span>
          <span className="text-muted-foreground"> / </span>
          <span className="text-warning">{speed}kt</span>
          {windGust && (
            <>
              <span className="text-muted-foreground">G</span>
              <span className="text-destructive">{windGust}kt</span>
            </>
          )}
        </span>
      </div>

      {/* Compass */}
      <div className="relative w-full aspect-square max-w-[280px] mx-auto my-4">
        {/* Compass circle */}
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {/* Outer ring */}
          <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4,4" />
          
          {/* Cardinal directions */}
          <text x="100" y="20" textAnchor="middle" className="fill-info text-xs font-bold">N</text>
          <text x="180" y="104" textAnchor="middle" className="fill-muted-foreground text-xs font-medium">E</text>
          <text x="100" y="190" textAnchor="middle" className="fill-muted-foreground text-xs font-medium">S</text>
          <text x="20" y="104" textAnchor="middle" className="fill-muted-foreground text-xs font-medium">W</text>

          {/* Tick marks */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const isMajor = deg % 90 === 0;
            const innerR = isMajor ? 75 : 80;
            const outerR = 85;
            return (
              <line
                key={deg}
                x1={100 + innerR * Math.sin(rad)}
                y1={100 - innerR * Math.cos(rad)}
                x2={100 + outerR * Math.sin(rad)}
                y2={100 - outerR * Math.cos(rad)}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={isMajor ? 2 : 1}
                opacity={isMajor ? 0.8 : 0.4}
              />
            );
          })}

          {/* Runway indicator */}
          {primaryRunway && (
            <g transform={`rotate(${runwayHeading}, 100, 100)`}>
              <rect x="92" y="45" width="16" height="55" fill="hsl(var(--muted))" rx="2" opacity="0.8" />
              <line x1="100" y1="45" x2="100" y2="100" stroke="hsl(var(--foreground))" strokeWidth="1" strokeDasharray="3,3" />
              <text 
                x="100" 
                y="75" 
                textAnchor="middle" 
                className="text-[10px] font-mono fill-foreground"
                transform={`rotate(-${runwayHeading}, 100, 75)`}
              >
                {runwayDisplay}
              </text>
            </g>
          )}

          {/* Wind arrow */}
          {!isVariable && speed > 0 && (
            <g transform={`rotate(${windDirection}, 100, 100)`}>
              {/* Arrow shaft line from center outward */}
              <line x1="100" y1="100" x2="100" y2="30" stroke="hsl(var(--info))" strokeWidth="2" />
              {/* Arrowhead pointing into compass (wind FROM direction) */}
              <polygon 
                points="100,25 94,40 106,40" 
                fill="hsl(var(--info))"
              />
              {/* Wind speed label */}
              <g transform={`rotate(-${windDirection}, 100, 50)`}>
                <rect x="85" y="38" width="30" height="16" fill="hsl(var(--info))" rx="4" />
                <text x="100" y="50" textAnchor="middle" className="text-[10px] font-bold fill-white">
                  {speed}kt
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* Wind components */}
      {primaryRunway && (
        <div className="grid grid-cols-2 gap-4 mt-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Headwind</p>
            <p className="text-lg font-bold text-success">{headwind} kt</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Crosswind {crosswindDirection}
            </p>
            <p className="text-lg font-bold text-warning">{crosswind} kt</p>
          </div>
        </div>
      )}
    </div>
  );
}
