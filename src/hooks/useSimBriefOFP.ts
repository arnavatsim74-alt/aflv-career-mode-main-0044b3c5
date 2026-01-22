import { useState, useCallback } from 'react';

export interface OFPData {
  general: {
    flight_number: string;
    route: string;
    air_distance: string;
    gc_distance: string;
    initial_altitude: string;
    costindex: string;
    cruise_mach: string;
    cruise_tas: string;
    climb_profile: string;
    descent_profile: string;
    sid_ident: string;
    star_ident: string;
  };
  origin: {
    icao_code: string;
    name: string;
    plan_rwy: string;
    metar: string;
    taf: string;
    metar_category: string;
  };
  destination: {
    icao_code: string;
    name: string;
    plan_rwy: string;
    metar: string;
    taf: string;
    metar_category: string;
  };
  alternate: {
    icao_code: string;
    metar: string;
  };
  aircraft: {
    icaocode: string;
    name: string;
  };
  atc: {
    callsign: string;
    flightplan_text: string;
  };
  times: {
    est_time_enroute: string;
  };
  fuel: {
    enroute_burn: string;
    contingency: string;
    alternate_burn: string;
    reserve: string;
    extra: string;
    taxi: string;
    plan_ramp: string;
    avg_fuel_flow: string;
  };
  weights: {
    oew: string;
    pax_count: string;
    cargo: string;
    payload: string;
    est_zfw: string;
    max_zfw: string;
    est_tow: string;
    max_tow: string;
    est_ldw: string;
    max_ldw: string;
  };
  navlog: Array<{
    ident: string;
    via_airway: string;
    altitude_feet: string;
    wind_dir: string;
    wind_spd: string;
    distance: string;
    time_total: string;
    fuel_plan_onboard: string;
  }>;
  images: {
    maps: Array<{
      name: string;
      fullUrl: string;
    }>;
  };
  links: {
    skyvector: string;
  };
}

export interface GenerateOFPParams {
  // Required parameters
  type: string;      // Aircraft type (e.g., 'A320', 'B738')
  orig: string;      // Origin ICAO (e.g., 'UUEE')
  dest: string;      // Destination ICAO (e.g., 'LFPG')
  
  // Optional basic parameters
  airline?: string;  // Airline code (e.g., 'AFL')
  fltnum?: string;   // Flight number (e.g., '1234')
  date?: string;     // Date format: 11JUL13
  deph?: string;     // Departure hour (e.g., '16')
  depm?: string;     // Departure minute (e.g., '30')
  route?: string;    // Custom route
  steh?: string;     // Scheduled time enroute hour
  stem?: string;     // Scheduled time enroute minute
  reg?: string;      // Aircraft registration
  fin?: string;      // Fin number
  selcal?: string;   // SELCAL code
  callsign?: string; // ATC callsign
  pax?: number;      // Number of passengers
  altn?: string;     // Alternate airport ICAO
  fl?: string;       // Flight level (e.g., '34000' or 'FL340')
  cpt?: string;      // Captain name
  dxname?: string;   // Dispatcher name
  pid?: string;      // Pilot ID
  fuelfactor?: string; // Fuel factor (e.g., 'P00')
  manualzfw?: string;  // Manual ZFW
  addedfuel?: string;  // Extra fuel amount
  addedfuel_units?: 'wgt' | 'min'; // Extra fuel units
  contpct?: string;    // Contingency fuel percentage or minutes
  resvrule?: string;   // Reserve fuel in minutes
  taxiout?: string;    // Taxi out time in minutes
  taxiin?: string;     // Taxi in time in minutes
  cargo?: number;      // Cargo weight
  origrwy?: string;    // Departure runway
  destrwy?: string;    // Arrival runway
  climb?: string;      // Climb profile (e.g., '250/300/78')
  descent?: string;    // Descent profile (e.g., '84/280/250')
  cruise?: string;     // Cruise profile (e.g., 'LRC', 'CI')
  civalue?: string;    // Cost index value
  acdata?: string;     // Aircraft data JSON string
  etopsrule?: string;  // ETOPS rule (e.g., '180')
  altn_count?: number; // Number of alternates
  static_id?: string;  // Static ID for persistent reference
  manualrmk?: string;  // Custom remarks
  
  // OFP Options
  planformat?: string; // Plan format (e.g., 'LIDO')
  units?: 'LBS' | 'KGS'; // Weight units
  navlog?: 0 | 1;      // Detailed navlog
  etops?: 0 | 1;       // ETOPS planning
  stepclimbs?: 0 | 1;  // Plan stepclimbs
  tlr?: 0 | 1;         // Runway analysis
  notams?: 0 | 1;      // Include NOTAMs
  firnot?: 0 | 1;      // FIR NOTAMs
  maps?: 'detail' | 'simple' | 'none'; // Flight maps
  omit_sids?: 0 | 1;   // Disable SIDs
  omit_stars?: 0 | 1;  // Disable STARs
  find_sidstar?: 'R' | 'C'; // Auto-insert SID/STARs (R=RNAV, C=Conventional)
}

