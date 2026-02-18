// deno-lint-ignore-file no-explicit-any
import { json, corsHeaders } from "../_shared/http.ts";
import { createAdminClient, createAuthedClient } from "../_shared/supabase.ts";

function pickRandom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type CatalogRoute = {
  flight_number: string | null;
  route_number: string | null;
  dep_icao: string | null;
  arr_icao: string | null;
  aircraft: string | null;
  duration_mins: number | null;
  route_type: string | null;
  rank: string | null;
  notes: string | null;
};

function routeNumber(route: CatalogRoute) {
  return route.route_number ?? route.flight_number ?? `SU${getRandomInt(1000, 9999)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authed = createAuthedClient(req);
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Check if caller is admin
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) return json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const targetUserId = body?.userId;
    if (!targetUserId) return json({ error: "Missing userId" }, { status: 400 });

    // Random leg count between 2 and 5
    const legsRequested = getRandomInt(2, 5);

    // Load profile for target user
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("callsign, base_airport, active_aircraft_family")
      .eq("user_id", targetUserId)
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
      .select("flight_number, route_number, dep_icao, arr_icao, aircraft, duration_mins, route_type, rank, notes")
      .limit(2000);

    if (catalogErr) throw catalogErr;
    if (!catalog || catalog.length === 0) {
      return json({ error: "Route catalog is empty. Import routes first." }, { status: 400 });
    }

    // Build route chain from user's base that returns to origin
    const base = (profile?.base_airport ?? "UUEE").toUpperCase();
    const remaining = [...catalog] as CatalogRoute[];

    const selected: CatalogRoute[] = [];
    let current = base;
    const origin = base;

    // Select (legsRequested - 1) intermediate legs, then find return leg
    for (let i = 0; i < legsRequested - 1; i++) {
      const candidates = remaining.filter((r) => r.dep_icao?.toUpperCase() === current);
      const pickFrom = candidates;
      const route = pickRandom(pickFrom);
      if (!route) break;

      selected.push(route);
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
      selected.push({
        flight_number: null,
        route_number: `SU${getRandomInt(1000, 9999)}`,
        dep_icao: current,
        arr_icao: origin,
        aircraft: chosenAircraft?.type_code ?? "A320",
        duration_mins: 120,
        route_type: "AUTO",
        rank: null,
        notes: "Synthetic return leg for continuity",
      });
    }

    if (selected.length === 0) {
      return json({ error: "Could not select routes" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    const { data: createdRequest, error: reqErr } = await admin
      .from("career_requests")
      .insert({
        user_id: targetUserId,
        status: "approved",
        requested_at: nowIso,
        reviewed_at: nowIso,
        reviewed_by: userData.user.id,
        notes: "auto-assigned by admin",
      })
      .select("id")
      .single();

    if (reqErr) throw reqErr;

    const avgKts = 450;
    const dispatchGroupId = crypto.randomUUID();

    const routesToInsert = selected.map((r) => {
      const mins = r.duration_mins ?? 60;
      const hrs = mins / 60;
      return {
        flight_number: routeNumber(r),
        route_number: routeNumber(r),
        departure_airport: r.dep_icao,
        arrival_airport: r.arr_icao,
        aircraft: r.aircraft,
        route_type: r.route_type,
        rank: r.rank,
        notes: r.notes,
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

    const routeIds = insertedRoutes.map((x) => x.id);

    const legsToInsert = selected.map((r, idx) => ({
      user_id: targetUserId,
      route_id: routeIds[idx],
      aircraft_id: chosenAircraft.id,
      leg_number: idx + 1,
      callsign: profile?.callsign ?? "---",
      status: "assigned",
      dispatch_group_id: dispatchGroupId,
      assigned_by: userData.user.id,
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
          assigned_to: targetUserId,
          current_location: selected[0]?.dep_icao ?? base
        })
        .eq("id", chosenFleetAircraft.id);
    }

    return json({ requestId: createdRequest.id, legs: legsToInsert.length, tailNumber });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
});
