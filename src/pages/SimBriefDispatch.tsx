import { useEffect, useState } from 'react';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { Plane, ArrowLeft, ExternalLink, Cloud } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { MetarCard } from '@/components/weather/MetarCard';

export default function SimBriefDispatch() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  const origin = searchParams.get('orig') || 'UUEE';
  const destination = searchParams.get('dest') || 'UUEE';
  const flightNumber = searchParams.get('fltnum') || '1234';
  const aircraftType = searchParams.get('type') || 'A320';
  const legId = searchParams.get('legId') || '';

  useEffect(() => {
    // Build SimBrief URL
    const baseUrl = 'https://dispatch.simbrief.com/options/custom';
    const params = new URLSearchParams({
      airline: 'AFL',
      fltnum: flightNumber,
      type: aircraftType,
      orig: origin,
      dest: destination,
    });
    
    setIframeUrl(`${baseUrl}?${params.toString()}`);
  }, [origin, destination, flightNumber, aircraftType]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Plane className="h-8 w-8 animate-pulse text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/dispatch')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dispatch
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Flight Planning: {origin} → {destination}
            </h1>
            <p className="text-sm text-muted-foreground">
              AFL{flightNumber} • {aircraftType}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.open(iframeUrl || '', '_blank')}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Open in New Tab
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
        {iframeUrl ? (
          <iframe
            src={iframeUrl}
            className="w-full h-full border-0"
            title="SimBrief Dispatch"
            allow="clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Plane className="h-8 w-8 animate-pulse text-primary" />
          </div>
        )}
      </div>

      {/* METAR Weather Section */}
      <div className="mt-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
          <Cloud className="h-5 w-5 text-primary" />
          Weather Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetarCard icao={origin} label="Departure" />
          <MetarCard icao={destination} label="Arrival" />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={() => navigate(`/pirep?leg=${legId}`)} className="gap-2">
          <Plane className="h-4 w-4" />
          Proceed to File PIREP
        </Button>
      </div>
    </DashboardLayout>
  );
}
