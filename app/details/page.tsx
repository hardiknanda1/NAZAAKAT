import type { Metadata } from "next";
import Link from "next/link";
import DetailsForm from "./DetailsForm";
import Logo from "@/components/Logo";

// The booking questionnaire on its own page, for clients who booked in a new tab
// or were sent the link afterwards. It asks for name and WhatsApp number too.
export const metadata: Metadata = {
  title: "Your Details | NAZAAKAT",
  robots: { index: false, follow: false },
};

export default function DetailsPage() {
  return (
    <div className="min-h-dvh bg-beige">
      <header className="border-b border-taupe/40 bg-ivory">
        <div className="container-x flex h-16 items-center sm:h-24">
          <Link href="/" aria-label="NAZAAKAT home">
            <Logo />
          </Link>
        </div>
      </header>
      <main id="main" className="container-x max-w-4xl py-10 sm:py-16">
        <DetailsForm />
      </main>
    </div>
  );
}
