// deno-lint-ignore-file no-explicit-any
import { json, corsHeaders } from "../_shared/http.ts";
import { createAdminClient, createAuthedClient } from "../_shared/supabase.ts";
import { normalizeHeader, parseCsv, parseDurationToMinutes, pick } from "../_shared/csv.ts";

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

    const idxFlight = header.indexOf("flight number");
    const idxCode = header.indexOf("code");
    const idxDepCity = header.indexOf("departure city");
    const idxArrCity = header.indexOf("arrival city");
    const idxDepIcao = header.indexOf("dep. icao");
    const idxArrIcao = header.indexOf("arr icao");
    const idxAircraft = header.indexOf("aircraft");
    const idxDuration = header.indexOf("duration");
    const idxRemarks = header.indexOf("remarks");
    const idxLmt = header.indexOf("lmt");

    if (idxFlight < 0 || idxDepIcao < 0 || idxArrIcao < 0) {
      return json({ error: "CSV headers not recognized" }, { status: 400 });
    }

    const payload = rows.slice(1).map((r) => {
      const durationRaw = idxDuration >= 0 ? pick(r, idxDuration) : "";
      const durationMins = parseDurationToMinutes(durationRaw);

      const lmtRaw = idxLmt >= 0 ? pick(r, idxLmt) : "";
      const lmt = lmtRaw ? new Date(lmtRaw).toISOString() : null;

      return {
        flight_number: pick(r, idxFlight),
        code: idxCode >= 0 ? pick(r, idxCode) : null,
        dep_city: idxDepCity >= 0 ? pick(r, idxDepCity) : null,
        arr_city: idxArrCity >= 0 ? pick(r, idxArrCity) : null,
        dep_icao: pick(r, idxDepIcao).toUpperCase(),
        arr_icao: pick(r, idxArrIcao).toUpperCase(),
        aircraft: idxAircraft >= 0 ? pick(r, idxAircraft) : null,
        duration_raw: durationRaw || null,
        duration_mins: durationMins,
        remarks: idxRemarks >= 0 ? pick(r, idxRemarks) : null,
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
