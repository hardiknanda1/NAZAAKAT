import { connection } from "next/server";
import { PHOTO_BUCKET, supabaseConfigured } from "@/lib/supabase";

// Quick check of the questionnaire storage setup (no secrets): open /api/intake/status in a browser.
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

  let tableOk: boolean | null = null;
  let bucketOk: boolean | null = null;
  if (supabaseConfigured()) {
    const headers = { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}) };
    try {
      const table = await fetch(`${url.replace(/\/$/, "")}/rest/v1/consultation_intake?select=id&limit=1`, { headers, cache: "no-store" });
      tableOk = table.ok;
      if (!table.ok) problems.push(`The consultation_intake table could not be reached (${table.status}). Run supabase/schema.sql in the SQL Editor.`);
    } catch {
      tableOk = false;
      problems.push("Could not reach Supabase with this URL. Double check SUPABASE_URL.");
    }
    try {
      const bucket = await fetch(`${url.replace(/\/$/, "")}/storage/v1/bucket/${PHOTO_BUCKET}`, { headers, cache: "no-store" });
      bucketOk = bucket.ok;
      if (!bucket.ok) problems.push(`The ${PHOTO_BUCKET} storage bucket could not be reached (${bucket.status}). Run supabase/schema.sql in the SQL Editor.`);
    } catch {
      bucketOk = false;
    }
  }

  return Response.json(
    {
      configured: supabaseConfigured(),
      status: supabaseConfigured() ? (problems.length ? "settings need fixing" : "ready") : "Supabase not set up",
      problems,
      tableReachable: tableOk,
      bucketReachable: bucketOk,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