/**
 * MD5 hash implementation for OFP ID generation
 * Returns first 10 characters as per SimBrief specification
 */
function md5(str: string): string {
  const rotateLeft = (val: number, shift: number) => (val << shift) | (val >>> (32 - shift));
  
  const addUnsigned = (x: number, y: number) => {
    const x8 = x & 0x80000000;
    const y8 = y & 0x80000000;
    const x4 = x & 0x40000000;
    const y4 = y & 0x40000000;
    const result = (x & 0x3FFFFFFF) + (y & 0x3FFFFFFF);
    
    if (x4 & y4) return result ^ 0x80000000 ^ x8 ^ y8;
    if (x4 | y4) {
      if (result & 0x40000000) return result ^ 0xC0000000 ^ x8 ^ y8;
      return result ^ 0x40000000 ^ x8 ^ y8;
    }
    return result ^ x8 ^ y8;
  };

  const F = (x: number, y: number, z: number) => (x & y) | (~x & z);
  const G = (x: number, y: number, z: number) => (x & z) | (y & ~z);
  const H = (x: number, y: number, z: number) => x ^ y ^ z;
  const I = (x: number, y: number, z: number) => y ^ (x | ~z);

  const FF = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };

  const GG = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };

  const HH = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };

  const II = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };

  const convertToWordArray = (str: string) => {
    const lWordCount: number[] = [];
    const lMessageLength = str.length;
    const lNumberOfWords = ((lMessageLength + 8 - (lMessageLength + 8) % 64) / 64 + 1) * 16;
    
    for (let i = 0; i < lNumberOfWords; i++) lWordCount[i] = 0;
    
    for (let i = 0; i < lMessageLength; i++) {
      const lBytePosition = (i % 4) * 8;
      const lWordCount_idx = (i - i % 4) / 4;
      lWordCount[lWordCount_idx] = lWordCount[lWordCount_idx] | (str.charCodeAt(i) << lBytePosition);
    }
    
    lWordCount[(lMessageLength - lMessageLength % 4) / 4] |= 0x80 << (lMessageLength % 4) * 8;
    lWordCount[lNumberOfWords - 2] = lMessageLength << 3;
    lWordCount[lNumberOfWords - 1] = lMessageLength >>> 29;
    
    return lWordCount;
  };

  const wordToHex = (val: number) => {
    let hex = '';
    for (let i = 0; i <= 3; i++) {
      const byte = (val >>> (i * 8)) & 255;
      hex += ('0' + byte.toString(16)).slice(-2);
    }
    return hex;
  };

  const x = convertToWordArray(str);
  let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;

  const S11=7, S12=12, S13=17, S14=22;
  const S21=5, S22=9, S23=14, S24=20;
  const S31=4, S32=11, S33=16, S34=23;
  const S41=6, S42=10, S43=15, S44=21;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    
    a=FF(a,b,c,d,x[k+0],S11,0xD76AA478); d=FF(d,a,b,c,x[k+1],S12,0xE8C7B756);
    c=FF(c,d,a,b,x[k+2],S13,0x242070DB); b=FF(b,c,d,a,x[k+3],S14,0xC1BDCEEE);
    a=FF(a,b,c,d,x[k+4],S11,0xF57C0FAF); d=FF(d,a,b,c,x[k+5],S12,0x4787C62A);
    c=FF(c,d,a,b,x[k+6],S13,0xA8304613); b=FF(b,c,d,a,x[k+7],S14,0xFD469501);
    a=FF(a,b,c,d,x[k+8],S11,0x698098D8); d=FF(d,a,b,c,x[k+9],S12,0x8B44F7AF);
    c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1); b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
    a=FF(a,b,c,d,x[k+12],S11,0x6B901122); d=FF(d,a,b,c,x[k+13],S12,0xFD987193);
    c=FF(c,d,a,b,x[k+14],S13,0xA679438E); b=FF(b,c,d,a,x[k+15],S14,0x49B40821);
    
    a=GG(a,b,c,d,x[k+1],S21,0xF61E2562); d=GG(d,a,b,c,x[k+6],S22,0xC040B340);
    c=GG(c,d,a,b,x[k+11],S23,0x265E5A51); b=GG(b,c,d,a,x[k+0],S24,0xE9B6C7AA);
    a=GG(a,b,c,d,x[k+5],S21,0xD62F105D); d=GG(d,a,b,c,x[k+10],S22,0x2441453);
    c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681); b=GG(b,c,d,a,x[k+4],S24,0xE7D3FBC8);
    a=GG(a,b,c,d,x[k+9],S21,0x21E1CDE6); d=GG(d,a,b,c,x[k+14],S22,0xC33707D6);
    c=GG(c,d,a,b,x[k+3],S23,0xF4D50D87); b=GG(b,c,d,a,x[k+8],S24,0x455A14ED);
    a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905); d=GG(d,a,b,c,x[k+2],S22,0xFCEFA3F8);
    c=GG(c,d,a,b,x[k+7],S23,0x676F02D9); b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
    
    a=HH(a,b,c,d,x[k+5],S31,0xFFFA3942); d=HH(d,a,b,c,x[k+8],S32,0x8771F681);
    c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122); b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
    a=HH(a,b,c,d,x[k+1],S31,0xA4BEEA44); d=HH(d,a,b,c,x[k+4],S32,0x4BDECFA9);
    c=HH(c,d,a,b,x[k+7],S33,0xF6BB4B60); b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
    a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6); d=HH(d,a,b,c,x[k+0],S32,0xEAA127FA);
    c=HH(c,d,a,b,x[k+3],S33,0xD4EF3085); b=HH(b,c,d,a,x[k+6],S34,0x4881D05);
    a=HH(a,b,c,d,x[k+9],S31,0xD9D4D039); d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5);
    c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8); b=HH(b,c,d,a,x[k+2],S34,0xC4AC5665);
    
    a=II(a,b,c,d,x[k+0],S41,0xF4292244); d=II(d,a,b,c,x[k+7],S42,0x432AFF97);
    c=II(c,d,a,b,x[k+14],S43,0xAB9423A7); b=II(b,c,d,a,x[k+5],S44,0xFC93A039);
    a=II(a,b,c,d,x[k+12],S41,0x655B59C3); d=II(d,a,b,c,x[k+3],S42,0x8F0CCC92);
    c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D); b=II(b,c,d,a,x[k+1],S44,0x85845DD1);
    a=II(a,b,c,d,x[k+8],S41,0x6FA87E4F); d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0);
    c=II(c,d,a,b,x[k+6],S43,0xA3014314); b=II(b,c,d,a,x[k+13],S44,0x4E0811A1);
    a=II(a,b,c,d,x[k+4],S41,0xF7537E82); d=II(d,a,b,c,x[k+11],S42,0xBD3AF235);
    c=II(c,d,a,b,x[k+2],S43,0x2AD7D2BB); b=II(b,c,d,a,x[k+9],S44,0xEB86D391);
    
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }

  const result = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
  return result.toUpperCase().substr(0, 10);
}

