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

  const hasATIS = data?.atis;

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
          <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm text-card-foreground leading-relaxed">
            {data.atis.atis}
          </div>

          {/* Session Info */}
          {data.session && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="font-medium">Server:</span>
                {data.session.name}
              </span>
              <span className="flex items-center gap-1">
                <span className="font-medium">Frequency ID:</span>
                {data.atis.frequencyId}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <Radio className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            {data?.message || 'No ATIS available'}
          </p>
          {data?.sessions && data.sessions.length > 0 && (
            <p className="text-xs text-muted-foreground/70 mt-2">
              Active servers: {data.sessions.map(s => s.name).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
