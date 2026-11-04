import { ArrowRight, CircleArrowRight, CircleCheck, Layers } from "lucide-react";
import Image from "next/image";
import heroNarrow from "@/public/images/hero-narrow.webp";
import heroWide from "@/public/images/hero-wide.webp";
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
    <svg viewBox="0 0 40 110" className="h-[6.5em] w-[2.4em] shrink-0 text-taupe" fill="none" stroke="currentColor" strokeWidth={0.9} strokeDasharray="2 2" aria-hidden>
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

const card = "border border-white/80 bg-[#f8f4ef] shadow-[0_12px_40px_-14px_rgba(73,55,46,0.22)]";

// Softens the photograph's top and side edges into the section background.
const fade: React.CSSProperties = {
  maskImage: "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent), linear-gradient(to bottom, transparent, #000 6%)",
  WebkitMaskImage: "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent), linear-gradient(to bottom, transparent, #000 6%)",
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
};

function BodyCard({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`${card} flex items-center gap-[0.9em] rounded-2xl ${className}`}>
      <Silhouette />
      <div className="min-w-0 flex-1">
        <p className="flex items-center justify-between gap-2 font-medium text-charcoal">
          Body Analysis <CircleCheck strokeWidth={1.5} className="h-[1.3em] w-[1.3em] shrink-0 text-chocolate" />
        </p>
        <div className="my-[0.8em] h-px bg-beige" />
        <p className="text-[0.92em] text-muted">Your Shape</p>
        <p className="text-[1.25em] font-medium text-charcoal">Hourglass</p>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section
      id="home"
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-[linear-gradient(100deg,#f6f1eb_0%,#f2eae2_55%,#ede4db_100%)] pt-32 sm:pt-36 lg:pt-32"
    >
      <div className="container-x grid items-center gap-14 lg:grid-cols-12 lg:gap-8">
        {/* Copy */}
        <div className="lg:col-span-6 lg:self-center lg:pb-16">
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

        {/* Visual: the portrait composition, with readable detail cards laid over it */}
        <div className="relative -mx-5 sm:mx-0 lg:col-span-6 lg:-mr-12 lg:self-end xl:-mr-24">
          {/* Phones: narrower crop with one card */}
          <div className="relative mx-auto max-w-[30rem] md:hidden">
            <Image
              src={heroNarrow}
              alt="An elegant woman in an embroidered ivory outfit, seated in soft natural light"
              sizes="(min-width: 480px) 30rem, 100vw"
              placeholder="blur"
              preload
              className="h-auto w-full"
              style={fade}
            />
            <Reveal delay={0.2} className="absolute right-4 bottom-[7%] w-[56%] max-w-[15rem]">
              <BodyCard className="p-3.5 text-sm" />
            </Reveal>
          </div>

          {/* Tablet and desktop: full composition. Sizes use container units so cards scale with the image. */}
          <div className="relative hidden [container-type:inline-size] md:block">
            <Image
              src={heroWide}
              alt="An elegant woman in an embroidered ivory outfit, seated in soft natural light"
              sizes="(min-width: 1280px) 44rem, (min-width: 1024px) 55vw, 100vw"
              placeholder="blur"
              preload
              className="h-auto w-full"
              style={fade}
            />
            <div aria-hidden className="pointer-events-none text-[1.9cqw] leading-snug whitespace-nowrap">
              <Reveal delay={0.2} className="absolute top-[12.5cqw] left-[63cqw] w-[35cqw]">
                <BodyCard className="min-h-[19.1cqw] p-[1.9cqw]" />
              </Reveal>

              <Reveal delay={0.35} className="absolute top-[37.2cqw] left-[59.9cqw] w-[38cqw]">
                <div className={`${card} min-h-[19.2cqw] rounded-[1.6cqw] p-[1.9cqw]`}>
                  <p className="text-[1.05em] font-medium text-charcoal">Curated For You</p>
                  <div className="mt-[1.3cqw] flex items-center gap-[0.9cqw]">
                    {looks.map((l) => (
                      <Photo
                        key={l.name}
                        name={l.name}
                        alt=""
                        className="aspect-[4/5] flex-1 rounded-[0.8cqw]"
                        sizes="120px"
                        fallback={<div className="h-full w-full" style={{ background: l.tone }} />}
                      />
                    ))}
                    <CircleArrowRight strokeWidth={1.25} className="ml-[0.4cqw] h-[2.8cqw] w-[2.8cqw] shrink-0 text-chocolate" />
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.5} className="absolute top-[58.6cqw] left-[63cqw] w-[35cqw]">
                <ul className={`${card} flex min-h-[16.8cqw] flex-col justify-center gap-[1.2cqw] rounded-[1.6cqw] p-[1.9cqw] text-charcoal`}>
                  {["Flatter Your Proportions", "Style Recommendations", "Complete Outfit Guidance"].map((t) => (
                    <li key={t} className="flex items-center gap-[1cqw]">
                      <CircleCheck strokeWidth={1.5} className="h-[2cqw] w-[2cqw] shrink-0 text-chocolate" /> {t}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
