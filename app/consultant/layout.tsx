import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: "Consultants | NAZAAKAT", robots: { index: false, follow: false } };

export default function ConsultantLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-beige">
        <div className="container-x flex h-24 items-center justify-between">
          <Logo />
          <p className="eyebrow">Consultants</p>
        </div>
      </header>
      <main id="main">
        <Suspense fallback={<p className="container-x py-16 text-lg text-muted">Loading…</p>}>{children}</Suspense>
      </main>
    </div>
  );
}
