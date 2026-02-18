// deno-lint-ignore-file no-explicit-any
import { json, corsHeaders } from "../shared/http.ts";
import { createAdminClient, createAuthedClient } from "../shared/supabase.ts";
import { normalizeHeader, parseCsv, parseDurationToMinutes, pick } from "../shared/csv.ts";

function findIndex(header: string[], accepted: string[]) {
  for (const key of accepted) {
    const idx = header.indexOf(key);
    if (idx >= 0) return idx;
  }
  return -1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authed = createAuthedClient(req);
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) return json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const csvText = String(body?.csvText ?? "");
    if (!csvText.trim()) return json({ error: "Missing csvText" }, { status: 400 });

    const rows = parseCsv(csvText);
    if (rows.length < 2) return json({ error: "CSV is empty" }, { status: 400 });

    const header = rows[0].map(normalizeHeader);

    const idxRouteNumber = findIndex(header, ["routenumber", "route number", "flight number"]);
    const idxCode = header.indexOf("code");
    const idxDepCity = header.indexOf("departure city");
    const idxArrCity = header.indexOf("arrival city");
    const idxDepIcao = findIndex(header, ["depicao", "dep icao", "dep. icao"]);
    const idxArrIcao = findIndex(header, ["arricao", "arr icao"]);
    const idxAircraft = header.indexOf("aircraft");
    const idxRouteType = findIndex(header, ["routetype", "route type", "code"]);
    const idxDuration = findIndex(header, ["estflighttime", "est flight time", "duration"]);
    const idxRank = header.indexOf("rank");
    const idxNotes = findIndex(header, ["notes", "remarks"]);
    const idxLmt = header.indexOf("lmt");

    if (idxRouteNumber < 0 || idxDepIcao < 0 || idxArrIcao < 0) {
      return json({ error: "CSV headers not recognized" }, { status: 400 });
    }

    const payload = rows.slice(1).map((r) => {
      const durationRaw = idxDuration >= 0 ? pick(r, idxDuration) : "";
      const durationMins = parseDurationToMinutes(durationRaw);

      const lmtRaw = idxLmt >= 0 ? pick(r, idxLmt) : "";
      const lmt = lmtRaw ? new Date(lmtRaw).toISOString() : null;

      const routeNumber = pick(r, idxRouteNumber);
      const depIcao = pick(r, idxDepIcao).toUpperCase();
      const arrIcao = pick(r, idxArrIcao).toUpperCase();

      return {
        flight_number: routeNumber,
        route_number: routeNumber,
        code: idxCode >= 0 ? pick(r, idxCode) : null,
        route_type: idxRouteType >= 0 ? pick(r, idxRouteType) : null,
        dep_city: idxDepCity >= 0 ? pick(r, idxDepCity) : null,
        arr_city: idxArrCity >= 0 ? pick(r, idxArrCity) : null,
        dep_icao: depIcao,
        arr_icao: arrIcao,
        aircraft: idxAircraft >= 0 ? pick(r, idxAircraft) : null,
        duration_raw: durationRaw || null,
        duration_mins: durationMins,
        rank: idxRank >= 0 ? pick(r, idxRank) : null,
        notes: idxNotes >= 0 ? pick(r, idxNotes) : null,
        remarks: idxNotes >= 0 ? pick(r, idxNotes) : null,
        lmt: lmt && lmt !== "Invalid Date" ? lmt : null,
      };
    }).filter((x) => x.flight_number && x.dep_icao && x.arr_icao);

    // Batch upserts
    let imported = 0;
    const batchSize = 500;
    for (let i = 0; i < payload.length; i += batchSize) {
      const batch = payload.slice(i, i + batchSize);
      const { error } = await admin.from("route_catalog").upsert(batch, {
        onConflict: "flight_number,dep_icao,arr_icao",
      });
      if (error) throw error;
      imported += batch.length;
    }

    return json({ imported });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
});
