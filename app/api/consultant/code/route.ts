import { authConfigured, hashCode, newCode, normaliseEmail } from "@/lib/consultantAuth";
import { emailConfigured, sendEmail } from "@/lib/notify";
import { codesSince, consultantByEmail, createCode, supabaseConfigured } from "@/lib/supabase";

const CODE_MINUTES = 10;

// Emails a one-time sign-in code to a consultant the admin has added. The reply is the same whether or
// not the email is on the list, so the form can't be used to find out who is a consultant.
export async function POST(request: Request) {
  if (!supabaseConfigured() || !authConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  const devMode = !emailConfigured() && process.env.NODE_ENV !== "production";
  if (!emailConfigured() && !devMode) return Response.json({ error: "email_not_configured" }, { status: 503 });

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const email = normaliseEmail(body.email);
  if (!email) return Response.json({ error: "need_email" }, { status: 400 });

  try {
    const consultant = await consultantByEmail(email);
    if (!consultant || !consultant.active) return Response.json({ ok: true });

    // At most one code a minute, and five an hour, per consultant.
    if ((await codesSince(consultant.id, new Date(Date.now() - 60_000).toISOString())) > 0) {
      return Response.json({ error: "wait" }, { status: 429 });
    }
    if ((await codesSince(consultant.id, new Date(Date.now() - 3_600_000).toISOString())) >= 5) {
      return Response.json({ error: "too_many" }, { status: 429 });
    }

    const code = newCode();
    await createCode({ consultant_id: consultant.id, code_hash: hashCode(consultant.id, code), expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString() });
    if (devMode) {
      console.log(`[consultant] Development mode: the sign-in code for ${email} is ${code}.`);
      return Response.json({ ok: true });
    }
    const sent = await sendEmail({
      to: [email],
      subject: `Your NAZAAKAT sign-in code: ${code}`,
      html: `<p>Hello ${consultant.name.replace(/[<>&]/g, "")},</p><p>Your sign-in code is <strong style="font-size:20px;letter-spacing:3px">${code}</strong>.</p><p>It works for ${CODE_MINUTES} minutes. If you didn't ask for it, you can ignore this email.</p>`,
      text: `Your NAZAAKAT sign-in code is ${code}. It works for ${CODE_MINUTES} minutes.`,
    });
    if (!sent) return Response.json({ error: "send_failed" }, { status: 502 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[consultant] Could not send a sign-in code.", err);
    return Response.json({ error: "send_failed" }, { status: 502 });
  }
}
