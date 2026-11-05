import type { Metadata } from "next";
import { ArrowLeft, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { consultationLinks } from "@/lib/meeting";
import { site } from "@/lib/site";
import { formatWhen } from "@/lib/time";
import { getBooking, intakeForBooking, PHOTO_BUCKET, signedUrls } from "@/lib/supabase";
import CopyButton from "../../CopyButton";
import IntakeSummary from "../../IntakeSummary";
import CatalogueUpload from "./CatalogueUpload";

export const metadata: Metadata = {
  title: "Booking | NAZAAKAT",
  robots: { index: false, follow: false },
};

// The page a consultant opens (with the admin password) to see one booking's details, without
// seeing every other client on the bookings list.
export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await connection(); // always look this booking up at request time, never at build time
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) notFound();

  const links = consultationLinks(site.url, booking.room);
  const when = formatWhen(booking.starts_at);
  const clientMessage = `Hello ${booking.name}, your NAZAAKAT style consultation is confirmed for ${when}.\n\nJoin your private video call here: ${links.customer}\n\nNo app or account needed. Just tap the link at your appointment time and allow your camera and microphone.`;

  const intake = await intakeForBooking(booking.id).catch(() => null);
  const urls = intake ? await signedUrls(PHOTO_BUCKET, intake.photos).catch(() => ({})) : {};

  return (
    <div className="container-x max-w-3xl py-12">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-base text-muted hover:text-chocolate">
        <ArrowLeft size={16} aria-hidden /> Back to bookings
      </Link>

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-serif text-4xl font-medium text-charcoal sm:text-5xl">{booking.name}</h1>
        <p className="text-base font-medium text-chocolate">{when} IST</p>
      </div>
      <p className="mt-1 text-base text-muted">+{booking.whatsapp}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <a href={links.consultant} target="_blank" rel="noopener noreferrer" className="btn-primary min-h-12 px-6 text-base">
          Join as consultant
        </a>
        <CopyButton text={links.consultant} label="Copy consultant link" />
      </div>
      <p className="mt-2 text-sm text-muted">This link gives host video controls. Keep it to yourself.</p>

      <div className="mt-6 flex flex-wrap gap-3 border-t border-taupe/40 pt-5">
        <a
          href={`https://wa.me/${booking.whatsapp}?text=${encodeURIComponent(clientMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary min-h-11 px-5 text-sm"
        >
          <MessageCircle size={16} aria-hidden /> Message the client
        </a>
        <CopyButton text={clientMessage} label="Copy message" />
        <CopyButton text={links.customer} label="Copy client link" />
      </div>

      {intake ? <IntakeSummary intake={intake} urls={urls} /> : <p className="mt-6 border-t border-taupe/40 pt-5 text-base text-muted">Questionnaire and photos not sent yet.</p>}

      <CatalogueUpload bookingId={booking.id} initial={booking.catalogue} />
    </div>
  );
}
