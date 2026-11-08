import { connection } from "next/server";
import { otpConfigured } from "@/lib/otp";
import { analyserConfigured } from "@/lib/shapeAnalysis";
import { SHAPE_DISCOUNT_PERCENT } from "@/lib/shapes";

// Quick check of the body-shape analyser setup (no secrets): open /api/shape/status in a browser.
// The database tables it needs are checked by /api/intake/status.
export async function GET() {
  await connection(); // read env vars fresh on every request, never bake them in at build time
  const problems: string[] = [];
  if (!analyserConfigured()) problems.push("ANTHROPIC_API_KEY is not set, so photos cannot be analysed.");
  if (!otpConfigured()) {
    problems.push("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID are not all set, so discount codes cannot be texted.");
  }
  return Response.json(
    { status: problems.length ? "settings need fixing" : "ready", discountPercent: SHAPE_DISCOUNT_PERCENT, problems },
    { headers: { "Cache-Control": "no-store" } },
  );
}
