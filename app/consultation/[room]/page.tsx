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
      <header className="bg-gradient-to-r from-[#4d0d1a] via-[#5c1020] to-[#6b1424]">
        {/* Brand-red strip: logo on the left, tagline centred in white, as on the catalogue cover. */}
        <div className="container-x grid h-16 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:h-24 sm:grid-cols-[1fr_auto_1fr] sm:gap-6">
          <Link href="/" aria-label="NAZAAKAT home" className="shrink-0 justify-self-start">
            <Logo />
          </Link>
          <p className="w-full text-center font-serif text-[1.05rem] leading-tight text-white italic min-[400px]:text-[1.2rem] sm:w-auto sm:text-3xl lg:text-4xl">
            Discover the art of your style
          </p>
          <span aria-hidden className="hidden sm:block" />
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
