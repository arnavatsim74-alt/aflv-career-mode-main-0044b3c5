import { corsHeaders, json } from "../_shared/http.ts";

const IF_API_KEY = Deno.env.get("INFINITE_FLIGHT_API_KEY");

interface InfiniteFlightSession {
  id: string;
  name: string;
  type: number;
  maxUsers: number;
  currentUsers: number;
}

interface ATISResult {
  frequencyId: string;
  airportIcao: string;
  latitude: number;
  longitude: number;
  atis: string;
}

interface SessionsApiResponse {
  errorCode: number;
  result: InfiniteFlightSession[];
}

interface ATISApiResponse {
  errorCode: number;
  result: ATISResult | null;
}

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

    const normalizedIcao = icao.toUpperCase().trim();
    console.log(`\n========================================`);
    console.log(`Fetching ATIS for ${normalizedIcao}`);
    console.log(`========================================\n`);

    // Step 1: Get active sessions
    const sessionsUrl = `https://api.infiniteflight.com/public/v2/sessions?apikey=${IF_API_KEY}`;
    console.log("📡 Fetching active sessions...");
    
    const sessionsResponse = await fetch(sessionsUrl, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store'
    });
    
    if (!sessionsResponse.ok) {
      console.error(`❌ Sessions API error: ${sessionsResponse.status}`);
      return json({ 
        error: "Failed to fetch sessions from Infinite Flight API", 
        status: sessionsResponse.status 
      }, { status: sessionsResponse.status });
    }

    const sessionsData: SessionsApiResponse = await sessionsResponse.json();
    console.log(`✓ Found ${sessionsData.result?.length || 0} active sessions`);
    console.log(`Sessions:`, sessionsData.result?.map(s => `${s.name} (${s.id})`).join(', '));

    // Check for API errors
    if (sessionsData.errorCode !== 0) {
      console.error(`❌ Sessions API returned error code: ${sessionsData.errorCode}`);
      return json({ 
        error: `Infinite Flight API error: ${sessionsData.errorCode}`,
        atis: null 
      }, { status: 500 });
    }

    if (!sessionsData.result || sessionsData.result.length === 0) {
      return json({ 
        atis: null, 
        message: "No active Infinite Flight sessions available" 
      });
    }

    // Step 2: Try each active session to find ATIS for the airport
    const sessions = sessionsData.result;
    let atisData: ATISResult | null = null;
    let foundSession: InfiniteFlightSession | null = null;
    const diagnostics: Array<{
      sessionName: string;
      sessionId: string;
      status: number;
      errorCode?: number;
      hasResult: boolean;
      resultData?: any;
      error?: string;
    }> = [];

    console.log(`\n🔍 Checking each session for ${normalizedIcao} ATIS...\n`);

    for (const session of sessions) {
      try {
        const atisUrl = `https://api.infiniteflight.com/public/v2/sessions/${session.id}/airport/${normalizedIcao}/atis?apikey=${IF_API_KEY}`;
        console.log(`\n📍 Session: "${session.name}" (ID: ${session.id})`);
        console.log(`   URL: ${atisUrl.replace(IF_API_KEY, 'API_KEY_HIDDEN')}`);
        
        const atisResponse = await fetch(atisUrl, {
          headers: {
            'Accept': 'application/json',
          },
          cache: 'no-store'
        });
        
        const status = atisResponse.status;
        console.log(`   Status: ${status}`);
        
        if (!atisResponse.ok) {
          const errorText = await atisResponse.text();
          console.log(`   ❌ Error response: ${errorText}`);
          diagnostics.push({
            sessionName: session.name,
            sessionId: session.id,
            status,
            hasResult: false,
            error: errorText
          });
          continue;
        }

        const data: ATISApiResponse = await atisResponse.json();
        console.log(`   Response errorCode: ${data.errorCode}`);
        console.log(`   Has result: ${!!data.result}`);
        console.log(`   Full response:`, JSON.stringify(data, null, 2));
        
        diagnostics.push({
          sessionName: session.name,
          sessionId: session.id,
          status,
          errorCode: data.errorCode,
          hasResult: !!data.result,
          resultData: data.result
        });
        
        // Check for successful response with valid ATIS data
        // Note: According to IF API docs, errorCode 0 = success
        if (data.errorCode === 0 && data.result) {
          // Check if ATIS text exists and is not empty
          if (data.result.atis && data.result.atis.trim().length > 0) {
            atisData = data.result;
            foundSession = session;
            console.log(`   ✅ FOUND VALID ATIS!`);
            console.log(`   ATIS Text: ${data.result.atis}`);
            break;
          } else {
            console.log(`   ⚠️  Result exists but ATIS text is empty`);
          }
        } else if (data.errorCode !== 0) {
          console.log(`   ⚠️  API returned error code: ${data.errorCode}`);
        }
      } catch (e) {
        console.log(`   ❌ Exception: ${e.message}`);
        diagnostics.push({
          sessionName: session.name,
          sessionId: session.id,
          status: 0,
          hasResult: false,
          error: e.message
        });
        continue;
      }
    }

    console.log(`\n========================================`);
    console.log(`Search complete for ${normalizedIcao}`);
    console.log(`========================================\n`);

    // Step 3: Return results
    if (atisData && foundSession) {
      console.log(`✅ SUCCESS: Returning ATIS from session "${foundSession.name}"`);
      return json({
        atis: atisData,
        session: {
          id: foundSession.id,
          name: foundSession.name,
          type: foundSession.type
        },
        airport: normalizedIcao,
        diagnostics // Include diagnostics for debugging
      });
    } else {
      console.log(`❌ NO ATIS FOUND for ${normalizedIcao} in any session`);
      return json({
        atis: null,
        message: `No ATIS available for ${normalizedIcao} in any active session`,
        sessions: sessions.map(s => ({ 
          name: s.name, 
          type: s.type,
          id: s.id
        })),
        diagnostics // Include diagnostics to see what went wrong
      });
    }

  } catch (error) {
    console.error("💥 Error in infinite-flight-atis function:", error);
    return json({ 
      error: error instanceof Error ? error.message : "Unknown error occurred",
      atis: null
    }, { status: 500 });
  }
});
