import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MetarData {
  icaoId: string;
  rawOb: string;
  reportTime: string;
  temp: number | null;
  dewp: number | null;
  wdir: number | string | null;
  wspd: number | null;
  wgst: number | null;
  visib: number | string | null;
  altim: number | null;
  slp: number | null;
  wxString: string | null;
  fltCat: string | null;
  clouds: Array<{ cover: string; base: number }>;
  vertVis: number | null;
  lat: number;
  lon: number;
  elev: number;
  name: string;
}

export interface RunwayData {
  id: string;
  dimension: string;
  surface: string;
  alignment: number;
}

export interface AirportData {
  icaoId: string;
  iataId: string | null;
  name: string;
  state: string | null;
  country: string;
  type: string;
  lat: number;
  lon: number;
  elev: number;
  magdec: string | null;
  runways: RunwayData[];
  freqs: string | null;
}

interface AviationDataState {
  metar: MetarData | null;
  airport: AirportData | null;
  loading: boolean;
  error: string | null;
}

export function useAviationData(icao: string | null) {
  const [state, setState] = useState<AviationDataState>({
    metar: null,
    airport: null,
    loading: false,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (!icao) {
      setState({ metar: null, airport: null, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch both METAR and airport data in parallel
      const [metarResponse, airportResponse] = await Promise.all([
        supabase.functions.invoke('aviation-weather', {
          body: { icao, type: 'metar' },
        }),
        supabase.functions.invoke('aviation-weather', {
          body: { icao, type: 'airport' },
        }),
      ]);

      let metar: MetarData | null = null;
      let airport: AirportData | null = null;

      if (metarResponse.data?.success && metarResponse.data.data?.length > 0) {
        metar = metarResponse.data.data[0];
      }

      if (airportResponse.data?.success && airportResponse.data.data?.length > 0) {
        airport = airportResponse.data.data[0];
      }

      setState({
        metar,
        airport,
        loading: false,
        error: !metar && !airport ? 'No data available for this airport' : null,
      });
    } catch (error) {
      console.error('Error fetching aviation data:', error);
      setState({
        metar: null,
        airport: null,
        loading: false,
        error: 'Failed to fetch aviation data',
      });
    }
  }, [icao]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}
