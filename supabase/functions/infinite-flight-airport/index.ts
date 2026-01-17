const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { icao } = await req.json();
    const apiKey = Deno.env.get('INFINITE_FLIGHT_API_KEY');

    if (!apiKey) {
      console.error('INFINITE_FLIGHT_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Infinite Flight API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!icao) {
      return new Response(
        JSON.stringify({ success: false, error: 'ICAO code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedIcao = icao.toUpperCase().trim();
    const url = `https://api.infiniteflight.com/public/v2/airport/${formattedIcao}?apikey=${apiKey}`;

    console.log(`Fetching airport info for: ${formattedIcao}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AFLV-Operations/1.0',
      },
    });

    if (!response.ok) {
      console.error(`Infinite Flight API error: ${response.status}`);
      return new Response(
        JSON.stringify({ success: false, error: `API request failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`Successfully fetched airport info for ${formattedIcao}`);

    return new Response(
      JSON.stringify({ success: true, data: data.result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching airport info:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch airport info';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
