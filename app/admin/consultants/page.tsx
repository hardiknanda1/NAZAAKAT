import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLeft, ExternalLink, UserRound } from "lucide-react";
import Link from "next/link";
import { site } from "@/lib/site";
import { formatShort } from "@/lib/time";
import { CONSULTANT_PHOTO_BUCKET, bookingCountsByConsultant, listAllConsultants, signedUrls, supabaseConfigured, type Consultant } from "@/lib/supabase";
import CopyButton from "../CopyButton";
import AddConsultantForm from "./AddConsultantForm";
import TempPassword from "./TempPassword";
import { removeConsultantAction, setActiveAction } from "./actions";

export const metadata: Metadata = { title: "Consultants | NAZAAKAT", robots: { index: false, follow: false } };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 text-base">
      <dt className="text-muted">{label}</dt>
      <dd className="text-charcoal">{children}</dd>
    </div>
  );
}

function Card({ c, photo, bookings, loginUrl }: { c: Consultant; photo: string | null; bookings: number; loginUrl: string }) {
  return (
    <li className="border border-taupe/50 bg-white/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-5">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-taupe/50 bg-beige">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- private photo through a short-lived signed link
            <img src={photo} alt={`Photo of ${c.name}`} className="h-full w-full object-cover" />
          ) : (
            <UserRound size={34} strokeWidth={1.25} className="text-taupe" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-2xl font-medium text-charcoal">
            {c.name}
            {!c.active && <span className="ml-2 align-middle rounded-full bg-beige px-2.5 py-0.5 font-sans text-xs font-medium text-muted">Paused</span>}
          </p>
          <p className="text-base text-muted">
            <a href={`mailto:${c.email}`} className="hover:text-chocolate">
              {c.email}
            </a>
            {c.phone ? (
              <>
                {" · "}
                <a href={`https://wa.me/${c.phone}`} target="_blank" rel="noopener noreferrer" className="hover:text-chocolate">
                  +{c.phone}
                </a>
              </>
            ) : null}
          </p>
          <dl className="mt-4 space-y-1.5">
            <Row label="Expertise">{c.expertise?.length ? c.expertise.join(", ") : <span className="text-muted">Not added yet</span>}</Row>
            <Row label="Experience">{c.years_experience != null ? `${c.years_experience} year${c.years_experience === 1 ? "" : "s"}` : <span className="text-muted">Not added</span>}</Row>
            <Row label="Languages">{c.languages?.length ? c.languages.join(", ") : <span className="text-muted">Not added</span>}</Row>
            <Row label="City">{c.city || <span className="text-muted">Not added</span>}</Row>
            <Row label="Link">
              {c.portfolio_url ? (
                <a href={c.portfolio_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-chocolate underline underline-offset-4">
                  {c.portfolio_url.replace(/^https?:\/\//, "")} <ExternalLink size={13} aria-hidden />
                </a>
              ) : (
                <span className="text-muted">Not added</span>
              )}
            </Row>
            {c.bio && <Row label="About">{c.bio}</Row>}
            <Row label="Account">
              {c.password_hash ? "Password set" : "No password yet (use Reset password)"} · joined {formatShort(c.created_at)}
            </Row>
            <Row label="Bookings given">{bookings}</Row>
          </dl>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-start gap-3 border-t border-taupe/40 pt-4">
        <TempPassword id={c.id} name={c.name} email={c.email} phone={c.phone} loginUrl={loginUrl} />
        <form action={setActiveAction}>
          <input type="hidden" name="id" value={c.id} />
          <input type="hidden" name="active" value={String(!c.active)} />
          <button type="submit" className="btn-secondary min-h-10 px-4 text-sm">
            {c.active ? "Pause" : "Allow again"}
          </button>
        </form>
        <form action={removeConsultantAction}>
          <input type="hidden" name="id" value={c.id} />
          <button type="submit" className="min-h-10 px-3 text-sm text-muted underline underline-offset-4 hover:text-[#a3182c]">
            Remove
          </button>
        </form>
      </div>
    </li>
  );
}

async function List({ loginUrl }: { loginUrl: string }) {
  await connection();
  if (!supabaseConfigured()) return <p className="text-lg text-muted">Supabase is not set up yet.</p>;
  let consultants: Consultant[];
  let counts: Record<string, number> = {};
  let photos: Record<string, string> = {};
  try {
    consultants = await listAllConsultants();
    counts = await bookingCountsByConsultant().catch(() => ({}));
    const paths = consultants.map((c) => c.photo_path).filter((p): p is string => Boolean(p));
    photos = await signedUrls(CONSULTANT_PHOTO_BUCKET, paths).catch(() => ({}));
  } catch (err) {
    console.error("[admin/consultants] Could not load consultants.", err);
    return <p role="alert" className="text-lg text-chocolate">Could not load consultants. Run the current supabase/schema.sql, then refresh.</p>;
  }
  return (
    <section>
      <h2 className="font-serif text-3xl font-medium text-charcoal">Consultants ({consultants.length})</h2>
      {consultants.length === 0 ? (
        <p className="mt-3 text-lg text-muted">No consultants yet. They appear here as soon as they sign up.</p>
      ) : (
        <ul className="mt-5 space-y-5">
          {consultants.map((c) => (
            <Card key={c.id} c={c} photo={c.photo_path ? (photos[c.photo_path] ?? null) : null} bookings={counts[c.id] || 0} loginUrl={loginUrl} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ConsultantsPage() {
  const loginUrl = `${site.url.replace(/\/$/, "")}/consultant`;
  return (
    <div className="container-x max-w-4xl py-12">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-base text-muted hover:text-chocolate">
        <ArrowLeft size={16} aria-hidden /> Bookings
      </Link>
      <h1 className="mt-4 font-serif text-5xl font-medium text-charcoal">Consultants</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        Anyone can sign up at <strong className="font-medium text-charcoal">{loginUrl}</strong> with their name, email, phone and a
        password, then fill in their profile. They ask to take open bookings, and see the consultant link once you accept. If someone
        forgets their password, <strong className="font-medium text-charcoal">Reset password</strong> gives you a temporary one to send
        them on WhatsApp. Pausing someone signs them out at once.
      </p>
      <div className="mt-4">
        <CopyButton text={loginUrl} label="Copy sign-in link" />
      </div>
      <div className="mt-10">
        <AddConsultantForm loginUrl={loginUrl} />
      </div>
      <div className="mt-12">
        <Suspense fallback={<p className="text-lg text-muted">Loading…</p>}>
          <List loginUrl={loginUrl} />
        </Suspense>
      </div>
    </div>
  );
}
