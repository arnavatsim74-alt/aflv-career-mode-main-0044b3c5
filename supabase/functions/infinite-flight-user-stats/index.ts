import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserStatsRequest {
  userIds?: string[];      // Infinite Flight User IDs
  userHashes?: string[];   // Infinite Flight User hashes
  discordId?: string;      // Discord User ID
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('INFINITE_FLIGHT_API_KEY');
    if (!apiKey) {
      throw new Error('INFINITE_FLIGHT_API_KEY not configured');
    }

    const body: UserStatsRequest = await req.json();
    console.log('Fetching user stats for:', body);

    // Build request body for IF API
    const ifRequestBody: any = {};
    
    if (body.userIds && body.userIds.length > 0) {
      ifRequestBody.userIds = body.userIds;
    }
    if (body.userHashes && body.userHashes.length > 0) {
      ifRequestBody.userHashes = body.userHashes;
    }
    if (body.discordId) {
      ifRequestBody.discordId = body.discordId;
    }

    // Validate we have at least one identifier
    if (!ifRequestBody.userIds && !ifRequestBody.userHashes && !ifRequestBody.discordId) {
      throw new Error('At least one identifier (userIds, userHashes, or discordId) is required');
    }

    // Call Infinite Flight User Stats API
    const response = await fetch(
      `https://api.infiniteflight.com/public/v2/users?apikey=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ifRequestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('IF API error:', response.status, errorText);
      throw new Error(`Infinite Flight API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('IF User Stats response:', JSON.stringify(data).substring(0, 500));

    // The API returns { errorCode, result } where result is an array of user stats
    if (data.errorCode !== 0) {
      throw new Error(`IF API returned error code: ${data.errorCode}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        users: data.result || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching IF user stats:', errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
