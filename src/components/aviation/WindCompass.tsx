import { useMemo } from 'react';

interface WindCompassProps {
  icao: string;
  label: 'DEPARTURE' | 'ARRIVAL';
  windDir: number | string | null;
  windSpeed: number | null;
  windGust: number | null;
  runways: Array<{ id: string; alignment: number }>;
}

interface WindComponents {
  headwind: number;
  crosswind: number;
  crosswindDir: 'L' | 'R';
  runwayId: string;
  runwayHeading: number;
}

function calculateWindComponents(
  windDir: number,
  windSpeed: number,
  runwayHeading: number
): { headwind: number; crosswind: number; crosswindDir: 'L' | 'R' } {
  // Calculate the angle between wind and runway
  let relativeAngle = windDir - runwayHeading;
  
  // Normalize to -180 to 180
  while (relativeAngle > 180) relativeAngle -= 360;
  while (relativeAngle < -180) relativeAngle += 360;
  
  const radians = (relativeAngle * Math.PI) / 180;
  
  // Headwind is positive when wind is from ahead (cos component)
  const headwind = Math.round(windSpeed * Math.cos(radians));
  
  // Crosswind (sin component)
  const crosswindValue = windSpeed * Math.sin(radians);
  const crosswind = Math.abs(Math.round(crosswindValue));
  
  // Determine crosswind direction (from pilot's perspective)
  const crosswindDir: 'L' | 'R' = crosswindValue > 0 ? 'R' : 'L';
  
  return { headwind, crosswind, crosswindDir };
}

function getBestRunway(
  runways: Array<{ id: string; alignment: number }>,
  windDir: number,
  windSpeed: number
): WindComponents {
  let best: WindComponents | null = null;
  
  for (const runway of runways) {
    // Each runway has two directions
    const headings = [runway.alignment, (runway.alignment + 180) % 360];
    
    for (const heading of headings) {
      const components = calculateWindComponents(windDir, windSpeed, heading);
      
      // Best runway has most headwind (least tailwind) and least crosswind
      if (
        !best ||
        components.headwind > best.headwind ||
        (components.headwind === best.headwind && components.crosswind < best.crosswind)
      ) {
        const runwayNum = Math.round(heading / 10);
        const runwayId = runwayNum < 10 ? `0${runwayNum}` : `${runwayNum}`;
        best = {
          ...components,
          runwayId,
          runwayHeading: heading,
        };
      }
    }
  }
  
  return best || {
    headwind: 0,
    crosswind: 0,
    crosswindDir: 'R',
    runwayId: '00',
    runwayHeading: 0,
  };
}

