import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Logo from "@/components/Logo";
import { isValidRoom } from "@/lib/meeting";
import JitsiRoom from "./JitsiRoom";

export const metadata: Metadata = {
  title: "Your Consultation | NAZAAKAT",
  robots: { index: false, follow: false },
};

async function Room({ params }: { params: PageProps<"/consultation/[room]">["params"] }) {
  const { room } = await params;
  if (!isValidRoom(room)) notFound();
  return <JitsiRoom room={room} />;
}

export default function ConsultationPage({ params }: PageProps<"/consultation/[room]">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-beige">
        <div className="container-x flex h-24 items-center">
          <Link href="/" aria-label="NAZAAKAT home">
            <Logo />
          </Link>
        </div>
      </header>
      <main id="main" className="flex flex-1 flex-col">
        <Suspense fallback={<p className="container-x py-16 text-muted">Preparing your consultation room…</p>}>
          <Room params={params} />
        </Suspense>
      </main>
    </div>
  );
}
