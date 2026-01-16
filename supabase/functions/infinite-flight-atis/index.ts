import { corsHeaders, json } from "../_shared/http.ts";

const IF_API_KEY = Deno.env.get("INFINITE_FLIGHT_API_KEY");

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!IF_API_KEY) {
      console.error("INFINITE_FLIGHT_API_KEY not configured");
      return json({ error: "API key not configured" }, { status: 500 });
    }

    const { icao } = await req.json();
    
    if (!icao) {
      return json({ error: "ICAO code is required" }, { status: 400 });
    }

    console.log(`Fetching ATIS for ${icao}`);

    // Step 1: Get active sessions
    const sessionsUrl = `https://api.infiniteflight.com/public/v2/sessions?apikey=${IF_API_KEY}`;
    console.log("Fetching sessions...");
    
    const sessionsResponse = await fetch(sessionsUrl);
    
    if (!sessionsResponse.ok) {
      console.error(`Sessions API error: ${sessionsResponse.status}`);
      return json({ 
        error: "Failed to fetch sessions", 
        status: sessionsResponse.status 
      }, { status: sessionsResponse.status });
    }

    const sessionsData = await sessionsResponse.json();
    console.log("Sessions response:", JSON.stringify(sessionsData));

    if (sessionsData.errorCode !== 0 || !sessionsData.result || sessionsData.result.length === 0) {
      return json({ 
        atis: null, 
        message: "No active Infinite Flight sessions" 
      });
    }

    // Try each active session to find ATIS for the airport
    const sessions = sessionsData.result;
    let atisData = null;
    let foundSession = null;

    for (const session of sessions) {
      try {
        const atisUrl = `https://api.infiniteflight.com/public/v2/sessions/${session.id}/airport/${icao.toUpperCase()}/atis?apikey=${IF_API_KEY}`;
        console.log(`Trying ATIS for session ${session.name}: ${atisUrl}`);
        
        const atisResponse = await fetch(atisUrl);
        
        if (atisResponse.ok) {
          const data = await atisResponse.json();
          console.log(`ATIS response for ${session.name}:`, JSON.stringify(data));
          
          if (data.errorCode === 0 && data.result) {
            atisData = data.result;
            foundSession = session;
            break;
          }
        }
      } catch (e) {
        console.log(`Error fetching ATIS from session ${session.name}:`, e);
      }
    }

    if (atisData) {
      return json({
        atis: atisData,
        session: {
          id: foundSession.id,
          name: foundSession.name,
          type: foundSession.type
        },
        airport: icao.toUpperCase()
      });
    } else {
      return json({
        atis: null,
        message: `No ATIS available for ${icao.toUpperCase()} in any active session`,
        sessions: sessions.map((s: { name: string; type: number }) => ({ name: s.name, type: s.type }))
      });
    }

  } catch (error) {
    console.error("Error in infinite-flight-atis function:", error);
    return json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
});
