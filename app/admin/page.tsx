import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { Suspense } from "react";
import Logo from "@/components/Logo";
import { formatWhen, upcomingBookings } from "@/lib/calendly";
import { isSignedIn, signOut } from "./actions";
import CopyButton from "./CopyButton";
import PasswordForm from "./PasswordForm";

export const metadata: Metadata = {
  title: "Bookings | NAZAAKAT",
  robots: { index: false, follow: false },
};

// Private page: asks for ADMIN_PASSWORD, then lists upcoming bookings with their meeting links.
async function Gate() {
  if (!(await isSignedIn())) {
    return (
      <>
        <p className="mb-6 text-lg text-muted">Enter the password to see bookings.</p>
        <PasswordForm />
      </>
    );
  }
  return (
    <>
      <Bookings />
      <form action={signOut} className="mt-10">
        <button type="submit" className="text-base text-muted underline underline-offset-4 hover:text-chocolate">
          Sign out on this device
        </button>
      </form>
    </>
  );
}

async function Bookings() {
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) {
    return <p className="text-lg text-muted">Add <code>CALENDLY_API_TOKEN</code> in Vercel to see bookings here.</p>;
  }

  let bookings;
  try {
    bookings = await upcomingBookings(token);
  } catch (err) {
    console.error("[admin] Could not load bookings from Calendly.", err);
    return <p role="alert" className="text-lg text-chocolate">Could not load bookings from Calendly. Check the API token.</p>;
  }

  if (bookings.length === 0) return <p className="text-lg text-muted">No upcoming bookings.</p>;

  return (
    <ul className="space-y-6">
      {bookings.map((b) => (
        <li key={b.customerLink} className="border border-taupe/50 bg-white/60 p-5 sm:p-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-3xl font-medium text-charcoal">{b.name}</h2>
            <p className="text-base font-medium text-chocolate">{formatWhen(b.start)} IST</p>
          </div>
          <p className="mt-1 text-base text-muted">
            {b.phone ? `+${b.phone}` : "No WhatsApp number given"}
            {b.email && ` · ${b.email}`}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {b.phone && (
              <a
                href={`https://wa.me/${b.phone}?text=${encodeURIComponent(b.message)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary min-h-11 px-5 text-sm"
              >
                <MessageCircle size={16} aria-hidden /> Send on WhatsApp
              </a>
            )}
            <CopyButton text={b.message} label="Copy message" />
            <CopyButton text={b.customerLink} label="Copy customer link" />
            <a href={b.consultantLink} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-11 px-5 text-sm">
              Join as consultant
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AdminPage() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-beige">
        <div className="container-x flex h-24 items-center justify-between">
          <Logo />
          <p className="eyebrow">Bookings</p>
        </div>
      </header>
      <main id="main" className="container-x max-w-4xl py-12">
        <h1 className="font-serif text-5xl font-medium text-charcoal">Upcoming consultations</h1>
        <p className="mt-3 mb-10 text-lg text-muted">
          Tap <strong className="font-medium text-charcoal">Send on WhatsApp</strong> to open a ready-written message to the
          client. Keep the consultant link to yourself — it gives host controls.
        </p>
        <Suspense fallback={<p className="text-lg text-muted">Loading…</p>}>
          <Gate />
        </Suspense>
      </main>
    </div>
  );
}
