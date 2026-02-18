// deno-lint-ignore-file no-explicit-any
import { json, corsHeaders } from "../_shared/http.ts";
import { createAdminClient } from "../_shared/supabase.ts";

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

const admin = createAdminClient();

async function findUserIdFromDiscord(discordUserId: string) {
  const { data } = await admin
    .from("profiles")
    .select("user_id")
    .eq("discord_user_id", discordUserId)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function getOrCreateDispatch(userId: string) {
  const { data: activeLegs } = await admin
    .from("dispatch_legs")
    .select("id, leg_number, status, route:routes(flight_number, route_number, departure_airport, arrival_airport)")
    .eq("user_id", userId)
    .in("status", ["assigned", "dispatched", "awaiting_approval"])
    .order("leg_number", { ascending: true });

  if (activeLegs && activeLegs.length > 0) {
    return { created: false, legs: activeLegs };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("callsign, base_airport, active_aircraft_family")
    .eq("user_id", userId)
    .single();

  const { data: aircraftPool } = await admin
    .from("aircraft")
    .select("id, family, type_code")
    .limit(200);

  if (!aircraftPool || aircraftPool.length === 0) throw new Error("No aircraft configured");

  const preferredAircraft = profile?.active_aircraft_family
    ? aircraftPool.find((a) => a.family === profile.active_aircraft_family)
    : null;
  const chosenAircraft = preferredAircraft ?? pickRandom(aircraftPool);

  const { data: catalog } = await admin
    .from("route_catalog")
    .select("flight_number, route_number, dep_icao, arr_icao, aircraft, duration_mins, route_type, rank, notes")
    .limit(2000);

  if (!catalog || catalog.length === 0) throw new Error("Route catalog is empty");

  const legsRequested = getRandomInt(2, 5);
  const base = (profile?.base_airport ?? "UUEE").toUpperCase();
  const remaining = [...catalog] as CatalogRoute[];
  const selected: CatalogRoute[] = [];

  let current = base;
  for (let i = 0; i < legsRequested - 1; i++) {
    const fromCurrent = remaining.filter((r) => r.dep_icao?.toUpperCase() === current);
    const route = pickRandom(fromCurrent);
    if (!route) break;
    selected.push(route);
    remaining.splice(remaining.indexOf(route), 1);
    current = (route.arr_icao ?? "").toUpperCase();
  }

  const returnRoute = remaining.find(
    (r) => r.dep_icao?.toUpperCase() === current && r.arr_icao?.toUpperCase() === base,
  );

  if (returnRoute) {
    selected.push(returnRoute);
  } else {
    selected.push({
      flight_number: null,
      route_number: `SU${getRandomInt(1000, 9999)}`,
      dep_icao: current,
      arr_icao: base,
      aircraft: chosenAircraft.type_code,
      duration_mins: 120,
      route_type: "AUTO",
      rank: null,
      notes: "Synthetic return leg for continuity",
    });
  }

  const nowIso = new Date().toISOString();
  const { data: createdRequest } = await admin
    .from("career_requests")
    .insert({
      user_id: userId,
      status: "approved",
      requested_at: nowIso,
      reviewed_at: nowIso,
      reviewed_by: null,
      notes: "auto-assigned by discord bot",
    })
    .select("id")
    .single();

  const avgKts = 450;
  const routesToInsert = selected.map((r) => {
    const hrs = (r.duration_mins ?? 60) / 60;
    const routeNumber = r.route_number ?? r.flight_number ?? `SU${getRandomInt(1000, 9999)}`;
    return {
      flight_number: routeNumber,
      route_number: routeNumber,
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

  const { data: insertedRoutes, error: routesErr } = await admin.from("routes").insert(routesToInsert).select("id");
  if (routesErr || !insertedRoutes) throw routesErr ?? new Error("Route insert failed");

  const groupId = crypto.randomUUID();
  const legsToInsert = selected.map((r, idx) => ({
    user_id: userId,
    route_id: insertedRoutes[idx].id,
    aircraft_id: chosenAircraft.id,
    leg_number: idx + 1,
    callsign: profile?.callsign ?? "---",
    status: "assigned",
    dispatch_group_id: groupId,
    assigned_by: null,
    assigned_at: nowIso,
  }));

  const { error: legsErr } = await admin.from("dispatch_legs").insert(legsToInsert);
  if (legsErr) throw legsErr;

  return { created: true, requestId: createdRequest?.id, legs: legsToInsert };
}

async function calculatePirepMultiplier(userId: string, aircraftId: string, totalHours: number) {
  let aircraftMultiplier = 1;
  const { data: aircraft } = await admin.from("aircraft").select("multiplier").eq("id", aircraftId).maybeSingle();
  if (aircraft?.multiplier) aircraftMultiplier = Number(aircraft.multiplier);

  let baseMultiplier = 1;
  const { data: profile } = await admin.from("profiles").select("base_airport").eq("user_id", userId).maybeSingle();
  if (profile?.base_airport) {
    const { data: base } = await admin.from("bases").select("multiplier").eq("icao_code", profile.base_airport).maybeSingle();
    if (base?.multiplier) baseMultiplier = Number(base.multiplier);
  }

  let hourMultiplier = 1;
  const { data: hourRules } = await admin
    .from("flight_hour_multipliers")
    .select("multiplier, min_hours, max_hours")
    .eq("is_active", true)
    .order("multiplier", { ascending: false });

  const matched = hourRules?.find((r) => totalHours >= Number(r.min_hours) && (r.max_hours == null || totalHours <= Number(r.max_hours)));
  if (matched?.multiplier) hourMultiplier = Number(matched.multiplier);

  return {
    aircraftMultiplier,
    baseMultiplier,
    hourMultiplier,
    totalMultiplier: Number((aircraftMultiplier * baseMultiplier * hourMultiplier).toFixed(2)),
  };
}

async function sendPirepWebhook(payload: Record<string, unknown>) {
  const webhook = Deno.env.get("DISCORD_PIREP_WEBHOOK_URL");
  if (!webhook) return;
  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expectedSecret = Deno.env.get("DISCORD_BOT_SHARED_SECRET");
  const authHeader = req.headers.get("authorization") ?? "";
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    if (body?.type === 1) return json({ type: 1 });

    const commandName = body?.data?.name ?? body?.command;
    const discordUserId = body?.member?.user?.id ?? body?.discordUserId;

    if (!discordUserId) return json({ error: "Missing discord user id" }, { status: 400 });

    const userId = await findUserIdFromDiscord(discordUserId);
    if (!userId) {
      return json({
        content: "Your Discord is not linked. Ask admin to set your discord_user_id in profile.",
      });
    }

    if (commandName === "dispatch") {
      const dispatch = await getOrCreateDispatch(userId);
      const legs = dispatch.legs ?? [];
      const legsText = legs
        .map((l: any, i: number) => `${i + 1}. ${(l.route?.route_number ?? l.route?.flight_number ?? "SU0000")} ${l.route?.departure_airport}→${l.route?.arrival_airport} (${l.status})`)
        .join("\n");

      return json({
        content: dispatch.created
          ? `New career dispatch assigned.\n${legsText}`
          : `You already have an active dispatch:\n${legsText}`,
      });
    }

    if (commandName === "pirep" || commandName === "PIREP") {
      const opts = body?.data?.options ?? body?.options ?? {};
      const flightTimeHrs = Number(opts.flight_time_hrs ?? opts.flightTimeHrs ?? 1);
      const flightTimeMins = Number(opts.flight_time_mins ?? opts.flightTimeMins ?? 0);
      const landingRate = opts.landing_rate != null ? Number(opts.landing_rate) : null;
      const passengers = opts.passengers != null ? Number(opts.passengers) : null;
      const fuelUsed = opts.fuel_used != null ? Number(opts.fuel_used) : null;

      const { data: leg } = await admin
        .from("dispatch_legs")
        .select("id, route_id, aircraft_id, route:routes(flight_number, departure_airport, arrival_airport)")
        .eq("user_id", userId)
        .in("status", ["assigned", "dispatched"])
        .order("leg_number", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!leg) return json({ content: "No active leg found. Use /dispatch first." });

      const totalHours = flightTimeHrs + flightTimeMins / 60;
      const multiplier = await calculatePirepMultiplier(userId, leg.aircraft_id, totalHours);

      const { data: inserted, error } = await admin
        .from("pireps")
        .insert({
          user_id: userId,
          dispatch_leg_id: leg.id,
          aircraft_id: leg.aircraft_id,
          route_id: leg.route_id,
          flight_number: leg.route?.flight_number ?? "SU0000",
          departure_airport: leg.route?.departure_airport ?? "UUEE",
          arrival_airport: leg.route?.arrival_airport ?? "UUEE",
          flight_time_hrs: totalHours,
          flight_time_mins: flightTimeMins,
          passengers,
          landing_rate: landingRate,
          fuel_used: fuelUsed,
          status: "pending",
          multiplier: multiplier.totalMultiplier,
        })
        .select("id")
        .single();

      if (error) throw error;

      await admin.from("dispatch_legs").update({ status: "awaiting_approval" }).eq("id", leg.id);

      await sendPirepWebhook({
        username: "AFLV Career Bot",
        embeds: [
          {
            title: "New PIREP Filed",
            description: `${leg.route?.flight_number ?? "SU0000"} ${leg.route?.departure_airport} → ${leg.route?.arrival_airport}`,
            fields: [
              { name: "Pilot", value: userId, inline: false },
              { name: "Multiplier", value: `${multiplier.totalMultiplier}x`, inline: true },
              { name: "Aircraft", value: leg.aircraft_id, inline: true },
            ],
          },
        ],
      });

      return json({
        content: `PIREP submitted (#${inserted.id}). Multiplier ${multiplier.totalMultiplier}x (aircraft ${multiplier.aircraftMultiplier} × base ${multiplier.baseMultiplier} × hrs ${multiplier.hourMultiplier}).`,
      });
    }

    if (commandName === "notify_pirep") {
      await sendPirepWebhook(body?.payload ?? {});
      return json({ ok: true });
    }

    return json({ content: "Unknown command" });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
});
