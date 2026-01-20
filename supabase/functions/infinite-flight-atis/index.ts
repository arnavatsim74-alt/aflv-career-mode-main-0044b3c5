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

    console.log(`Fetching ATIS for ${icao} on Expert Server only`);

    // STEP 1: Get all active sessions
    const sessionsUrl = `https://api.infiniteflight.com/public/v2/sessions?apikey=${IF_API_KEY}`;
    console.log("Step 1: Fetching all sessions...");
    
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

    // Filter for Expert Server only (type 2 is Expert Server)
    const expertServer = sessionsData.result.find((session: any) => session.type === 2);
    
    if (!expertServer) {
      console.log("Expert Server not found");
      return json({
        atis: null,
        message: "Expert Server is not currently active",
        availableServers: sessionsData.result.map((s: any) => ({ 
          name: s.name, 
          type: s.type 
        }))
      });
    }

    console.log(`Found Expert Server: ${expertServer.name} (ID: ${expertServer.id})`);

    // STEP 2: Get ATIS for the airport on Expert Server
    const atisUrl = `https://api.infiniteflight.com/public/v2/sessions/${expertServer.id}/airport/${icao.toUpperCase()}/atis?apikey=${IF_API_KEY}`;
    console.log(`Step 2: Fetching ATIS from Expert Server for ${icao.toUpperCase()}...`);
    
    const atisResponse = await fetch(atisUrl);
    
    if (!atisResponse.ok) {
      console.error(`ATIS API error: ${atisResponse.status}`);
      return json({ 
        error: "Failed to fetch ATIS from Expert Server", 
        status: atisResponse.status 
      }, { status: atisResponse.status });
    }

    const atisData = await atisResponse.json();
    console.log("ATIS response:", JSON.stringify(atisData));

    if (atisData.errorCode === 0 && atisData.result) {
      return json({
        atis: atisData.result,
        session: {
          id: expertServer.id,
          name: expertServer.name,
          type: expertServer.type
        },
        airport: icao.toUpperCase()
      });
    } else {
      return json({
        atis: null,
        message: `No ATIS available for ${icao.toUpperCase()} on Expert Server`,
        session: {
          id: expertServer.id,
          name: expertServer.name,
          type: expertServer.type
        }
      });
    }

  } catch (error) {
    console.error("Error in infinite-flight-atis function:", error);
    return json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
});
