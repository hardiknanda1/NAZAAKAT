import { ArrowRight, Camera, CalendarCheck, MessageCircle } from "lucide-react";
import Link from "next/link";
import { BOOK_HREF } from "@/lib/site";
import Reveal from "./Reveal";

const steps = [
  { Icon: CalendarCheck, text: "Pick a date and time that suits you." },
  { Icon: MessageCircle, text: "Enter your name and WhatsApp number." },
  { Icon: Camera, text: "Share a few photos and answers, then your meeting link arrives on WhatsApp." },
];

// A short invitation on the home page; the actual date and time picker lives on its own page.
export default function Booking() {
  return (
    <section id="book" aria-labelledby="book-title" className="bg-beige py-24 lg:py-32">
      <div className="container-x">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Book a Consultation</p>
          <h2 id="book-title" className="mt-5 font-serif text-5xl leading-[1.08] font-medium text-charcoal lg:text-6xl">
            Your Personal Style Journey <span className="italic text-chocolate">Starts Here.</span>
          </h2>
          <p className="mt-6 text-xl text-muted">Book a one-on-one consultation with our style experts.</p>
        </Reveal>

        <ol className="mx-auto mt-14 grid max-w-4xl gap-8 sm:grid-cols-3">
          {steps.map(({ Icon, text }, i) => (
            <Reveal key={text} delay={i * 0.08}>
              <li className="flex flex-col items-center text-center sm:items-start sm:text-left">
                <Icon className="h-9 w-9 text-chocolate" strokeWidth={1.5} aria-hidden />
                <span className="mt-4 text-lg text-charcoal">
                  <span className="sr-only">Step {i + 1}: </span>
                  {text}
                </span>
              </li>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mt-14 flex flex-col items-center gap-4">
          <Link href={BOOK_HREF} className="btn-primary min-h-16 px-10 text-xl">
            Book Your Consultation <ArrowRight size={22} strokeWidth={1.5} aria-hidden />
          </Link>
          <p className="max-w-md text-center text-base text-muted">
            No registration, no passwords, no email address needed.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
