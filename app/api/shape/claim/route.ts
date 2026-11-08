import { checkClaim } from "@/lib/claim";
import { SHAPE_DISCOUNT_PERCENT } from "@/lib/shapes";
import { createDiscount, supabaseConfigured } from "@/lib/supabase";

// Saves the discount from a right guess to a phone number. No code or password: the booking made
// with that WhatsApp number gets the discount, and the meeting link only ever goes to that number.
export async function POST(request: Request) {
  if (!supabaseConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });

  let body: { analysisId?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const claim = await checkClaim(body.analysisId, body.phone);
    if (!claim.ok) return Response.json({ error: claim.error }, { status: claim.status });

    const discount = await createDiscount({ phone: claim.phone, percent: SHAPE_DISCOUNT_PERCENT, analysis_id: claim.analysisId });
    if (!discount) return Response.json({ error: "phone_used" }, { status: 409 });
    return Response.json({ ok: true, discount: { id: discount.id, phone: discount.phone, percent: discount.percent } });
  } catch (err) {
    console.error("[shape] Could not save the discount.", err);
    return Response.json({ error: "save_failed" }, { status: 502 });
  }
}
