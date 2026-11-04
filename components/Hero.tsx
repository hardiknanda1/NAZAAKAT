import { ArrowRight, CircleArrowRight, CircleCheck, Layers } from "lucide-react";
import Photo from "./Photo";
import Reveal from "./Reveal";

// Small line icons in the same stroke style as Lucide.
function DressFormIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2v2" />
      <path d="M9 4h6c0 2-1.2 3-1.2 4.5 0 1.3 2.2 2.3 2.2 5.5 0 3-2 5-4 5h-2c-2 0-4-2-4-5 0-3.2 2.2-4.2 2.2-5.5C9.2 7 9 6 9 4Z" />
      <path d="M12 19v3M9.5 22h5" />
    </svg>
  );
}

function HangerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 6.5a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2V10" />
      <path d="M12 10 3.3 16.2A1 1 0 0 0 3.9 18h16.2a1 1 0 0 0 .6-1.8Z" />
    </svg>
  );
}

// Dotted figure outline used on the "Body Analysis" card.
function Silhouette() {
  return (
    <svg viewBox="0 0 40 110" className="h-24 w-9 text-taupe" fill="none" stroke="currentColor" strokeWidth={0.9} strokeDasharray="2 2" aria-hidden>
      <circle cx="20" cy="9" r="6" />
      <path d="M17 15v4c-5 1-8 3-8 7l1 14c0 4 3 6 3 10s-3 8-3 13c0 4 3 7 4 10l1 30M23 15v4c5 1 8 3 8 7l-1 14c0 4-3 6-3 10s3 8 3 13c0 4-3 7-4 10l-1 30" />
      <path d="M9 27 5 48l2 10M31 27l4 21-2 10" />
    </svg>
  );
}

const features = [
  { label: "Body Analysis", Icon: DressFormIcon },
  { label: "Personalised Looks", Icon: HangerIcon },
  { label: "Wardrobe Planning", Icon: Layers },
];

// Fabric-tone swatches stand in until the catalogue photographs are added.
const looks = [
  { name: "look-1", tone: "#6b2c32" },
  { name: "look-2", tone: "#e4d8c6" },
  { name: "look-3", tone: "#2f4a3b" },
];

const card = "border border-white/70 bg-ivory/90 shadow-[0_12px_40px_-12px_rgba(73,55,46,0.18)] backdrop-blur-sm";

export default function Hero() {
  return (
    <section
      id="home"
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-[radial-gradient(ellipse_at_70%_20%,#fdfbf8_0%,#f8f5f0_45%,#efe8de_100%)] pt-28 pb-20 sm:pt-32 lg:pt-36 lg:pb-28"
    >
      <div className="container-x grid items-center gap-14 lg:grid-cols-12 lg:gap-8">
        {/* Copy */}
        <div className="lg:col-span-6">
          <p className="eyebrow">Personal Fashion Consulting</p>
          <h1
            id="hero-title"
            className="mt-6 font-serif text-[2.9rem] leading-[1.05] font-medium text-charcoal sm:text-6xl lg:text-[4.1rem] xl:text-[4.6rem]"
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

          <ul className="mt-14 grid max-w-xl grid-cols-3 divide-x divide-taupe/50">
            {features.map(({ label, Icon }) => (
              <li key={label} className="flex flex-col items-center gap-3 px-2 text-center">
                <Icon className="h-9 w-9 text-chocolate" aria-hidden />
                <span className="text-[0.95rem] leading-snug font-medium text-charcoal sm:text-base">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Visual: arched photograph with floating detail cards */}
        <div className="relative mx-auto w-full max-w-[34rem] lg:col-span-6 lg:max-w-none">
          <div className="relative mr-[22%] ml-[6%] sm:mr-[26%] lg:mr-[24%] lg:ml-[10%]">
            {/* Thin outline arc and sparkle */}
            <div aria-hidden className="absolute -top-6 -left-8 h-[70%] w-[90%] rounded-t-full border-t border-l border-taupe/70" />
            <svg aria-hidden viewBox="0 0 24 24" className="absolute top-[9%] -left-3 h-7 w-7 text-chocolate/80">
              <path fill="currentColor" d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0Z" />
            </svg>

            <Photo
              name="hero"
              alt="An elegant woman in an embroidered ivory outfit, photographed in soft natural light"
              className="aspect-[5/7] w-full rounded-t-full bg-[#e6dccf]"
              sizes="(min-width: 1024px) 26rem, 70vw"
              preload
            />
          </div>

          {/* Detail cards (illustrative, hidden from screen readers) */}
          <div aria-hidden className="pointer-events-none">
            <Reveal delay={0.2} className="absolute top-[8%] right-0 w-[48%] max-w-[15.5rem]">
              <div className={`${card} flex items-center gap-3 rounded-2xl p-4`}>
                <Silhouette />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center justify-between gap-2 text-sm font-medium text-charcoal">
                    Body Analysis <CircleCheck size={18} strokeWidth={1.5} className="shrink-0 text-chocolate" />
                  </p>
                  <div className="my-3 h-px bg-beige" />
                  <p className="text-sm text-muted">Your Shape</p>
                  <p className="text-lg font-medium text-charcoal">Hourglass</p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.35} className="absolute top-[37%] right-[-2%] hidden w-[58%] max-w-[19rem] sm:block lg:right-[-4%]">
              <div className={`${card} rounded-2xl p-4`}>
                <p className="text-sm font-medium text-charcoal sm:text-base">Curated For You</p>
                <div className="mt-3 flex items-center gap-2">
                  {looks.map((l) => (
                    <Photo
                      key={l.name}
                      name={l.name}
                      alt=""
                      className="aspect-[4/5] flex-1 rounded-lg"
                      sizes="80px"
                      fallback={<div className="h-full w-full" style={{ background: l.tone }} />}
                    />
                  ))}
                  <CircleArrowRight size={26} strokeWidth={1.25} className="ml-1 shrink-0 text-chocolate" />
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.5} className="absolute right-0 bottom-[2%] hidden w-[52%] max-w-[17rem] sm:block">
              <ul className={`${card} space-y-3 rounded-2xl p-5 text-sm text-charcoal`}>
                {["Flatter Your Proportions", "Style Recommendations", "Complete Outfit Guidance"].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <CircleCheck size={18} strokeWidth={1.5} className="shrink-0 text-chocolate" /> {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
