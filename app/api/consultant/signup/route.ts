import { authConfigured, ipHash, normaliseEmail, startSession } from "@/lib/consultantAuth";
import { hashPassword, passwordProblem } from "@/lib/password";
import { normalisePhone } from "@/lib/phone";
import { addConsultant, claimUnfinishedSignup, consultantByEmail, signupsFromIpSince, supabaseConfigured } from "@/lib/supabase";

const PER_NETWORK_HOURLY = 10; // anyone can sign up, so cap it per network to stop scripted mass sign-ups

// Anyone can sign up as a consultant: name, email, phone and a password. They're signed in at once.
// They only see bookings once the admin accepts their request to take one.
export async function POST(request: Request) {
  if (!supabaseConfigured() || !authConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  let body: { name?: string; email?: string; phone?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const name = String(body.name || "").trim().slice(0, 120);
  const email = normaliseEmail(body.email);
  const phone = normalisePhone(String(body.phone || ""));
  if (!name) return Response.json({ error: "need_name" }, { status: 400 });
  if (!email) return Response.json({ error: "need_email" }, { status: 400 });
  if (!phone) return Response.json({ error: "need_phone" }, { status: 400 });
  const problem = passwordProblem(body.password);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  try {
    const ip = ipHash(request);
    if ((await signupsFromIpSince(ip, new Date(Date.now() - 3_600_000).toISOString())) >= PER_NETWORK_HOURLY) {
      return Response.json({ error: "too_many" }, { status: 429 });
    }
    const fields = { name, phone, password_hash: await hashPassword(body.password as string), verified_at: new Date().toISOString(), signup_ip: ip };
    const existing = await consultantByEmail(email);
    // An email that already has an account can't be signed up again (that would take it over). The only
    // exception is a half-finished sign-up from the old email-code flow, which never had a password.
    const consultant = existing ? await claimUnfinishedSignup(existing.id, fields) : await addConsultant({ email, ...fields });
    if (!consultant) return Response.json({ error: "already_registered" }, { status: 409 });
    await startSession(consultant.id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[consultant] Could not sign up.", err);
    if (/PGRST204|PGRST205|42P01|42703|does not exist|Could not find/i.test(String((err as Error).message))) {
      return Response.json({ error: "not_ready" }, { status: 503 });
    }
    return Response.json({ error: "signup_failed" }, { status: 502 });
  }
}
