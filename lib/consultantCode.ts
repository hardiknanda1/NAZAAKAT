import { codeMatches, normaliseEmail } from "./consultantAuth";
import { activeCode, consultantByEmail, countCodeAttempt, markConsultantVerified, spendCode, type Consultant } from "./supabase";

const MAX_ATTEMPTS = 5;

/**
 * Checks a one-time code (emailed, or handed out by the admin) and uses it up. Shared by code sign-in and
 * password reset. Proves the email, so the account counts from then on.
 */
export async function redeemCode(emailRaw: unknown, codeRaw: unknown): Promise<Consultant | null> {
  const email = normaliseEmail(emailRaw);
  const code = String(codeRaw || "").replace(/\D/g, "");
  if (!email || code.length !== 6) return null;

  const consultant = await consultantByEmail(email);
  const pending = consultant?.active ? await activeCode(consultant.id) : null;
  if (!consultant || !pending || pending.attempts >= MAX_ATTEMPTS) return null;

  if (!codeMatches(consultant.id, code, pending.code_hash)) {
    await countCodeAttempt(pending.id, pending.attempts + 1);
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return null;
  }
  if (!(await spendCode(pending.id))) return null;
  if (!consultant.verified_at) await markConsultantVerified(consultant.id);
  return consultant;
}
