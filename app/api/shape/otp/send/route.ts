import { checkClaim } from "@/lib/claim";
import { sendCode } from "@/lib/otp";
import { supabaseConfigured } from "@/lib/supabase";

// Texts a one-time code to the phone number claiming a discount. Only sent for a right guess
// that hasn't been claimed, so it can't be used to send texts to arbitrary numbers at will.
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

    const sent = await sendCode(claim.e164);
    if (sent === "not_configured") return Response.json({ error: "otp_not_configured" }, { status: 503 });
    if (sent === "failed") return Response.json({ error: "send_failed" }, { status: 502 });
    return Response.json({ ok: true, phone: claim.phone });
  } catch (err) {
    console.error("[otp] Could not send a code.", err);
    return Response.json({ error: "send_failed" }, { status: 502 });
  }
}
