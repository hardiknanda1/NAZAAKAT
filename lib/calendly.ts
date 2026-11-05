// Reads upcoming bookings from the Calendly API (works on Calendly's free plan).
import { consultationLinks, roomForBooking } from "./meeting";
import { site } from "./site";

const API = "https://api.calendly.com";

/** Digits only, including country code (e.g. "+91 98765 43210" → "919876543210"). */
export function normalisePhone(raw: string | null | undefined) {
  const digits = (raw || "").replace(/\D/g, "").replace(/^00/, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

type QA = { question?: string; answer?: string };
type Invitee = {
  uri: string;
  name?: string;
  email?: string;
  timezone?: string;
  status?: string;
  text_reminder_number?: string | null;
  questions_and_answers?: QA[];
};
type ScheduledEvent = { uri: string; name?: string; start_time: string };

export type Booking = {
  inviteeUri: string;
  name: string;
  email: string;
  phone: string | null;
  start: string;
  eventName: string;
  customerLink: string;
  consultantLink: string;
  message: string;
};

async function call<T>(path: string, token: string): Promise<T> {
  const res = await fetch(path.startsWith("http") ? path : `${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Calendly ${res.status}: ${await res.text()}`);
  return res.json();
}

export function formatWhen(iso: string, timeZone = "Asia/Kolkata") {
  const opts: Intl.DateTimeFormatOptions = { dateStyle: "full", timeStyle: "short" };
  try {
    return new Intl.DateTimeFormat("en-IN", { ...opts, timeZone }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "Asia/Kolkata" }).format(new Date(iso));
  }
}

export async function upcomingBookings(token: string): Promise<Booking[]> {
  const me = await call<{ resource: { uri: string } }>("/users/me", token);
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(); // include calls that started recently
  const params = new URLSearchParams({
    user: me.resource.uri,
    status: "active",
    min_start_time: since,
    sort: "start_time:asc",
    count: "50",
  });
  const events = await call<{ collection: ScheduledEvent[] }>(`/scheduled_events?${params}`, token);

  const lists = await Promise.all(
    events.collection.map(async (event) => {
      const invitees = await call<{ collection: Invitee[] }>(`${event.uri}/invitees?status=active`, token);
      return invitees.collection.map((inv): Booking => {
        const links = consultationLinks(site.url, roomForBooking(inv.uri));
        const answer = inv.questions_and_answers?.find((qa) => /whats\s?app|mobile|phone/i.test(qa.question || ""));
        const name = inv.name?.trim() || "there";
        const when = formatWhen(event.start_time, inv.timezone);
        return {
          inviteeUri: inv.uri,
          name,
          email: inv.email || "",
          phone: normalisePhone(answer?.answer) ?? normalisePhone(inv.text_reminder_number),
          start: event.start_time,
          eventName: event.name || "Consultation",
          customerLink: links.customer,
          consultantLink: links.consultant,
          message: `Hello ${name}, your NAZAAKAT style consultation is confirmed for ${when}.\n\nJoin your private video call here: ${links.customer}\n\nNo app or account needed. Just tap the link at your appointment time and allow your camera and microphone.`,
        };
      });
    }),
  );
  return lists.flat();
}
