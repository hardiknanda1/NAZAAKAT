import { Video } from "lucide-react";
import Reveal from "./Reveal";

// Direct-consultation version: no calendar, the button opens the video call straight away.
export default function Booking() {
  return (
    <section id="book" aria-labelledby="book-title" className="bg-beige py-24 lg:py-32">
      <Reveal className="container-x mx-auto max-w-3xl text-center">
        <p className="eyebrow">Your Consultation</p>
        <h2 id="book-title" className="mt-5 font-serif text-5xl leading-[1.08] font-medium text-charcoal lg:text-6xl">
          Your Personal Style Journey <span className="italic text-chocolate">Starts Here.</span>
        </h2>
        <p className="mt-6 text-xl text-muted">
          Ready for your one-on-one session? Tap below — your style consultant will meet you in a private video call.
        </p>
        <a href="/start" className="btn-primary mt-10 min-h-16 px-10 text-xl">
          <Video size={24} strokeWidth={1.5} aria-hidden /> Start Consultation
        </a>
        <p className="mt-6 text-base text-muted">
          Works on your phone, tablet or computer. Please allow your camera and microphone when asked.
        </p>
      </Reveal>
    </section>
  );
}
