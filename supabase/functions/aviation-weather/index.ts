const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { icao, type } = await req.json();

    if (!icao || !type) {
      return new Response(
        JSON.stringify({ success: false, error: 'ICAO code and type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedIcao = icao.toUpperCase().trim();
    let url: string;

    if (type === 'metar') {
      url = `https://aviationweather.gov/api/data/metar?ids=${formattedIcao}&format=json`;
    } else if (type === 'airport') {
      url = `https://aviationweather.gov/api/data/airport?ids=${formattedIcao}&format=json`;
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid type. Use "metar" or "airport"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching ${type} data for ${formattedIcao}: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AFLV-Operations/1.0',
      },
    });

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ success: false, error: `API request failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`Successfully fetched ${type} data for ${formattedIcao}`);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching aviation data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch aviation data';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
