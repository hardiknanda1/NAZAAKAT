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
        <div className="container-x flex h-16 items-center gap-3 sm:h-24 sm:gap-6">
          <Link href="/" aria-label="NAZAAKAT home" className="shrink-0">
            <Logo />
          </Link>
          <p className="border-l border-taupe/60 pl-3 font-serif text-[1.15rem] leading-tight text-chocolate italic min-[400px]:text-[1.3rem] sm:pl-6 sm:text-3xl lg:text-4xl">
            Discover the art of your style
          </p>
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
