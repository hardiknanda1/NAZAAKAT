import { codeMatches, normaliseEmail, startSession } from "@/lib/consultantAuth";
import { activeCode, consultantByEmail, countCodeAttempt, markConsultantVerified, spendCode } from "@/lib/supabase";

const MAX_ATTEMPTS = 5;

// Checks the code and signs the consultant in on this device.
export async function POST(request: Request) {
  let body: { email?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const email = normaliseEmail(body.email);
  const code = String(body.code || "").replace(/\D/g, "");
  if (!email || code.length !== 6) return Response.json({ error: "wrong_code" }, { status: 400 });

  try {
    const consultant = await consultantByEmail(email);
    const pending = consultant?.active ? await activeCode(consultant.id) : null;
    if (!consultant || !pending || pending.attempts >= MAX_ATTEMPTS) return Response.json({ error: "wrong_code" }, { status: 400 });

    if (!codeMatches(consultant.id, code, pending.code_hash)) {
      await countCodeAttempt(pending.id, pending.attempts + 1);
      await new Promise((r) => setTimeout(r, 600)); // slow down guessing
      return Response.json({ error: "wrong_code" }, { status: 400 });
    }
    if (!(await spendCode(pending.id))) return Response.json({ error: "wrong_code" }, { status: 400 });

    if (!consultant.verified_at) await markConsultantVerified(consultant.id); // the email is now proven
    await startSession(consultant.id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[consultant] Could not check a sign-in code.", err);
    return Response.json({ error: "verify_failed" }, { status: 502 });
  }
}
