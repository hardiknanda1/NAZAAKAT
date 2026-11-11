import { authConfigured, normaliseEmail, startSession } from "@/lib/consultantAuth";
import { checkPassword } from "@/lib/password";
import { consultantByEmail, supabaseConfigured, updateConsultant } from "@/lib/supabase";

const MAX_TRIES = 5;
const LOCK_MINUTES = 15;

// Email and password sign-in. After 5 wrong passwords the account is locked for 15 minutes (a code
// from "Forgot password" still works). Every failure gives the same answer.
export async function POST(request: Request) {
  if (!supabaseConfigured() || !authConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const email = normaliseEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return Response.json({ error: "wrong_login" }, { status: 400 });

  try {
    const c = await consultantByEmail(email);
    if (c && !c.active) return Response.json({ error: "paused" }, { status: 403 });
    if (c?.locked_until && new Date(c.locked_until).getTime() > Date.now()) return Response.json({ error: "locked" }, { status: 429 });
    const ok = Boolean(c?.verified_at && c.password_hash) && (await checkPassword(password, c!.password_hash));
    if (!c || !ok) {
      if (c?.password_hash) {
        const tries = (c.failed_logins || 0) + 1;
        await updateConsultant(
          c.id,
          tries >= MAX_TRIES ? { failed_logins: 0, locked_until: new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() } : { failed_logins: tries },
        );
      }
      await new Promise((r) => setTimeout(r, 700)); // slow down guessing
      return Response.json({ error: "wrong_login" }, { status: 400 });
    }
    if (c.failed_logins || c.locked_until) await updateConsultant(c.id, { failed_logins: 0, locked_until: null });
    await startSession(c.id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[consultant] Could not check a password.", err);
    return Response.json({ error: "verify_failed" }, { status: 502 });
  }
}
