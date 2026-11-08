import { connection } from "next/server";
import { analyserConfigured, analyserReachable, geminiModel } from "@/lib/shapeAnalysis";
import { SHAPE_DISCOUNT_PERCENT } from "@/lib/shapes";

// Quick check of the body-shape analyser setup (no secrets): open /api/shape/status in a browser.
// It asks Google whether the key and model work, without sending a photo or costing anything.
// The database tables it needs are checked by /api/intake/status.
export async function GET() {
  await connection(); // read env vars fresh on every request, never bake them in at build time
  const problems: string[] = [];
  let gemini: string = "not set";
  if (!analyserConfigured()) {
    problems.push("GEMINI_API_KEY is not set, so photos cannot be analysed.");
  } else {
    gemini = await analyserReachable();
    if (gemini === "bad_key") problems.push("Google rejected GEMINI_API_KEY. Check it was copied in full, from aistudio.google.com.");
    if (gemini === "bad_model") problems.push(`The model "${geminiModel()}" was not found. Leave GEMINI_MODEL empty to use gemini-2.5-flash.`);
    if (gemini === "unreachable") problems.push("Could not reach Google's Gemini API from the server.");
  }
  return Response.json(
    { status: problems.length ? "settings need fixing" : "ready", model: geminiModel(), gemini, discountPercent: SHAPE_DISCOUNT_PERCENT, problems },
    { headers: { "Cache-Control": "no-store" } },
  );
}
