// deno-lint-ignore-file no-explicit-any
import { json, corsHeaders } from "../_shared/http.ts";
import { createAdminClient, createAuthedClient } from "../_shared/supabase.ts";

function pickRandom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authed = createAuthedClient(req);
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Random leg count between 2 and 5
    const legsRequested = getRandomInt(2, 5);

    // Load profile
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("callsign, base_airport, active_aircraft_family")
      .eq("user_id", userData.user.id)
      .single();

    if (profileErr) throw profileErr;

    // Choose an aircraft from virtual fleet
    const { data: fleetPool, error: fleetErr } = await admin
      .from("virtual_fleet")
      .select("id, tail_number, aircraft_id, aircraft:aircraft(id, family, type_code)")
      .eq("status", "idle")
      .limit(200);

    if (fleetErr) throw fleetErr;

    // Also get aircraft pool for fallback
    const { data: aircraftPool, error: aircraftErr } = await admin
      .from("aircraft")
      .select("id, family, type_code")
      .limit(200) as { data: { id: string; family: string; type_code: string }[] | null; error: any };

    if (aircraftErr) throw aircraftErr;
    if (!aircraftPool || aircraftPool.length === 0) return json({ error: "No aircraft configured" }, { status: 400 });

    const preferredFamily = profile?.active_aircraft_family ?? null;
    
    type AircraftType = { id: string; family: string; type_code: string };
    
    // Try to find an idle aircraft from virtual fleet matching preferred family
    let chosenFleetAircraft: any = null;
    let chosenAircraft: AircraftType | null = null;
    let tailNumber: string | null = null;

    if (fleetPool && fleetPool.length > 0) {
      const preferredFleet = preferredFamily
        ? fleetPool.find((f: any) => f.aircraft?.family === preferredFamily)
        : null;
      chosenFleetAircraft = preferredFleet ?? pickRandom(fleetPool);
      if (chosenFleetAircraft?.aircraft && !Array.isArray(chosenFleetAircraft.aircraft)) {
        chosenAircraft = chosenFleetAircraft.aircraft as AircraftType;
        tailNumber = chosenFleetAircraft.tail_number;
      }
    }

    if (!chosenAircraft) {
      const preferredAircraft = preferredFamily
        ? aircraftPool.find((a) => a.family === preferredFamily) ?? null
        : null;
      chosenAircraft = preferredAircraft ?? pickRandom(aircraftPool);
    }

    // Load route catalog
    const { data: catalog, error: catalogErr } = await admin
      .from("route_catalog")
      .select("flight_number, dep_icao, arr_icao, aircraft, duration_mins")
      .limit(2000);

    if (catalogErr) throw catalogErr;
    if (!catalog || catalog.length === 0) {
      return json({ error: "Route catalog is empty. Import routes first." }, { status: 400 });
    }

    // Build route chain from user's base that returns to origin
    const base = (profile?.base_airport ?? "UUEE").toUpperCase();
    const remaining = [...catalog];

    const selected: typeof catalog = [];
    let current = base;
    const origin = base;

    // Select (legsRequested - 1) intermediate legs, then find return leg
    for (let i = 0; i < legsRequested - 1; i++) {
      const candidates = remaining.filter((r) => r.dep_icao?.toUpperCase() === current);
      
      // If no candidates from current position, pick randomly
      const pickFrom = candidates.length > 0 ? candidates : remaining;
      const route = pickRandom(pickFrom);
      if (!route) break;

      selected.push(route);
      // Remove from remaining (avoid duplicates)
      const idx = remaining.indexOf(route);
      if (idx >= 0) remaining.splice(idx, 1);

      current = (route.arr_icao ?? "").toUpperCase();
    }

    // Find return leg back to origin
    const returnCandidates = remaining.filter((r) => 
      r.dep_icao?.toUpperCase() === current && 
      r.arr_icao?.toUpperCase() === origin
    );

    if (returnCandidates.length > 0) {
      const returnRoute = pickRandom(returnCandidates);
      selected.push(returnRoute);
    } else {
      // If no direct return, find any route that ends at origin
      const anyReturnCandidates = remaining.filter((r) => 
        r.arr_icao?.toUpperCase() === origin
      );
      if (anyReturnCandidates.length > 0) {
        const returnRoute = pickRandom(anyReturnCandidates);
        selected.push(returnRoute);
      } else {
        // Create a synthetic return leg
        selected.push({
          flight_number: `SU${getRandomInt(1000, 9999)}`,
          dep_icao: current,
          arr_icao: origin,
          aircraft: chosenAircraft?.type_code ?? "A320",
          duration_mins: 120, // Default 2 hours
        });
      }
    }

    if (selected.length === 0) {
      return json({ error: "Could not select routes" }, { status: 400 });
    }

    // Create career request + routes + dispatch legs
    const nowIso = new Date().toISOString();

    const { data: createdRequest, error: reqErr } = await admin
      .from("career_requests")
      .insert({
        user_id: userData.user.id,
        status: "approved",
        requested_at: nowIso,
        reviewed_at: nowIso,
        reviewed_by: null,
        notes: "auto-assigned",
      })
      .select("id")
      .single();

    if (reqErr) throw reqErr;

    // A simple distance estimate if not available (avg 450kt)
    const avgKts = 450;

    const dispatchGroupId = crypto.randomUUID();

    // Insert routes first
    const routesToInsert = selected.map((r) => {
      const mins = r.duration_mins ?? 60;
      const hrs = mins / 60;
      return {
        flight_number: r.flight_number,
        departure_airport: r.dep_icao,
        arrival_airport: r.arr_icao,
        estimated_time_hrs: hrs,
        distance_nm: Math.max(50, Math.round(hrs * avgKts)),
      };
    });

    const { data: insertedRoutes, error: routesErr } = await admin
      .from("routes")
      .insert(routesToInsert)
      .select("id");

    if (routesErr) throw routesErr;
    if (!insertedRoutes || insertedRoutes.length !== routesToInsert.length) {
      return json({ error: "Failed to create routes" }, { status: 500 });
    }

    // Routes are returned in insertion order
    const routeIds = insertedRoutes.map((x) => x.id);

    const legsToInsert = selected.map((r, idx) => ({
      user_id: userData.user.id,
      route_id: routeIds[idx],
      aircraft_id: chosenAircraft.id,
      leg_number: idx + 1,
      callsign: profile?.callsign ?? "---",
      status: "assigned",
      dispatch_group_id: dispatchGroupId,
      assigned_by: null,
      assigned_at: nowIso,
      tail_number: tailNumber,
    }));

    const { error: legsErr } = await admin.from("dispatch_legs").insert(legsToInsert);
    if (legsErr) throw legsErr;

    // Mark fleet aircraft as in_flight if using virtual fleet
    if (chosenFleetAircraft) {
      await admin
        .from("virtual_fleet")
        .update({ 
          status: "in_flight", 
          assigned_to: userData.user.id,
          current_location: selected[0]?.dep_icao ?? base
        })
        .eq("id", chosenFleetAircraft.id);
    }

    return json({ requestId: createdRequest.id, legs: legsToInsert.length, tailNumber });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
});
