import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="container-x flex min-h-dvh flex-col items-start justify-center py-24">
      <p className="eyebrow">Page not found</p>
      <h1 className="mt-5 font-serif text-5xl font-medium text-charcoal">We couldn&apos;t find that page.</h1>
      <p className="mt-5 max-w-lg text-lg text-muted">
        If you were joining a consultation, please use the exact link we sent you on WhatsApp.
      </p>
      <Link href="/" className="btn-primary mt-10 text-lg">
        Return to NAZAAKAT
      </Link>
    </main>
  );
}
