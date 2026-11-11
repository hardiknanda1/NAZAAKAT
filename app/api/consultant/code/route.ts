import { createHmac } from "node:crypto";
import { authConfigured, hashCode, newCode, normaliseEmail } from "@/lib/consultantAuth";
import { emailConfigured, escapeHtml, sendEmail } from "@/lib/notify";
import { normalisePhone } from "@/lib/phone";
import { addConsultant, codesFromIpSince, codesSince, consultantByEmail, createCode, supabaseConfigured, updateUnverifiedConsultant } from "@/lib/supabase";

const CODE_MINUTES = 10;
const PER_NETWORK_HOURLY = 8; // anyone can ask for codes, so cap it per network to stop the form mailing strangers

function ipHash(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  return createHmac("sha256", process.env.MEETING_ROOM_SECRET || "nazaakat").update(`consultant-ip:${ip}`).digest("hex").slice(0, 32);
}

// Anyone can sign up or sign in as a consultant: the first form takes name, email and phone, and a
// one-time code is emailed to prove the email. The account only counts once that code is entered.
export async function POST(request: Request) {
  if (!supabaseConfigured() || !authConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  const devMode = !emailConfigured() && process.env.NODE_ENV !== "production";
  if (!emailConfigured() && !devMode) return Response.json({ error: "email_not_configured" }, { status: 503 });

  let body: { name?: string; email?: string; phone?: string };
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

  try {
    const ip = ipHash(request);
    if ((await codesFromIpSince(ip, new Date(Date.now() - 3_600_000).toISOString())) >= PER_NETWORK_HOURLY) {
      return Response.json({ error: "too_many" }, { status: 429 });
    }

    let consultant = await consultantByEmail(email);
    if (consultant && !consultant.active) return Response.json({ error: "paused" }, { status: 403 });
    if (!consultant) {
      consultant = (await addConsultant({ name, email, phone })) ?? (await consultantByEmail(email));
      if (!consultant) return Response.json({ error: "send_failed" }, { status: 502 });
    } else if (!consultant.verified_at) {
      await updateUnverifiedConsultant(consultant.id, { name, phone });
    }

    // At most one code a minute, and five an hour, per email.
    if ((await codesSince(consultant.id, new Date(Date.now() - 60_000).toISOString())) > 0) {
      return Response.json({ error: "wait" }, { status: 429 });
    }
    if ((await codesSince(consultant.id, new Date(Date.now() - 3_600_000).toISOString())) >= 5) {
      return Response.json({ error: "too_many" }, { status: 429 });
    }

    const code = newCode();
    await createCode({
      consultant_id: consultant.id,
      code_hash: hashCode(consultant.id, code),
      expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
      ip_hash: ip,
    });
    if (devMode) {
      console.log(`[consultant] Development mode: the sign-in code for ${email} is ${code}.`);
      return Response.json({ ok: true });
    }
    const sent = await sendEmail({
      to: [email],
      subject: `Your NAZAAKAT sign-in code: ${code}`,
      html: `<p>Hello ${escapeHtml(consultant.verified_at ? consultant.name : name)},</p><p>Your sign-in code is <strong style="font-size:20px;letter-spacing:3px">${code}</strong>.</p><p>It works for ${CODE_MINUTES} minutes. If you didn't ask for it, you can ignore this email.</p>`,
      text: `Your NAZAAKAT sign-in code is ${code}. It works for ${CODE_MINUTES} minutes.`,
    });
    if (sent === "sandbox") return Response.json({ error: "email_domain" }, { status: 503 });
    if (sent !== "sent") return Response.json({ error: "send_failed" }, { status: 502 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[consultant] Could not send a sign-in code.", err);
    // The consultant tables don't exist yet: supabase/schema.sql hasn't been re-run.
    if (/PGRST205|42P01|42703|does not exist|Could not find the table/i.test(String((err as Error).message))) {
      return Response.json({ error: "not_ready" }, { status: 503 });
    }
    return Response.json({ error: "send_failed" }, { status: 502 });
  }
}
