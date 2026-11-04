import { ArrowRight } from "lucide-react";
import Photo from "./Photo";

export default function Hero() {
  return (
    <section id="home" aria-labelledby="hero-title" className="pt-28 pb-20 sm:pt-32 lg:pt-36 lg:pb-28">
      <div className="container-x grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6 lg:pr-4">
          <p className="eyebrow">Personal Fashion Consulting</p>
          <h1
            id="hero-title"
            className="mt-6 font-serif text-[2.9rem] leading-[1.05] font-medium text-charcoal sm:text-6xl lg:text-[4rem] xl:text-[4.5rem]"
          >
            Style is personal.
            <span className="mt-1 block text-chocolate italic">Let us make it yours.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-muted sm:text-xl">
            Discover your proportions, understand your style, and find the looks that celebrate you. Personalised
            fashion guidance designed around <strong className="font-medium text-charcoal">you</strong>.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a href="#book" className="btn-primary text-lg">
              Book Your Consultation <ArrowRight size={20} strokeWidth={1.5} aria-hidden />
            </a>
            <a href="#services" className="btn-secondary text-lg">
              Explore Our Services
            </a>
          </div>
        </div>

        <div className="lg:col-span-6">
          <Photo
            name="hero"
            alt="An elegant woman in a softly draped outfit, photographed in natural light"
            className="aspect-[4/5] w-full lg:ml-auto lg:max-w-[34rem]"
            sizes="(min-width: 1024px) 34rem, 100vw"
            preload
          />
        </div>
      </div>
    </section>
  );
}
