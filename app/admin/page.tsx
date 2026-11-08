import type { Metadata } from "next";
import { connection } from "next/server";
import { CalendarCog, MessageCircle } from "lucide-react";
import Link from "next/link";
import { formatWhen } from "@/lib/time";
import { consultationLinks } from "@/lib/meeting";
import { site, whatsappLink } from "@/lib/site";
import {
  intakeForBooking,
  recentIntakes,
  signedUrls,
  supabaseConfigured,
  upcomingBookings,
  type BookingRow,
  type Intake,
  PHOTO_BUCKET,
} from "@/lib/supabase";
import CopyButton from "./CopyButton";
import IntakeSummary from "./IntakeSummary";

export const metadata: Metadata = {
  title: "Bookings | NAZAAKAT",
  robots: { index: false, follow: false },
};

async function BookingCard({ booking }: { booking: BookingRow }) {
  const links = consultationLinks(site.url, booking.room);
  const infoLink = `${site.url.replace(/\/$/, "")}/admin/booking/${booking.id}`;
  const when = formatWhen(booking.starts_at);
  const phone = booking.whatsapp;

  const discountLine = booking.discount_percent ? `\n\nYour ${booking.discount_percent}% body-shape discount has been applied.` : "";
  const clientMessage = `Hello ${booking.name}, your NAZAAKAT style consultation is confirmed for ${when}.\n\nJoin your private video call here: ${links.customer}\n\nNo app or account needed. Just tap the link at your appointment time and allow your camera and microphone.${discountLine}`;
  const consultantMessage = `Hi, here are the details for the NAZAAKAT consultation with ${booking.name} on ${when}.\n\nOpen the consultant info page (sign in with the admin password): ${infoLink}`;

  let intake: Intake | null = null;
  let urls: Record<string, string> = {};
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
        <p className="text-base font-medium text-chocolate">{when} IST</p>
      </div>
      <p className="mt-1 text-base text-muted">+{phone}</p>
      {booking.discount_percent ? (
        <p className="mt-2 inline-flex items-center rounded-full bg-[#6b1424]/10 px-3 py-1 text-sm font-medium text-[#6b1424]">
          {booking.discount_percent}% off: guessed their body shape
        </p>
      ) : null}

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
    </li>
  );
}

async function Bookings() {
  await connection(); // always read live bookings at request time, never at build time
  if (!supabaseConfigured()) {
    return <p className="text-lg text-muted">Add SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel to see bookings here.</p>;
  }

  let bookings: BookingRow[];
  try {
    bookings = await upcomingBookings(new Date().toISOString());
  } catch (err) {
    console.error("[admin] Could not load bookings from Supabase.", err);
    return <p role="alert" className="text-lg text-chocolate">Could not load bookings. Check the Supabase settings.</p>;
  }

  if (bookings.length === 0) return <p className="text-lg text-muted">No upcoming bookings.</p>;

  return (
    <ul className="space-y-6">
      {bookings.map((b) => (
        <BookingCard key={b.id} booking={b} />
      ))}
    </ul>
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
          <h1 className="font-serif text-5xl font-medium text-charcoal">Upcoming consultations</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted">
            Tap <strong className="font-medium text-charcoal">Send on WhatsApp</strong> to message the client. Send{" "}
            <strong className="font-medium text-charcoal">Copy consultant info link</strong> to your consultant so they can
            see this booking&apos;s details.
          </p>
        </div>
        <Link href="/admin/availability" className="btn-secondary min-h-12 shrink-0 px-5 text-base">
          <CalendarCog size={18} strokeWidth={1.5} aria-hidden /> Manage availability
        </Link>
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
