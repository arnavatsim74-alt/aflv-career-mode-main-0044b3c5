const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateOFPParams {
  airline: string;
  fltnum: string;
  orig: string;
  dest: string;
  type: string;
  pax?: number;
  cargo?: number;
}

interface FetchOFPParams {
  userid: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, params } = await req.json();
    const apiKey = Deno.env.get('SIMBRIEF_API_KEY');

    if (!apiKey) {
      console.error('SIMBRIEF_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'SimBrief API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'generate') {
      // Generate OFP
      const { airline, fltnum, orig, dest, type, pax, cargo } = params as GenerateOFPParams;
      
      if (!orig || !dest || !type) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required parameters: orig, dest, type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const url = new URL('https://www.simbrief.com/ofp/ofp.loader.api.php');
      url.searchParams.set('airline', airline || 'AFL');
      url.searchParams.set('fltnum', fltnum || '001');
      url.searchParams.set('orig', orig.toUpperCase());
      url.searchParams.set('dest', dest.toUpperCase());
      url.searchParams.set('type', type);
      url.searchParams.set('units', 'KGS');
      url.searchParams.set('maps', 'detailed');
      url.searchParams.set('stepclimbs', '1');
      url.searchParams.set('apicode', apiKey);
      
      if (pax) url.searchParams.set('pax', pax.toString());
      if (cargo) url.searchParams.set('cargo', cargo.toString());

      console.log(`Generating OFP: ${orig} -> ${dest} with aircraft ${type}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'AFLV-Operations/1.0',
        },
      });

      if (!response.ok) {
        console.error(`SimBrief generation error: ${response.status}`);
        return new Response(
          JSON.stringify({ success: false, error: `SimBrief API error: ${response.status}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const text = await response.text();
      console.log('OFP generation initiated successfully');
      
      return new Response(
        JSON.stringify({ success: true, message: 'OFP generation initiated', response: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'fetch') {
      // Fetch OFP XML
      const { userid } = params as FetchOFPParams;
      
      if (!userid) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required parameter: userid' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const url = `https://www.simbrief.com/api/xml.fetcher.php?userid=${userid}`;
      console.log(`Fetching OFP for user: ${userid}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'AFLV-Operations/1.0',
        },
      });

      if (!response.ok) {
        console.error(`SimBrief fetch error: ${response.status}`);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to fetch OFP: ${response.status}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const xmlText = await response.text();
      console.log('OFP XML fetched successfully');

      // Parse XML to JSON for easier frontend handling
      const ofpData = parseSimBriefXML(xmlText);

      return new Response(
        JSON.stringify({ success: true, data: ofpData, rawXml: xmlText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action. Use "generate" or "fetch"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('SimBrief OFP error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseSimBriefXML(xml: string): Record<string, unknown> {
  const getValue = (tag: string): string | null => {
    const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
    return match ? match[1] : null;
  };

  const getSection = (tag: string): string | null => {
    const match = xml.match(new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`));
    return match ? match[0] : null;
  };

  const getMultipleValues = (section: string, tag: string): string[] => {
    const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'g');
    const matches = [];
    let match;
    while ((match = regex.exec(section)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  };

  // Parse navlog fixes
  const navlogSection = getSection('navlog') || '';
  const fixes: Record<string, unknown>[] = [];
  const fixMatches = navlogSection.matchAll(/<fix>([\s\S]*?)<\/fix>/g);
  
  for (const fixMatch of fixMatches) {
    const fixContent = fixMatch[1];
    fixes.push({
      ident: fixContent.match(/<ident>([^<]*)<\/ident>/)?.[1] || '',
      name: fixContent.match(/<name>([^<]*)<\/name>/)?.[1] || '',
      type: fixContent.match(/<type>([^<]*)<\/type>/)?.[1] || '',
      via_airway: fixContent.match(/<via_airway>([^<]*)<\/via_airway>/)?.[1] || '',
      altitude_feet: fixContent.match(/<altitude_feet>([^<]*)<\/altitude_feet>/)?.[1] || '',
      wind_dir: fixContent.match(/<wind_dir>([^<]*)<\/wind_dir>/)?.[1] || '',
      wind_spd: fixContent.match(/<wind_spd>([^<]*)<\/wind_spd>/)?.[1] || '',
      distance: fixContent.match(/<distance>([^<]*)<\/distance>/)?.[1] || '',
      time_leg: fixContent.match(/<time_leg>([^<]*)<\/time_leg>/)?.[1] || '',
      time_total: fixContent.match(/<time_total>([^<]*)<\/time_total>/)?.[1] || '',
      fuel_plan_onboard: fixContent.match(/<fuel_plan_onboard>([^<]*)<\/fuel_plan_onboard>/)?.[1] || '',
      stage: fixContent.match(/<stage>([^<]*)<\/stage>/)?.[1] || '',
    });
  }

  // Parse images
  const imagesSection = getSection('images') || '';
  const imageDirectory = imagesSection.match(/<directory>([^<]*)<\/directory>/)?.[1] || '';
  const maps: { name: string; link: string; fullUrl: string }[] = [];
  const mapMatches = imagesSection.matchAll(/<map>([\s\S]*?)<\/map>/g);
  
  for (const mapMatch of mapMatches) {
    const mapContent = mapMatch[1];
    const name = mapContent.match(/<name>([^<]*)<\/name>/)?.[1] || '';
    const link = mapContent.match(/<link>([^<]*)<\/link>/)?.[1] || '';
    maps.push({
      name,
      link,
      fullUrl: imageDirectory + link,
    });
  }

  return {
    params: {
      request_id: getValue('request_id'),
      time_generated: getValue('time_generated'),
      airac: getValue('airac'),
      units: getValue('units'),
    },
    general: {
      flight_number: getValue('flight_number'),
      cruise_profile: getValue('cruise_profile'),
      climb_profile: getValue('climb_profile'),
      descent_profile: getValue('descent_profile'),
      costindex: getValue('costindex'),
      initial_altitude: getValue('initial_altitude'),
      avg_wind_comp: getValue('avg_wind_comp'),
      avg_wind_dir: getValue('avg_wind_dir'),
      avg_wind_spd: getValue('avg_wind_spd'),
      gc_distance: getValue('gc_distance'),
      route_distance: getValue('route_distance'),
      air_distance: getValue('air_distance'),
      total_burn: getValue('total_burn'),
      cruise_tas: getValue('cruise_tas'),
      cruise_mach: getValue('cruise_mach'),
      passengers: getValue('passengers'),
      route: getValue('route'),
      sid_ident: getValue('sid_ident'),
      star_ident: getValue('star_ident'),
    },
    origin: {
      icao_code: xml.match(/<origin>[\s\S]*?<icao_code>([^<]*)<\/icao_code>/)?.[1] || '',
      name: xml.match(/<origin>[\s\S]*?<name>([^<]*)<\/name>/)?.[1] || '',
      elevation: xml.match(/<origin>[\s\S]*?<elevation>([^<]*)<\/elevation>/)?.[1] || '',
      plan_rwy: xml.match(/<origin>[\s\S]*?<plan_rwy>([^<]*)<\/plan_rwy>/)?.[1] || '',
      metar: xml.match(/<origin>[\s\S]*?<metar>([^<]*)<\/metar>/)?.[1] || '',
      metar_category: xml.match(/<origin>[\s\S]*?<metar_category>([^<]*)<\/metar_category>/)?.[1] || '',
      taf: xml.match(/<origin>[\s\S]*?<taf>([^<]*)<\/taf>/)?.[1] || '',
      pos_lat: xml.match(/<origin>[\s\S]*?<pos_lat>([^<]*)<\/pos_lat>/)?.[1] || '',
      pos_long: xml.match(/<origin>[\s\S]*?<pos_long>([^<]*)<\/pos_long>/)?.[1] || '',
    },
    destination: {
      icao_code: xml.match(/<destination>[\s\S]*?<icao_code>([^<]*)<\/icao_code>/)?.[1] || '',
      name: xml.match(/<destination>[\s\S]*?<name>([^<]*)<\/name>/)?.[1] || '',
      elevation: xml.match(/<destination>[\s\S]*?<elevation>([^<]*)<\/elevation>/)?.[1] || '',
      plan_rwy: xml.match(/<destination>[\s\S]*?<plan_rwy>([^<]*)<\/plan_rwy>/)?.[1] || '',
      metar: xml.match(/<destination>[\s\S]*?<metar>([^<]*)<\/metar>/)?.[1] || '',
      metar_category: xml.match(/<destination>[\s\S]*?<metar_category>([^<]*)<\/metar_category>/)?.[1] || '',
      taf: xml.match(/<destination>[\s\S]*?<taf>([^<]*)<\/taf>/)?.[1] || '',
      pos_lat: xml.match(/<destination>[\s\S]*?<pos_lat>([^<]*)<\/pos_lat>/)?.[1] || '',
      pos_long: xml.match(/<destination>[\s\S]*?<pos_long>([^<]*)<\/pos_long>/)?.[1] || '',
    },
    alternate: {
      icao_code: xml.match(/<alternate>[\s\S]*?<icao_code>([^<]*)<\/icao_code>/)?.[1] || '',
      name: xml.match(/<alternate>[\s\S]*?<name>([^<]*)<\/name>/)?.[1] || '',
      metar: xml.match(/<alternate>[\s\S]*?<metar>([^<]*)<\/metar>/)?.[1] || '',
    },
    aircraft: {
      icaocode: xml.match(/<aircraft>[\s\S]*?<icaocode>([^<]*)<\/icaocode>/)?.[1] || '',
      name: xml.match(/<aircraft>[\s\S]*?<name>([^<]*)<\/name>/)?.[1] || '',
      reg: xml.match(/<aircraft>[\s\S]*?<reg>([^<]*)<\/reg>/)?.[1] || '',
      engines: xml.match(/<aircraft>[\s\S]*?<engines>([^<]*)<\/engines>/)?.[1] || '',
    },
    fuel: {
      taxi: getValue('taxi'),
      enroute_burn: getValue('enroute_burn'),
      contingency: getValue('contingency'),
      alternate_burn: getValue('alternate_burn'),
      reserve: getValue('reserve'),
      extra: getValue('extra'),
      plan_takeoff: getValue('plan_takeoff'),
      plan_ramp: getValue('plan_ramp'),
      plan_landing: getValue('plan_landing'),
      avg_fuel_flow: getValue('avg_fuel_flow'),
      max_tanks: getValue('max_tanks'),
    },
    weights: {
      oew: getValue('oew'),
      pax_count: getValue('pax_count'),
      cargo: getValue('cargo'),
      payload: getValue('payload'),
      est_zfw: getValue('est_zfw'),
      max_zfw: getValue('max_zfw'),
      est_tow: getValue('est_tow'),
      max_tow: getValue('max_tow'),
      est_ldw: getValue('est_ldw'),
      max_ldw: getValue('max_ldw'),
      est_ramp: getValue('est_ramp'),
    },
    times: {
      est_time_enroute: getValue('est_time_enroute'),
      sched_time_enroute: getValue('sched_time_enroute'),
      taxi_out: getValue('taxi_out'),
      taxi_in: getValue('taxi_in'),
      endurance: getValue('endurance'),
    },
    atc: {
      flightplan_text: xml.match(/<flightplan_text>([^<]*)<\/flightplan_text>/)?.[1] || '',
      callsign: xml.match(/<atc>[\s\S]*?<callsign>([^<]*)<\/callsign>/)?.[1] || '',
    },
    navlog: fixes,
    images: {
      directory: imageDirectory,
      maps,
    },
    links: {
      skyvector: xml.match(/<skyvector>([^<]*)<\/skyvector>/)?.[1] || '',
    },
  };
}
