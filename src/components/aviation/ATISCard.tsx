import { Radio, RefreshCw, AlertCircle, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useInfiniteFlightATIS } from '@/hooks/useInfiniteFlightATIS';

interface ATISCardProps {
  icao: string;
  label: 'Departure' | 'Arrival';
}

export function ATISCard({ icao, label }: ATISCardProps) {
  const { data, loading, error, refetch } = useInfiniteFlightATIS(icao);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Radio className="h-5 w-5 text-primary" />
          <span className="font-medium text-card-foreground">{label} ATIS - {icao}</span>
        </div>
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-destructive" />
            <span className="font-medium text-card-foreground">{label} ATIS - {icao}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // Check if ATIS data exists and has actual message content
  // The response structure is: { atis: "string", session: {...}, airport: "ICAO" }
  const hasATIS = data?.atis && typeof data.atis === 'string' && data.atis.trim().length > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className={`h-5 w-5 ${hasATIS ? 'text-success' : 'text-muted-foreground'}`} />
          <span className="font-medium text-card-foreground">{label} ATIS - {icao}</span>
          {hasATIS && (
            <span className="bg-success/20 text-success text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              LIVE
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {hasATIS ? (
        <div className="space-y-3">
          {/* ATIS Message */}
          <div className="bg-slate-900/50 rounded-lg p-3 font-mono text-sm text-slate-100 leading-relaxed whitespace-pre-wrap border border-slate-700/50">
            {data.atis}
          </div>
          
          {/* Session and Airport Info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {data.session?.name && (
              <span className="flex items-center gap-1">
                <span className="font-medium">Server:</span>
                {data.session.name}
              </span>
            )}
            {data.airport && (
              <span className="flex items-center gap-1">
                <span className="font-medium">Airport:</span>
                {data.airport}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <Radio className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            {data?.message || `No ATIS available for ${icao}`}
          </p>
          {data?.sessions && data.sessions.length > 0 && (
            <p className="text-xs text-muted-foreground/70 mt-2">
              Active servers: {data.sessions.map(s => s.name).join(', ')}
            </p>
          )}
          {data?.error && (
            <p className="text-xs text-destructive/70 mt-2">
              {data.error}
            </p>
          )}
          {/* Debug info - remove in production */}
          {data && (
            <details className="mt-3 text-left">
              <summary className="text-xs text-muted-foreground/50 cursor-pointer hover:text-muted-foreground">
                Debug Data
              </summary>
              <pre className="text-xs bg-muted/30 p-2 rounded mt-2 overflow-auto max-h-40 text-left">
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
