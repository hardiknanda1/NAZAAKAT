import { CalendarDays, MessageCircle } from "lucide-react";
import { site, whatsappLink } from "@/lib/site";
import CalendlyEmbed from "./CalendlyEmbed";
import Reveal from "./Reveal";

const steps = [
  "Pick a date and time that suits you.",
  "Enter your name and WhatsApp number (with country code).",
  "Share a few photos and answers. Your private meeting link then arrives on WhatsApp.",
];

function Placeholder() {
  const wa = whatsappLink("Hello NAZAAKAT, I would like to book a style consultation.");

  // Calendly is set but couldn't load here (e.g. blocked by the browser): offer it in a new tab.
  if (site.calendlyUrl) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center border border-taupe/60 bg-ivory px-6 py-16 text-center">
        <p className="eyebrow">Online booking</p>
        <p className="mt-5 max-w-lg font-serif text-4xl leading-tight text-charcoal">Choose your consultation time.</p>
        <p className="mt-4 max-w-md text-lg text-muted">Tap below to open our booking calendar.</p>
        <a href={site.calendlyUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-8 text-lg">
          <CalendarDays size={20} strokeWidth={1.5} aria-hidden /> Open the booking calendar
        </a>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-4 text-lg">
            <MessageCircle size={20} strokeWidth={1.5} aria-hidden /> Or book on WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center border border-taupe/60 bg-ivory px-6 py-16 text-center">
      <p className="eyebrow">Online booking</p>
      <p className="mt-5 max-w-lg font-serif text-4xl leading-tight text-charcoal">
        Our booking calendar is being prepared.
      </p>
      <p className="mt-4 max-w-md text-lg text-muted">
        Please check back very soon{wa ? ", or message us on WhatsApp and we will find a time with you." : "."}
      </p>
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-primary mt-8 text-lg">
          <MessageCircle size={20} strokeWidth={1.5} aria-hidden /> Book on WhatsApp
        </a>
      )}
    </div>
  );
}

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

        <ol className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3 sm:gap-8">
          {steps.map((s, i) => (
            <li key={s} className="flex gap-4 sm:flex-col sm:gap-2">
              <span className="font-serif text-3xl text-chocolate italic" aria-hidden>
                {i + 1}.
              </span>
              <span className="text-lg text-charcoal">
                <span className="sr-only">Step {i + 1}: </span>
                {s}
              </span>
            </li>
          ))}
        </ol>
        <p className="mx-auto mt-8 max-w-5xl text-center text-base text-muted">
          No registration, no passwords. Calendly will also ask for an email address to send your booking receipt.
        </p>

        <div className="mx-auto mt-12 max-w-5xl">
          <CalendlyEmbed url={site.calendlyUrl} fallback={<Placeholder />} />
        </div>
      </div>
    </section>
  );
}
