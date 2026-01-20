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

  // FILTER FOR EXPERT SERVER ONLY
  // Only accept data if it's from Expert Server (session.name === "Expert")
  const isExpertServer = data?.session?.name === "Expert";
  
  // Extract ATIS text only if from Expert Server
  const atisText = isExpertServer && data?.atis && typeof data.atis === 'object' && 'atis' in data.atis 
    ? data.atis.atis 
    : null;
  const hasATIS = atisText && typeof atisText === 'string' && atisText.trim().length > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className={`h-5 w-5 ${hasATIS ? 'text-success' : 'text-muted-foreground'}`} />
          <span className="font-medium text-card-foreground">{label} ATIS - {icao}</span>
          {hasATIS && (
            <span className="bg-success/20 text-success text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              EXPERT
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
            {atisText}
          </div>
          
          {/* Session and Airport Info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 text-success">
              <span className="font-medium">Server:</span>
              Expert Server
            </span>
            {data?.airport && (
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
            {!isExpertServer && data?.session?.name 
              ? `ATIS found on ${data.session.name} - Expert Server only`
              : `No ATIS available for ${icao} on Expert Server`}
          </p>
          {!isExpertServer && data?.session?.name && (
            <p className="text-xs text-amber-500/70 mt-2">
              ⚠️ Showing Expert Server only - ATIS available on {data.session.name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
