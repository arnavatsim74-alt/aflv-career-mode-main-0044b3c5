import { Radio, RefreshCw, AlertCircle, Wifi, Server, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useInfiniteFlightATIS } from '@/hooks/useInfiniteFlightATIS';
import { useState } from 'react';

interface ATISCardProps {
  icao: string;
  label: 'Departure' | 'Arrival';
}

export function ATISCard({ icao, label }: ATISCardProps) {
  const { data, loading, error, refetch } = useInfiniteFlightATIS(icao);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Radio className="h-5 w-5 text-primary animate-pulse" />
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

  // Safely extract ATIS text with proper type checking
  const atisText = data?.atis && 
                   typeof data.atis === 'object' && 
                   'atis' in data.atis &&
                   typeof data.atis.atis === 'string'
    ? data.atis.atis.trim()
    : null;
  
  const hasATIS = atisText && atisText.length > 0;
  const hasDiagnostics = data?.diagnostics && Array.isArray(data.diagnostics);

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
        <div className="flex items-center gap-2">
          {hasDiagnostics && !hasATIS && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="hover:bg-primary/10"
              title="Show diagnostics"
            >
              <Bug className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refetch}
            className="hover:bg-primary/10"
            title="Refresh ATIS"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {hasATIS ? (
        <div className="space-y-3">
          {/* ATIS Message */}
          <div className="bg-slate-900/50 rounded-lg p-3 font-mono text-sm text-slate-100 leading-relaxed whitespace-pre-wrap border border-slate-700/50">
            {atisText}
          </div>
          
          {/* Session and Airport Info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {data?.session?.name && (
              <span className="flex items-center gap-1">
                <Server className="h-3 w-3" />
                <span className="font-medium">Server:</span>
                <span className="text-slate-300">{data.session.name}</span>
              </span>
            )}
            {data?.airport && (
              <span className="flex items-center gap-1">
                <Radio className="h-3 w-3" />
                <span className="font-medium">Airport:</span>
                <span className="text-slate-300">{data.airport}</span>
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <Radio className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground font-medium mb-1">
            {data?.message || `No ATIS available for ${icao}`}
          </p>
          
          {data?.sessions && data.sessions.length > 0 && (
            <div className="mt-3 p-2 bg-muted/50 rounded-md">
              <p className="text-xs text-muted-foreground/80 mb-1">
                Active Infinite Flight servers:
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {data.sessions.map(s => s.name).join(', ')}
              </p>
            </div>
          )}

          {/* Diagnostics Section */}
          {hasDiagnostics && showDiagnostics && (
            <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Bug className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold text-amber-500">Diagnostics</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {data.diagnostics.map((diag: any, idx: number) => (
                  <div key={idx} className="text-xs font-mono bg-black/30 p-2 rounded border border-slate-700/30">
                    <div className="text-slate-300 font-semibold mb-1">
                      {diag.sessionName} ({diag.sessionId})
                    </div>
                    <div className="text-slate-400 space-y-0.5">
                      <div>Status: {diag.status}</div>
                      {diag.errorCode !== undefined && (
                        <div>Error Code: {diag.errorCode}</div>
                      )}
                      <div>Has Result: {diag.hasResult ? 'Yes' : 'No'}</div>
                      {diag.resultData && (
                        <div className="mt-1 text-slate-500">
                          Result: {JSON.stringify(diag.resultData, null, 2)}
                        </div>
                      )}
                      {diag.error && (
                        <div className="text-red-400">Error: {diag.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {data?.error && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-destructive/80">
              <AlertCircle className="h-3 w-3" />
              <span>{data.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