export function useSimBriefOFP() {
  const [ofpData, setOfpData] = useState<OFPData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch the latest OFP for a user by their SimBrief Pilot ID
   */
  const fetchOFP = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = `https://www.simbrief.com/api/xml.fetcher.php?userid=${userId}&json=1`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch OFP: ${response.statusText}`);
      }

      const data = await response.json();
      setOfpData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching OFP:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate a new OFP using the SimBrief Dispatch API
   * Opens dispatch window and monitors for completion
   */
  const generateOFP = useCallback(async (params: GenerateOFPParams) => {
    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });

      const url = `http://www.simbrief.com/ofp/ofp.loader.api.php?${queryParams.toString()}`;
      
      // Open SimBrief dispatch in a popup window
      const dispatchWindow = window.open(
        url,
        'SBDispatch',
        'width=800,height=600,scrollbars=yes,resizable=yes'
      );

      if (!dispatchWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Return a promise that resolves when the window is closed
      return new Promise<void>((resolve, reject) => {
        const checkWindow = setInterval(() => {
          if (dispatchWindow.closed) {
            clearInterval(checkWindow);
            setLoading(false);
            resolve();
          }
        }, 500);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkWindow);
          if (!dispatchWindow.closed) {
            dispatchWindow.close();
          }
          setLoading(false);
          reject(new Error('OFP generation timeout'));
        }, 300000);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error generating OFP:', err);
      setLoading(false);
      throw err;
    }
  }, []);

  /**
   * Generate OFP and automatically fetch it after completion
   */
  const generateAndFetchOFP = useCallback(async (params: GenerateOFPParams, userId: string, delayMs: number = 3000) => {
    try {
      // Generate OFP (waits for window to close)
      await generateOFP(params);
      
      // Wait for SimBrief to process
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      // Fetch the generated OFP
      await fetchOFP(userId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    }
  }, [generateOFP, fetchOFP]);

  /**
   * Clear the current OFP data
   */
  const clearOFP = useCallback(() => {
    setOfpData(null);
    setError(null);
  }, []);

  return {
    ofpData,
    loading,
    error,
    fetchOFP,
    generateOFP,
    generateAndFetchOFP,
    clearOFP,
  };
  }