export function WindCompass({ icao, label, windDir, windSpeed, windGust, runways }: WindCompassProps) {
  const isVariable = windDir === 'VRB' || typeof windDir === 'string';
  const windDirection = typeof windDir === 'number' ? windDir : 0;
  const speed = windSpeed || 0;

  const windComponents = useMemo(() => {
    if (!runways.length || isVariable) {
      return {
        headwind: 0,
        crosswind: 0,
        crosswindDir: 'R' as const,
        runwayId: runways[0]?.id?.split('/')[0] || '00',
        runwayHeading: runways[0]?.alignment || 0,
      };
    }
    return getBestRunway(runways, windDirection, speed);
  }, [runways, windDirection, speed, isVariable]);

  // SVG dimensions
  const size = 280;
  const center = size / 2;
  const radius = 100;
  
  // Runway rectangle dimensions
  const runwayLength = 80;
  const runwayWidth = 24;
  
  // Calculate runway rotation (SVG rotates clockwise, compass is clockwise from north)
  const runwayRotation = windComponents.runwayHeading;
  
  // Wind arrow position (from the wind direction, pointing inward)
  const windArrowLength = 40;
  const windArrowAngle = ((windDirection - 90) * Math.PI) / 180;
  const windArrowStart = {
    x: center + (radius + 10) * Math.cos(windArrowAngle),
    y: center + (radius + 10) * Math.sin(windArrowAngle),
  };
  const windArrowEnd = {
    x: center + (radius - windArrowLength) * Math.cos(windArrowAngle),
    y: center + (radius - windArrowLength) * Math.sin(windArrowAngle),
  };

  return (
    <div className="bg-[hsl(var(--card))]/80 backdrop-blur-sm rounded-xl p-4 border border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground font-medium">
          {icao} - {label}
        </span>
        <div className="bg-[hsl(var(--muted))] px-3 py-1 rounded-lg">
          <span className="text-info font-mono font-bold">
            {isVariable ? 'VRB' : `${windDirection.toString().padStart(3, '0')}°`}
          </span>
          <span className="text-muted-foreground"> / </span>
          <span className="text-warning font-mono font-bold">{speed}kt</span>
          {windGust && (
            <>
              <span className="text-muted-foreground"> G</span>
              <span className="text-destructive font-mono font-bold">{windGust}kt</span>
            </>
          )}
        </div>
      </div>

      {/* Diagram */}
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
            const innerR = radius - 8;
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
            { label: 'N', deg: 0, isNorth: true },
            { label: 'E', deg: 90, isNorth: false },
            { label: 'S', deg: 180, isNorth: false },
            { label: 'W', deg: 270, isNorth: false },
          ].map(({ label, deg, isNorth }) => {
            const angle = ((deg - 90) * Math.PI) / 180;
            const textR = radius + 20;
            const x = center + textR * Math.cos(angle);
            const y = center + textR * Math.sin(angle);
            return (
              <text
                key={label}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isNorth ? 'hsl(var(--info))' : 'hsl(var(--muted-foreground))'}
                fontSize="14"
                fontWeight="bold"
              >
                {label}
              </text>
            );
          })}
          
          {/* Runway */}
          <g transform={`rotate(${runwayRotation}, ${center}, ${center})`}>
            {/* Runway rectangle */}
            <rect
              x={center - runwayWidth / 2}
              y={center - runwayLength / 2}
              width={runwayWidth}
              height={runwayLength}
              fill="hsl(var(--muted))"
              rx="2"
            />
            
            {/* Runway center line */}
            <line
              x1={center}
              y1={center - runwayLength / 2 + 8}
              x2={center}
              y2={center - runwayLength / 2 + 20}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="2"
            />
            <line
              x1={center}
              y1={center + runwayLength / 2 - 8}
              x2={center}
              y2={center + runwayLength / 2 - 20}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="2"
            />
            
            {/* Threshold stripes */}
            {[-6, -2, 2, 6].map((offset) => (
              <line
                key={offset}
                x1={center + offset}
                y1={center - runwayLength / 2 + 5}
                x2={center + offset}
                y2={center - runwayLength / 2 + 12}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="1"
              />
            ))}
            {[-6, -2, 2, 6].map((offset) => (
              <line
                key={`bottom-${offset}`}
                x1={center + offset}
                y1={center + runwayLength / 2 - 5}
                x2={center + offset}
                y2={center + runwayLength / 2 - 12}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="1"
              />
            ))}
            
            {/* Runway numbers */}
            <text
              x={center}
              y={center - 15}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="hsl(var(--foreground))"
              fontSize="12"
              fontWeight="bold"
              transform={`rotate(180, ${center}, ${center - 15})`}
            >
              {windComponents.runwayId}
            </text>
            <text
              x={center}
              y={center + 15}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="hsl(var(--foreground))"
              fontSize="12"
              fontWeight="bold"
            >
              {((parseInt(windComponents.runwayId) + 18) % 36 || 36).toString().padStart(2, '0')}
            </text>
          </g>
          
          {/* Wind arrow */}
          {!isVariable && speed > 0 && (
            <>
              <defs>
                <marker
                  id={`windArrowHead-${icao}-${label}`}
                  markerWidth="10"
                  markerHeight="10"
                  refX="5"
                  refY="5"
                  orient="auto"
                >
                  <polygon
                    points="0,0 10,5 0,10"
                    fill="hsl(var(--info))"
                  />
                </marker>
              </defs>
              <line
                x1={windArrowStart.x}
                y1={windArrowStart.y}
                x2={windArrowEnd.x}
                y2={windArrowEnd.y}
                stroke="hsl(var(--info))"
                strokeWidth="3"
                markerEnd={`url(#windArrowHead-${icao}-${label})`}
              />
              
              {/* Wind speed label */}
              <text
                x={windArrowStart.x}
                y={windArrowStart.y + (windArrowStart.y > center ? 15 : -10)}
                textAnchor="middle"
                fill="hsl(var(--info))"
                fontSize="12"
                fontWeight="bold"
              >
                {speed}kt
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Wind Components */}
      <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-border/50">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Headwind</p>
          <p className={`text-lg font-bold ${windComponents.headwind >= 0 ? 'text-success' : 'text-destructive'}`}>
            {windComponents.headwind >= 0 ? windComponents.headwind : Math.abs(windComponents.headwind)} kt
            {windComponents.headwind < 0 && <span className="text-xs ml-1">(tailwind)</span>}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Crosswind {windComponents.crosswindDir}
          </p>
          <p className="text-lg font-bold text-warning">{windComponents.crosswind} kt</p>
        </div>
      </div>
    </div>
  );
}
