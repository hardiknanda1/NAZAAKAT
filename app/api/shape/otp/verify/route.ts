import { checkClaim } from "@/lib/claim";
import { checkCode } from "@/lib/otp";
import { SHAPE_DISCOUNT_PERCENT } from "@/lib/shapes";
import { createDiscount, supabaseConfigured } from "@/lib/supabase";

// Checks the code and, if it's right, issues the discount to that phone number.
export async function POST(request: Request) {
  if (!supabaseConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });

  let body: { analysisId?: string; phone?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const code = String(body.code || "").replace(/\D/g, "");
  if (code.length < 4 || code.length > 10) return Response.json({ error: "wrong_code" }, { status: 400 });

  try {
    const claim = await checkClaim(body.analysisId, body.phone);
    if (!claim.ok) return Response.json({ error: claim.error }, { status: claim.status });

    if (!(await checkCode(claim.e164, code))) return Response.json({ error: "wrong_code" }, { status: 400 });

    const discount = await createDiscount({ phone: claim.phone, percent: SHAPE_DISCOUNT_PERCENT, analysis_id: claim.analysisId });
    if (!discount) return Response.json({ error: "phone_used" }, { status: 409 });
    return Response.json({ ok: true, discount: { id: discount.id, phone: discount.phone, percent: discount.percent } });
  } catch (err) {
    console.error("[otp] Could not verify the code.", err);
    return Response.json({ error: "verify_failed" }, { status: 502 });
  }
}
