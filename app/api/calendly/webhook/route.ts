import { createHmac, timingSafeEqual } from "node:crypto";
import { consultationLinks, roomForBooking } from "@/lib/meeting";
import { site } from "@/lib/site";
import { normalisePhone, sendTemplate, whatsappConfigured } from "@/lib/whatsapp";

// Receives Calendly "invitee.created" webhooks, creates a private Jitsi room for the
// booking and sends the link to the customer on WhatsApp. Nothing is stored: the room
// name is derived from the Calendly invitee URI with a secret, so retries yield the same link.

const TOLERANCE_SECONDS = 5 * 60;

type QA = { question?: string; answer?: string };
type InviteePayload = {
  uri?: string;
  name?: string;
  timezone?: string;
  text_reminder_number?: string | null;
  questions_and_answers?: QA[];
  scheduled_event?: { start_time?: string };
};

function verifySignature(header: string | null, body: string, key: string) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=") as [string, string]));
  const t = Number(parts.t);
  if (!parts.v1 || !Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", key).update(`${parts.t}.${body}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

function formatTime(iso: string | undefined, timeZone: string) {
  if (!iso) return "your booked time";
  const opts: Intl.DateTimeFormatOptions = { dateStyle: "full", timeStyle: "short" };
  try {
    return new Intl.DateTimeFormat("en-IN", { ...opts, timeZone }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "Asia/Kolkata" }).format(new Date(iso));
  }
}

export async function POST(request: Request) {
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  const roomSecret = process.env.MEETING_ROOM_SECRET;
  if (!signingKey || !roomSecret) {
    console.error("[calendly] CALENDLY_WEBHOOK_SIGNING_KEY and MEETING_ROOM_SECRET must be set.");
    return Response.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const body = await request.text();
  if (!verifySignature(request.headers.get("calendly-webhook-signature"), body, signingKey)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let data: { event?: string; payload?: InviteePayload };
  try {
    data = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (data.event !== "invitee.created") {
    return Response.json({ ok: true, ignored: data.event });
  }

  const invitee = data.payload ?? {};
  if (!invitee.uri) return Response.json({ error: "Missing invitee" }, { status: 400 });

  const room = roomForBooking(invitee.uri);
  const links = consultationLinks(site.url, room);
  const when = formatTime(invitee.scheduled_event?.start_time, invitee.timezone || "Asia/Kolkata");
  const name = invitee.name?.trim() || "there";

  // Logs are private to the site owner. This lets the consultant find the host link
  // in Vercel's logs even before WhatsApp is set up.
  console.log(`[calendly] Booking for ${name} on ${when}. Consultant link: ${links.consultant}`);

  const whatsappAnswer = invitee.questions_and_answers?.find((qa) => /whats\s?app|mobile|phone/i.test(qa.question || ""));
  const phone = normalisePhone(whatsappAnswer?.answer) ?? normalisePhone(invitee.text_reminder_number);

  if (!whatsappConfigured() || !process.env.WHATSAPP_TEMPLATE_NAME) {
    console.warn("[calendly] Booking received but WhatsApp is not configured; no message sent.", { room });
    return Response.json({ ok: true, room, whatsapp: "not_configured" });
  }

  if (!phone) {
    console.warn("[calendly] Booking received without a usable WhatsApp number.", { room });
    return Response.json({ ok: true, room, whatsapp: "no_number" });
  }

  try {
    // Template body parameters: {{1}} name, {{2}} date & time, {{3}} meeting link
    await sendTemplate(phone, process.env.WHATSAPP_TEMPLATE_NAME, [name, when, links.customer]);
  } catch (err) {
    console.error("[calendly] WhatsApp message to customer failed.", err);
    // Non-2xx makes Calendly retry; the room name stays the same on retry.
    return Response.json({ error: "WhatsApp send failed" }, { status: 502 });
  }

  // Optional: also send the consultant their host link.
  const consultant = normalisePhone(process.env.CONSULTANT_WHATSAPP_NUMBER);
  const consultantTemplate = process.env.WHATSAPP_CONSULTANT_TEMPLATE_NAME;
  if (consultant && consultantTemplate) {
    try {
      await sendTemplate(consultant, consultantTemplate, [name, when, links.consultant]);
    } catch (err) {
      console.error("[calendly] WhatsApp message to consultant failed.", err);
    }
  }

  return Response.json({ ok: true, room, whatsapp: "sent" });
}
