import type { Metadata } from "next";
import { connection } from "next/server";
import { CalendarCog, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { formatWhen, nowMs } from "@/lib/time";
import { consultationLinks } from "@/lib/meeting";
import { site, whatsappLink } from "@/lib/site";
import {
  intakeForBooking,
  recentIntakes,
  signedUrls,
  supabaseConfigured,
  listConsultants,
  requestsForBookings,
  unusedDiscountForPhone,
  type BookingRequest,
  type Consultant,
  bookingEnds,
  currentBookings,
  pastBookings,
  type BookingRow,
  type Intake,
  PHOTO_BUCKET,
} from "@/lib/supabase";
import CopyButton from "./CopyButton";
import IntakeSummary from "./IntakeSummary";
import RemoveBookingButton from "./RemoveBookingButton";
import { acceptRequestAction, declineRequestAction, unassignAction } from "./consultants/actions";

export const metadata: Metadata = {
  title: "Bookings | NAZAAKAT",
  robots: { index: false, follow: false },
};

function ConsultantPanel({ booking, requests, consultants }: { booking: BookingRow; requests: BookingRequest[]; consultants: Map<string, Consultant> }) {
  const assigned = booking.consultant_id ? consultants.get(booking.consultant_id) : null;
  const pending = requests.filter((r) => r.status === "pending");
  return (
    <div className="mt-4 border-t border-taupe/40 pt-4">
      {assigned ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-base text-charcoal">
            Consultant: <strong className="font-medium">{assigned.name}</strong>
            {assigned.phone ? <span className="text-muted"> · +{assigned.phone}</span> : null}
          </p>
          <form action={unassignAction}>
            <input type="hidden" name="id" value={booking.id} />
            <button type="submit" className="text-sm text-muted underline underline-offset-4 hover:text-[#a3182c]">
              Take back
            </button>
          </form>
        </div>
      ) : pending.length === 0 ? (
        <p className="text-sm text-muted">No consultant yet. Consultants can ask to take it from their page.</p>
      ) : (
        <div>
          <p className="text-base font-medium text-charcoal">{pending.length === 1 ? "1 consultant wants" : `${pending.length} consultants want`} this booking</p>
          <ul className="mt-2 space-y-2">
            {pending.map((r) => {
              const c = consultants.get(r.consultant_id);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3">
                  <span className="text-base text-charcoal">
                    {c?.name ?? "A removed consultant"}
                    {c?.phone ? <span className="text-muted"> · +{c.phone}</span> : null}
                  </span>
                  <form action={acceptRequestAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="btn-primary min-h-9 px-4 text-sm">
                      Accept
                    </button>
                  </form>
                  <form action={declineRequestAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="btn-secondary min-h-9 px-4 text-sm">
                      Decline
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

async function BookingCard({
  booking,
  requests,
  consultants,
  now,
}: {
  booking: BookingRow;
  requests: BookingRequest[];
  consultants: Map<string, Consultant>;
  now: number;
}) {
  const ended = bookingEnds(booking) <= now;
  const live = !ended && new Date(booking.starts_at).getTime() <= now;
  const links = consultationLinks(site.url, booking.room);
  const infoLink = `${site.url.replace(/\/$/, "")}/admin/booking/${booking.id}`;
  const when = formatWhen(booking.starts_at);
  const phone = booking.whatsapp;

  const discountLine = booking.discount_percent ? `\n\nYour ${booking.discount_percent}% body-shape discount has been applied.` : "";
  const clientMessage = `Hello ${booking.name}, your NAZAAKAT style consultation is confirmed for ${when}.\n\nJoin your private video call here: ${links.customer}\n\nNo app or account needed. Just tap the link at your appointment time and allow your camera and microphone.${discountLine}`;
  const consultantMessage = `Hi, here are the details for the NAZAAKAT consultation with ${booking.name} on ${when}.\n\nOpen the consultant info page (sign in with the admin password): ${infoLink}`;

  let intake: Intake | null = null;
  let urls: Record<string, string> = {};
  // A discount saved to this number but not used yet, e.g. claimed after this booking was made.
  let savedDiscount: number | null = null;
  try {
    savedDiscount = booking.discount_percent ? null : ((await unusedDiscountForPhone(phone))?.percent ?? null);
  } catch (err) {
    console.error("[admin] Could not check this number's discount.", err);
  }
  try {
    intake = await intakeForBooking(booking.id);
    if (intake) urls = await signedUrls(PHOTO_BUCKET, intake.photos);
  } catch (err) {
    console.error("[admin] Could not load this booking's questionnaire.", err);
  }

  return (
    <li className="border border-taupe/50 bg-white/60 p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-3xl font-medium text-charcoal">{booking.name}</h2>
        <p className="text-base font-medium text-chocolate">
          {when} IST
          {live && <span className="ml-2 rounded-full bg-chocolate px-2.5 py-0.5 text-xs font-medium text-ivory">Happening now</span>}
          {ended && <span className="ml-2 rounded-full bg-beige px-2.5 py-0.5 text-xs font-medium text-muted">Ended</span>}
        </p>
      </div>
      <p className="mt-1 text-base text-muted">+{phone}</p>
      {booking.discount_percent ? (
        <p className="mt-2 inline-flex items-center rounded-full bg-chocolate/10 px-3 py-1 text-sm font-medium text-chocolate">
          {booking.discount_percent}% off applied: guessed their body shape
        </p>
      ) : savedDiscount ? (
        <p className="mt-2 inline-flex items-center rounded-full bg-[#b8924f]/15 px-3 py-1 text-sm font-medium text-chocolate">
          This number holds a {savedDiscount}% body-shape discount (not used yet)
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">No body-shape discount on this number</p>
      )}

      <ConsultantPanel booking={booking} requests={requests} consultants={consultants} />

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={`https://wa.me/${phone}?text=${encodeURIComponent(clientMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary min-h-11 px-5 text-sm"
        >
          <MessageCircle size={16} aria-hidden /> Send on WhatsApp
        </a>
        <CopyButton text={clientMessage} label="Copy message" />
        <CopyButton text={links.customer} label="Copy client link" />
      </div>

      <div className="mt-3 flex flex-wrap gap-3 border-t border-taupe/30 pt-3">
        <a href={links.consultant} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-11 px-5 text-sm">
          Join as consultant
        </a>
        <CopyButton text={links.consultant} label="Copy consultant link" />
      </div>
      <p className="mt-1 text-sm text-muted">&ldquo;Join as consultant&rdquo; and the consultant link give host video controls. Keep them to yourself.</p>

      <div className="mt-3 flex flex-wrap gap-3 border-t border-taupe/30 pt-3">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(consultantMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary min-h-11 px-5 text-sm"
        >
          <MessageCircle size={16} aria-hidden /> Send to consultant
        </a>
        <CopyButton text={consultantMessage} label="Copy consultant message" />
        <CopyButton text={infoLink} label="Copy consultant info link" />
      </div>
      <p className="mt-2 text-sm text-muted">
        If your consultant is someone else, send them this (pick the WhatsApp contact yourself, since no number is
        set here). It links to this booking&apos;s own page, which shows the questionnaire, photos and catalogue
        once they enter the admin password.
      </p>

      {intake ? <IntakeSummary intake={intake} urls={urls} /> : <p className="mt-5 text-base text-muted">Questionnaire and photos not sent yet.</p>}

      <div className="mt-5 flex justify-end border-t border-taupe/30 pt-3">
        <RemoveBookingButton id={booking.id} name={booking.name} upcoming={!ended} />
      </div>
    </li>
  );
}

async function Bookings() {
  await connection(); // always read live bookings at request time, never at build time
  if (!supabaseConfigured()) {
    return <p className="text-lg text-muted">Add SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel to see bookings here.</p>;
  }

  const now = nowMs();
  let upcoming: BookingRow[];
  let past: BookingRow[];
  try {
    [upcoming, past] = await Promise.all([currentBookings(now), pastBookings(now)]);
  } catch (err) {
    console.error("[admin] Could not load bookings from Supabase.", err);
    return <p role="alert" className="text-lg text-chocolate">Could not load bookings. Check the Supabase settings.</p>;
  }

  // Consultant requests: optional, so a missing table (schema not re-run yet) never hides the bookings.
  let requests: BookingRequest[] = [];
  let consultants = new Map<string, Consultant>();
  try {
    const [r, c] = await Promise.all([requestsForBookings([...upcoming, ...past].map((b) => b.id)), listConsultants()]);
    requests = r;
    consultants = new Map(c.map((x) => [x.id, x]));
  } catch (err) {
    console.error("[admin] Could not load consultant requests (run the current supabase/schema.sql).", err);
  }
  const card = (b: BookingRow) => (
    <BookingCard key={b.id} booking={b} requests={requests.filter((r) => r.booking_id === b.id)} consultants={consultants} now={now} />
  );

  return (
    <>
      {upcoming.length === 0 ? <p className="text-lg text-muted">No upcoming bookings.</p> : <ul className="space-y-6">{upcoming.map(card)}</ul>}
      {past.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-4xl font-medium text-charcoal">Past consultations</h2>
          <p className="mt-2 text-base text-muted">
            Bookings stay here after their time slot ends, most recent first, until you remove them.
          </p>
          <ul className="mt-6 space-y-6">{past.map(card)}</ul>
        </section>
      )}
    </>
  );
}

async function OtherQuestionnaires() {
  await connection();
  if (!supabaseConfigured()) return null;
  let all: Intake[];
  try {
    all = await recentIntakes();
  } catch {
    return null;
  }
  const orphaned = all.filter((it) => !it.booking_id).slice(0, 12);
  if (orphaned.length === 0) return null;
  const urls = await signedUrls(PHOTO_BUCKET, orphaned.flatMap((it) => it.photos));

  return (
    <section className="mt-14">
      <h2 className="font-serif text-3xl font-medium text-charcoal">Other questionnaires</h2>
      <p className="mt-2 text-base text-muted">Not tied to a booking in our system.</p>
      <ul className="mt-6 space-y-6">
        {orphaned.map((it) => (
          <li key={it.id} className="border border-taupe/50 bg-white/60 p-5 sm:p-7">
            <h3 className="font-serif text-2xl font-medium text-charcoal">{it.name || "Unnamed client"}</h3>
            <p className="mt-1 text-base text-muted">{it.whatsapp ? `+${it.whatsapp}` : "No WhatsApp number"}</p>
            <IntakeSummary intake={it} urls={urls} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function AdminPage() {
  const wa = whatsappLink();
  return (
    <div className="container-x max-w-4xl py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-5xl font-medium text-charcoal">Consultations</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted">
            Tap <strong className="font-medium text-charcoal">Send on WhatsApp</strong> to message the client. Send{" "}
            <strong className="font-medium text-charcoal">Copy consultant info link</strong> to your consultant so they can
            see this booking&apos;s details.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link href="/admin/availability" className="btn-secondary min-h-12 px-5 text-base">
            <CalendarCog size={18} strokeWidth={1.5} aria-hidden /> Manage availability
          </Link>
          <Link href="/admin/consultants" className="btn-secondary min-h-12 px-5 text-base">
            <Users size={18} strokeWidth={1.5} aria-hidden /> Consultants
          </Link>
        </div>
      </div>
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-base text-muted underline underline-offset-4 hover:text-chocolate">
          Chat with a client on WhatsApp
        </a>
      )}
      <div className="mt-10">
        <Bookings />
        <OtherQuestionnaires />
      </div>
    </div>
  );
}
