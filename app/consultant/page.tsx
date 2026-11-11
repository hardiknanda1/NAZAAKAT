import { connection } from "next/server";
import { Suspense } from "react";
import CopyButton from "@/app/admin/CopyButton";
import { currentConsultant } from "@/lib/consultantAuth";
import { consultationLinks } from "@/lib/meeting";
import { site } from "@/lib/site";
import { formatWhen } from "@/lib/time";
import { consultantBookings, requestsByConsultant, unassignedBookings, type BookingRow } from "@/lib/supabase";
import ConsultantLogin from "./ConsultantLogin";
import RequestButton from "./RequestButton";
import SignOutButton from "./SignOutButton";

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "Client";

function MyBooking({ booking }: { booking: BookingRow }) {
  const links = consultationLinks(site.url, booking.room);
  return (
    <li className="border border-taupe/50 bg-white/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-serif text-2xl font-medium text-charcoal">{booking.name}</p>
        <p className="text-base font-medium text-chocolate">{formatWhen(booking.starts_at)} IST</p>
      </div>
      <p className="mt-1 text-base text-muted">{booking.duration_minutes} minutes</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href={links.consultant} target="_blank" rel="noopener noreferrer" className="btn-primary min-h-11 px-5 text-sm">
          Join as consultant
        </a>
        <CopyButton text={links.consultant} label="Copy consultant link" />
      </div>
      <p className="mt-3 text-sm text-muted">This link gives you host controls in the video call. Keep it to yourself.</p>
    </li>
  );
}

export default function ConsultantPage() {
  return (
    <Suspense fallback={<p className="container-x py-16 text-lg text-muted">Loading…</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  await connection();
  const consultant = await currentConsultant();
  if (!consultant) return <ConsultantLogin />;

  const now = new Date().toISOString();
  let mine: BookingRow[] = [];
  let open: BookingRow[] = [];
  let requested = new Map<string, string>();
  try {
    const [m, o, r] = await Promise.all([consultantBookings(consultant.id, now), unassignedBookings(now), requestsByConsultant(consultant.id)]);
    mine = m;
    open = o;
    requested = new Map(r.map((x) => [x.booking_id, x.status]));
  } catch (err) {
    console.error("[consultant] Could not load bookings.", err);
    return <p role="alert" className="container-x py-16 text-lg text-chocolate">Could not load bookings just now. Please refresh the page.</p>;
  }

  return (
    <div className="container-x max-w-4xl py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Signed in as {consultant.email}</p>
          <h1 className="mt-3 font-serif text-5xl font-medium text-charcoal">Hello, {firstName(consultant.name)}</h1>
        </div>
        <SignOutButton />
      </div>

      <section className="mt-12">
        <h2 className="font-serif text-3xl font-medium text-charcoal">Your consultations</h2>
        {mine.length === 0 ? (
          <p className="mt-3 text-lg text-muted">None yet. When the admin accepts your request, the consultation and its link appear here.</p>
        ) : (
          <ul className="mt-5 space-y-4">
            {mine.map((b) => (
              <MyBooking key={b.id} booking={b} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-14">
        <h2 className="font-serif text-3xl font-medium text-charcoal">Available consultations</h2>
        <p className="mt-2 text-base text-muted">Upcoming bookings no consultant has been given yet. Ask to take one and the admin will confirm.</p>
        {open.length === 0 ? (
          <p className="mt-4 text-lg text-muted">No open bookings right now.</p>
        ) : (
          <ul className="mt-5 divide-y divide-taupe/40 border-y border-taupe/40">
            {open.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-lg font-medium text-charcoal">{formatWhen(b.starts_at)} IST</p>
                  <p className="text-base text-muted">
                    {firstName(b.name)} · {b.duration_minutes} minutes
                  </p>
                </div>
                <RequestButton bookingId={b.id} status={requested.get(b.id) ?? null} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
