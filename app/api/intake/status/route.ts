import { connection } from "next/server";
import { CATALOGUE_BUCKET, PHOTO_BUCKET, supabaseConfigured } from "@/lib/supabase";

const TABLES = ["booking_slots", "bookings", "consultation_intake"];
const BUCKETS = [PHOTO_BUCKET, CATALOGUE_BUCKET];

// Quick check of the Supabase setup (no secrets): open /api/intake/status in a browser.
// Checks every table and bucket supabase/schema.sql creates, so re-running it after an update
// (e.g. one that adds a table) shows up here instead of as a vague "could not add/send" error
// on whichever page needed the missing piece.
export async function GET() {
  await connection(); // read env vars fresh on every request, never bake them in at build time
  const url = (process.env.SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const problems: string[] = [];

  if (!url) problems.push("SUPABASE_URL is not set.");
  else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url.replace(/\/$/, ""))) {
    problems.push("SUPABASE_URL does not look right. It should look like https://xxxxxxxx.supabase.co with nothing extra.");
  }
  if (!key) problems.push("SUPABASE_SECRET_KEY is not set.");

  const tables: Record<string, boolean> = {};
  const buckets: Record<string, boolean> = {};
  let ranSchemaRecently = false;

  if (supabaseConfigured()) {
    const headers = { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}) };
    const base = url.replace(/\/$/, "");

    for (const table of TABLES) {
      try {
        const res = await fetch(`${base}/rest/v1/${table}?select=id&limit=1`, { headers, cache: "no-store" });
        tables[table] = res.ok;
        if (!res.ok) {
          problems.push(`The "${table}" table could not be reached (${res.status}).`);
          ranSchemaRecently = true;
        }
      } catch {
        tables[table] = false;
        problems.push("Could not reach Supabase with this URL. Double check SUPABASE_URL.");
      }
    }

    for (const bucket of BUCKETS) {
      try {
        const res = await fetch(`${base}/storage/v1/bucket/${bucket}`, { headers, cache: "no-store" });
        buckets[bucket] = res.ok;
        if (!res.ok) {
          problems.push(`The "${bucket}" storage bucket could not be reached (${res.status}).`);
          ranSchemaRecently = true;
        }
      } catch {
        buckets[bucket] = false;
      }
    }

    if (ranSchemaRecently) {
      problems.push('Open Supabase → SQL Editor → New query, paste the current supabase/schema.sql, and click Run. It is safe to run again even if you ran an older version before.');
    }
  }

  return Response.json(
    {
      configured: supabaseConfigured(),
      status: supabaseConfigured() ? (problems.length ? "settings need fixing" : "ready") : "Supabase not set up",
      problems,
      tables,
      buckets,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
