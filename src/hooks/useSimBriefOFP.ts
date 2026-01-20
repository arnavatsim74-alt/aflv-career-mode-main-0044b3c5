import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OFPData {
  params: {
    request_id: string | null;
    time_generated: string | null;
    airac: string | null;
    units: string | null;
  };
  general: {
    flight_number: string | null;
    cruise_profile: string | null;
    climb_profile: string | null;
    descent_profile: string | null;
    costindex: string | null;
    initial_altitude: string | null;
    avg_wind_comp: string | null;
    avg_wind_dir: string | null;
    avg_wind_spd: string | null;
    gc_distance: string | null;
    route_distance: string | null;
    air_distance: string | null;
    total_burn: string | null;
    cruise_tas: string | null;
    cruise_mach: string | null;
    passengers: string | null;
    route: string | null;
    sid_ident: string | null;
    star_ident: string | null;
  };
  origin: {
    icao_code: string;
    name: string;
    elevation: string;
    plan_rwy: string;
    metar: string;
    metar_category: string;
    taf: string;
    pos_lat: string;
    pos_long: string;
  };
  destination: {
    icao_code: string;
    name: string;
    elevation: string;
    plan_rwy: string;
    metar: string;
    metar_category: string;
    taf: string;
    pos_lat: string;
    pos_long: string;
  };
  alternate: {
    icao_code: string;
    name: string;
    metar: string;
  };
  aircraft: {
    icaocode: string;
    name: string;
    reg: string;
    engines: string;
  };
  fuel: {
    taxi: string | null;
    enroute_burn: string | null;
    contingency: string | null;
    alternate_burn: string | null;
    reserve: string | null;
    extra: string | null;
    plan_takeoff: string | null;
    plan_ramp: string | null;
    plan_landing: string | null;
    avg_fuel_flow: string | null;
    max_tanks: string | null;
  };
  weights: {
    oew: string | null;
    pax_count: string | null;
    cargo: string | null;
    payload: string | null;
    est_zfw: string | null;
    max_zfw: string | null;
    est_tow: string | null;
    max_tow: string | null;
    est_ldw: string | null;
    max_ldw: string | null;
    est_ramp: string | null;
  };
  times: {
    est_time_enroute: string | null;
    sched_time_enroute: string | null;
    taxi_out: string | null;
    taxi_in: string | null;
    endurance: string | null;
  };
  atc: {
    flightplan_text: string;
    callsign: string;
  };
  navlog: Array<{
    ident: string;
    name: string;
    type: string;
    via_airway: string;
    altitude_feet: string;
    wind_dir: string;
    wind_spd: string;
    distance: string;
    time_leg: string;
    time_total: string;
    fuel_plan_onboard: string;
    stage: string;
  }>;
  images: {
    directory: string;
    maps: Array<{
      name: string;
      link: string;
      fullUrl: string;
    }>;
  };
  links: {
    skyvector: string;
  };
}

interface UseSimBriefOFPReturn {
  ofpData: OFPData | null;
  loading: boolean;
  error: string | null;
  fetchOFP: (userid: string) => Promise<void>;
  generateOFP: (params: GenerateParams) => Promise<void>;
}

interface GenerateParams {
  airline?: string;
  fltnum?: string;
  orig: string;
  dest: string;
  type: string;
  pax?: number;
  cargo?: number;
}

export function useSimBriefOFP(): UseSimBriefOFPReturn {
  const [ofpData, setOfpData] = useState<OFPData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateOFP = useCallback(async (params: GenerateParams) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('simbrief-ofp', {
        body: { action: 'generate', params },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to generate OFP');
      }

      console.log('OFP generation initiated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate OFP';
      setError(message);
      console.error('Generate OFP error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOFP = useCallback(async (userid: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('simbrief-ofp', {
        body: { action: 'fetch', params: { userid } },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch OFP');
      }

      setOfpData(data.data as OFPData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch OFP';
      setError(message);
      console.error('Fetch OFP error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { ofpData, loading, error, fetchOFP, generateOFP };
}
