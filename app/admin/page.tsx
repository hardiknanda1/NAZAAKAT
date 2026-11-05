import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { Suspense } from "react";
import Logo from "@/components/Logo";
import { formatWhen, upcomingBookings, type Booking } from "@/lib/calendly";
import { questions } from "@/lib/intake";
import { recentIntakes, signedPhotoUrls, supabaseConfigured, type Intake } from "@/lib/supabase";
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

// A client's questionnaire answers and private photos (1-hour links).
function IntakeSummary({ intake, urls }: { intake: Intake; urls: Record<string, string> }) {
  const answered = questions.filter((q) => intake.answers?.[q.id]);
  return (
    <div className="mt-6 border-t border-taupe/40 pt-5">
      <p className="eyebrow">Questionnaire · sent {formatWhen(intake.created_at)}</p>
      {intake.photos.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {intake.photos.map((path, i) =>
            urls[path] ? (
              <a key={path} href={urls[path]} target="_blank" rel="noopener noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- private photo via a short-lived signed link */}
                <img src={urls[path]} alt={`Photo ${i + 1} from ${intake.name || "client"}`} className="h-36 w-28 rounded-md object-cover sm:h-44 sm:w-32" />
              </a>
            ) : null,
          )}
        </div>
      )}
      {answered.length > 0 ? (
        <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {answered.map((q) => {
            const v = intake.answers[q.id];
            return (
              <div key={q.id}>
                <dt className="text-sm text-muted">{q.label}</dt>
                <dd className="text-base text-charcoal">{Array.isArray(v) ? v.join(", ") : v}</dd>
              </div>
            );
          })}
        </dl>
      ) : (
        <p className="mt-4 text-base text-muted">No answers, photos only.</p>
      )}
    </div>
  );
}

type IntakeData = { byInvitee: Map<string, Intake>; others: Intake[]; urls: Record<string, string> };

async function loadIntakes(bookings: Booking[]): Promise<IntakeData | { error: string }> {
  if (!supabaseConfigured()) return { error: "Add SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel to see questionnaires and photos." };
  try {
    const all = await recentIntakes();
    const byInvitee = new Map<string, Intake>();
    for (const it of all) if (it.invitee_uri && !byInvitee.has(it.invitee_uri)) byInvitee.set(it.invitee_uri, it);
    const upcoming = new Set(bookings.map((b) => b.inviteeUri));
    const others = all.filter((it) => !it.invitee_uri || !upcoming.has(it.invitee_uri)).slice(0, 12);
    const shown = [...bookings.map((b) => byInvitee.get(b.inviteeUri)).filter((x): x is Intake => Boolean(x)), ...others];
    const urls = await signedPhotoUrls(shown.flatMap((it) => it.photos));
    return { byInvitee, others, urls };
  } catch (err) {
    console.error("[admin] Could not load questionnaires from Supabase.", err);
    return { error: "Could not load questionnaires from Supabase. Check the Supabase settings." };
  }
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

  const loaded = await loadIntakes(bookings);
  const intakes = "error" in loaded ? null : loaded;

  return (
    <>
    {"error" in loaded && (
      <p role="alert" className="mb-6 border border-taupe/60 bg-beige px-4 py-3 text-base text-chocolate">
        {loaded.error}
      </p>
    )}
    {bookings.length === 0 && <p className="text-lg text-muted">No upcoming bookings.</p>}
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

          {intakes &&
            (intakes.byInvitee.get(b.inviteeUri) ? (
              <IntakeSummary intake={intakes.byInvitee.get(b.inviteeUri)!} urls={intakes.urls} />
            ) : (
              <p className="mt-5 text-base text-muted">Questionnaire and photos not sent yet.</p>
            ))}
        </li>
      ))}
    </ul>

    {intakes && intakes.others.length > 0 && (
      <section className="mt-14">
        <h2 className="font-serif text-3xl font-medium text-charcoal">Other questionnaires</h2>
        <p className="mt-2 text-base text-muted">Sent from the details page, or for bookings that are not upcoming.</p>
        <ul className="mt-6 space-y-6">
          {intakes.others.map((it) => (
            <li key={it.id} className="border border-taupe/50 bg-white/60 p-5 sm:p-7">
              <h3 className="font-serif text-2xl font-medium text-charcoal">{it.name || "Unnamed client"}</h3>
              <p className="mt-1 text-base text-muted">
                {it.whatsapp ? `+${it.whatsapp}` : "No WhatsApp number"}
                {it.email && ` · ${it.email}`}
              </p>
              <IntakeSummary intake={it} urls={intakes.urls} />
            </li>
          ))}
        </ul>
      </section>
    )}
    </>
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
          client. Keep the consultant link to yourself, as it gives host controls.
        </p>
        <Suspense fallback={<p className="text-lg text-muted">Loading…</p>}>
          <Gate />
        </Suspense>
      </main>
    </div>
  );
}
