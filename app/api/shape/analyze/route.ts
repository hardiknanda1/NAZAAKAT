import { createHmac } from "node:crypto";
import { analyserConfigured, analysePhoto } from "@/lib/shapeAnalysis";
import { SHAPE_DISCOUNT_PERCENT, SHAPE_IDS } from "@/lib/shapes";
import { analysesSince, recordAnalysis, supabaseConfigured } from "@/lib/supabase";

// Reads the body shape in one photo and compares it with the visitor's guess.
// The photo goes straight to the analysis and is never saved.

const MAX_BYTES = 5 * 1024 * 1024;
const PER_DAY = 5; // analyses per network per day, to keep costs in check
const FIRST_GUESS_DAYS = 30;
const TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ImageType = (typeof TYPES)[number];

function ipHash(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  return createHmac("sha256", process.env.MEETING_ROOM_SECRET || "nazaakat").update(`ip:${ip}`).digest("hex").slice(0, 32);
}

export async function POST(request: Request) {
  if (!analyserConfigured() || !supabaseConfigured()) {
    console.error("[shape] ANTHROPIC_API_KEY, SUPABASE_URL and SUPABASE_SECRET_KEY must all be set.");
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "too_large" }, { status: 413 });
  }

  const guess = String(form.get("guess") || "");
  if (!SHAPE_IDS.includes(guess)) return Response.json({ error: "need_guess" }, { status: 400 });

  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return Response.json({ error: "need_photo" }, { status: 400 });
  if (!TYPES.includes(photo.type as ImageType) || photo.size > MAX_BYTES) return Response.json({ error: "bad_photo" }, { status: 400 });

  const ip = ipHash(request);
  let firstResult: boolean;
  try {
    const day = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    if ((await analysesSince(ip, day)) >= PER_DAY) return Response.json({ error: "too_many" }, { status: 429 });
    // Only the first readable result counts for the discount, so a wrong guess can't simply be
    // repeated with the answer it revealed. Unreadable photos don't count, so people can retry those.
    const month = new Date(Date.now() - FIRST_GUESS_DAYS * 24 * 60 * 60 * 1000).toISOString();
    firstResult = (await analysesSince(ip, month, true)) === 0;
  } catch (err) {
    console.error("[shape] Could not check the daily limit.", err);
    return Response.json({ error: "save_failed" }, { status: 502 });
  }

  try {
    const result = await analysePhoto(Buffer.from(await photo.arrayBuffer()), photo.type as ImageType);
    const correct = result.status === "ok" && result.shape === guess;
    const wins = correct && firstResult;
    const row = await recordAnalysis({ ip_hash: ip, guess, result: result.status === "ok" ? result.shape : "unclear", correct: wins });

    if (result.status === "unclear") return Response.json({ status: "unclear", reason: result.reason });
    return Response.json({
      status: "ok",
      shape: result.shape,
      confidence: result.confidence,
      reason: result.reason,
      correct,
      firstResult,
      // Only a winning guess gets an id, which is what the phone check needs to issue the discount.
      ...(wins ? { analysisId: row.id, percent: SHAPE_DISCOUNT_PERCENT } : {}),
    });
  } catch (err) {
    console.error("[shape] The analysis failed.", err);
    return Response.json({ error: "analysis_failed" }, { status: 502 });
  }
}
