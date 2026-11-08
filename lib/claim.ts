import { toE164 } from "./otp";
import { normalisePhone } from "./phone";
import { existingDiscount, getAnalysis } from "./supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLAIM_WINDOW_MS = 24 * 60 * 60 * 1000;

export type Claim = { ok: true; phone: string; e164: string; analysisId: string } | { ok: false; error: string; status: number };

/**
 * Whether this right guess can still be turned into a discount for this phone number: the analysis
 * must be a correct one from the last day, and neither it nor the phone may have a discount already.
 */
export async function checkClaim(analysisIdRaw: unknown, phoneRaw: unknown): Promise<Claim> {
  const analysisId = String(analysisIdRaw || "");
  if (!UUID.test(analysisId)) return { ok: false, error: "bad_analysis", status: 400 };

  const digits = normalisePhone(String(phoneRaw || ""));
  if (!digits) return { ok: false, error: "need_phone", status: 400 };
  const e164 = toE164(digits);
  const phone = e164.slice(1);

  const analysis = await getAnalysis(analysisId);
  if (!analysis || !analysis.correct || Date.now() - new Date(analysis.created_at).getTime() > CLAIM_WINDOW_MS) {
    return { ok: false, error: "bad_analysis", status: 400 };
  }
  const existing = await existingDiscount(phone, analysisId);
  if (existing) return { ok: false, error: existing.phone === phone ? "phone_used" : "already_claimed", status: 409 };

  return { ok: true, phone, e164, analysisId };
}
