import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import BookingFlow from "./BookingFlow";

export const metadata: Metadata = {
  title: "Book a Consultation | NAZAAKAT",
  description: "Choose a time, share your details and a few photos, and your private video consultation link arrives on WhatsApp.",
};

export default function BookPage() {
  return (
    <div className="min-h-dvh bg-beige">
      <header className="border-b border-taupe/40 bg-ivory">
        <div className="container-x flex h-16 items-center sm:h-24">
          <Link href="/" aria-label="NAZAAKAT home">
            <Logo />
          </Link>
        </div>
      </header>
      <main id="main" className="container-x max-w-3xl py-10 sm:py-16">
        <p className="eyebrow">Book a Consultation</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight font-medium text-charcoal sm:text-5xl">
          Your Personal Style Journey <span className="text-chocolate italic">Starts Here.</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Choose a time that suits you. No registration, no passwords, no email address needed.
        </p>
        <div className="mt-10">
          <BookingFlow />
        </div>
      </main>
    </div>
  );
}
