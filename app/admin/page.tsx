import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import Logo from "@/components/Logo";
import { consultationLinks, directRoom } from "@/lib/meeting";
import { site } from "@/lib/site";
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
      <DirectRoom />
      <form action={signOut} className="mt-10">
        <button type="submit" className="text-base text-muted underline underline-offset-4 hover:text-chocolate">
          Sign out on this device
        </button>
      </form>
    </>
  );
}

// Direct-consultation site: one room that every "Start Consultation" button opens.
// Links use the address this page was opened on, so they always match the live site.
async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!host) return site.url;
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function DirectRoom() {
  const links = consultationLinks(await siteOrigin(), directRoom());
  return (
    <div className="border border-taupe/50 bg-white/60 p-5 sm:p-7">
      <h2 className="font-serif text-3xl font-medium text-charcoal">Consultation room</h2>
      <p className="mt-2 text-base text-muted">
        Clients join from the <strong className="font-medium text-charcoal">Start Consultation</strong> button on the website.
        Join below as the consultant to get host controls.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <a href={links.consultant} target="_blank" rel="noopener noreferrer" className="btn-primary min-h-11 px-5 text-sm">
          Join as consultant
        </a>
        <CopyButton text={links.customer} label="Copy client link" />
      </div>
    </div>
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
        <h1 className="font-serif text-5xl font-medium text-charcoal">Consultations</h1>
        <p className="mt-3 mb-10 text-lg text-muted">
          Keep the consultant link to yourself — it gives host controls.
        </p>
        <Suspense fallback={<p className="text-lg text-muted">Loading…</p>}>
          <Gate />
        </Suspense>
      </main>
    </div>
  );
}
