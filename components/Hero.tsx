import { ArrowRight, CircleArrowRight, CircleCheck, CircleChevronRight, Layers } from "lucide-react";
import Image from "next/image";
import heroMobile from "@/public/images/hero-mobile.webp";
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

// Dotted front-view female figure for the "Body Analysis" card.
// One half is drawn and mirrored so the figure stays symmetrical.
const figureHalf =
  "M30 19.5c1.4 0 2.6-.2 2.6-.2V23c2.6 1 6.4 1.8 8.6 3.4 2 1.4 2.6 3.6 2.9 6.6l1.4 17.5c.4 5.2 1.3 10.6 1.9 15.4.4 3 .3 5.6-1 6.8-.8.7-1.8.2-2-1L43 52.2c-.4-3.4-1.2-7.2-2-10.2" +
  "c.4 4.6-.4 9-2.6 13.2-1 1.9-.8 4 .6 6.4 2.6 4.4 3.2 10.4 2.2 17-1 6.4-2.6 12-3.2 18.4-.5 5.6-.2 11 .2 16.6.3 3.6-.4 6.8-2.4 7.2-1.6.3-2.6-.4-2.7-1.6" +
  "-.4-5.4-.4-11-.6-16.4-.2-6-.9-12.4-1.4-18.6L30 79";

function Silhouette({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 140" className={`shrink-0 text-chocolate/70 ${className}`} fill="none" aria-hidden>
      <g stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.1 1.9">
        <ellipse cx="30" cy="11" rx="6" ry="7.6" />
        <path d={figureHalf} />
        <path d={figureHalf} transform="translate(60 0) scale(-1 1)" />
      </g>
    </svg>
  );
}

const features = [
  { label: "Body Analysis", Icon: DressFormIcon },
  { label: "Personalised Looks", Icon: HangerIcon },
  { label: "Wardrobe Planning", Icon: Layers },
];

const looks = [
  { name: "look-1", alt: "Burgundy embroidered tunic set" },
  { name: "look-2", alt: "Ivory belted kurta" },
  { name: "look-3", alt: "Emerald belted dress" },
];

const card = "border border-white/80 bg-[#f8f4ef] shadow-[0_12px_40px_-14px_rgba(73,55,46,0.22)]";

// Softens the photograph into the section background: left/top edges and a long fade at the bottom.
function fade(right: boolean): React.CSSProperties {
  const x = `linear-gradient(to right, transparent, #000 9%${right ? ", #000 93%, transparent" : ""})`;
  const y = "linear-gradient(to bottom, transparent, #000 5%, #000 91%, transparent)";
  return {
    maskImage: `${x}, ${y}`,
    WebkitMaskImage: `${x}, ${y}`,
    maskComposite: "intersect",
    WebkitMaskComposite: "source-in",
  };
}

const mobileFade: React.CSSProperties = {
  maskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent), linear-gradient(to bottom, transparent, #000 4%, #000 72%, transparent 98%)",
  WebkitMaskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent), linear-gradient(to bottom, transparent, #000 4%, #000 72%, transparent 98%)",
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
};

function BodyCard({ className = "" }: { className?: string }) {
  return (
    <div className={`${card} flex items-center gap-[0.9em] rounded-2xl ${className}`}>
      <Silhouette className="h-[6.6em] w-[2.9em]" />
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

const alt = "An elegant woman in an embroidered ivory outfit and lace dupatta, seated in soft natural light";

export default function Hero() {
  return (
    <section
      id="home"
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-[linear-gradient(to_bottom,transparent_60%,#f1ebe3),linear-gradient(100deg,#f6f1eb_0%,#f2eae2_55%,#ede4db_100%)] lg:flex lg:min-h-[max(100svh,calc(var(--hero-w)*0.805+6rem))] lg:items-center lg:[--hero-w:min(50vw,calc((100svh-6rem)/0.805))] xl:[--hero-w:min(58vw,calc((100svh-6rem)/0.805),68rem)]"
    >
      <div className="container-x relative z-10 pt-[4.5rem] sm:pt-36 lg:pt-28 lg:pb-16">
        {/* Copy */}
        <div className="lg:max-w-[44vw] xl:max-w-[min(42vw,40rem)]">
          <p className="eyebrow">Personal Fashion Consulting</p>
          <h1
            id="hero-title"
            className="mt-3 font-serif text-[2.55rem] leading-[1.05] min-[400px]:text-[2.75rem] sm:mt-6 font-medium text-charcoal sm:text-6xl lg:text-[4.1rem] xl:text-[4.6rem]"
          >
            Style is personal.
            <span className="mt-1 block text-chocolate italic">Let us make it yours.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[0.94rem] leading-normal text-muted min-[400px]:text-base sm:mt-8 sm:text-xl sm:leading-[1.7]">
            Discover your proportions, understand your style, and find the looks that celebrate you. Personalised
            fashion guidance designed around <strong className="font-medium text-charcoal">you</strong>.
          </p>
          <div className="mt-5 flex flex-col gap-2.5 sm:mt-10 sm:flex-row sm:gap-4">
            <a href="/start" className="btn-primary rounded-lg text-lg max-sm:min-h-11 max-sm:text-base md:rounded-none">
              Start Your Consultation <ArrowRight size={20} strokeWidth={1.5} aria-hidden />
            </a>
            <a href="#services" className="btn-secondary rounded-lg text-lg max-sm:min-h-11 max-sm:text-base md:rounded-none">
              Explore Our Services
            </a>
          </div>

          <ul className="mt-14 hidden max-w-xl grid-cols-3 divide-x divide-taupe/50 md:grid">
            {features.map(({ label, Icon }) => (
              <li key={label} className="flex flex-col items-center gap-3 px-2 text-center">
                <Icon className="h-9 w-9 text-chocolate" aria-hidden />
                <span className="text-[0.95rem] leading-snug font-medium text-charcoal sm:text-base">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Phones: full arch photo, three cards overlapping its lower edge, then the feature row */}
      <div className="md:hidden">
        <div className="relative mx-auto mt-3 w-[90%] max-w-[29rem]">
          <Image src={heroMobile} alt={alt} sizes="(min-width: 512px) 32rem, 100vw" placeholder="blur" preload className="h-auto w-full" style={mobileFade} />
        </div>
        <div aria-hidden className="relative z-10 mx-auto -mt-[24vw] grid max-w-[32rem] grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)_minmax(0,1.12fr)] gap-1.5 px-2 text-[0.64rem] leading-snug min-[380px]:text-[0.68rem] min-[400px]:text-[0.72rem] min-[440px]:text-[0.8rem]">
          <Reveal delay={0.1} className="h-full">
            <div className={`${card} flex h-full flex-col rounded-xl p-2 min-[380px]:p-2.5`}>
              <p className="flex items-center justify-between gap-1 font-medium text-charcoal min-[360px]:whitespace-nowrap">
                Body Analysis <CircleChevronRight strokeWidth={1.25} className="h-[1.25em] w-[1.25em] shrink-0 text-chocolate" />
              </p>
              <div className="my-2 h-px bg-beige" />
              <p className="text-muted">Your Shape:</p>
              <p className="text-[1.3em] font-medium text-charcoal">Hourglass</p>
            </div>
          </Reveal>
          <Reveal delay={0.2} className="h-full">
            <div className={`${card} flex h-full flex-col rounded-xl p-2 min-[380px]:p-2.5`}>
              <p className="flex items-center justify-between gap-1 font-medium text-charcoal min-[360px]:whitespace-nowrap">
                Curated For You <CircleChevronRight strokeWidth={1.25} className="h-[1.25em] w-[1.25em] shrink-0 text-chocolate" />
              </p>
              <div className="mt-2 flex gap-1">
                {looks.map((l) => (
                  <Photo key={l.name} name={l.name} alt="" className="aspect-[4/5] flex-1 rounded-md" sizes="60px" />
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.3} className="h-full">
            <ul className={`${card} flex h-full flex-col justify-center gap-1.5 rounded-xl p-2 text-charcoal min-[380px]:p-2.5`}>
              {["Flatter Your Proportions", "Style Recommendations", "Complete Outfit Guidance"].map((t) => (
                <li key={t} className="flex items-start gap-1 text-[0.88em] [overflow-wrap:anywhere]">
                  <CircleCheck strokeWidth={1.5} className="mt-px h-[1.1em] w-[1.1em] shrink-0 text-chocolate" /> {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
        <ul className="container-x mt-6 grid grid-cols-3 divide-x divide-taupe/50 pb-10">
          {features.map(({ label, Icon }) => (
            <li key={label} className="flex flex-col items-center gap-2.5 px-1 text-center">
              <Icon className="h-7 w-7 text-chocolate" aria-hidden />
              <span className="text-[0.85rem] leading-snug font-medium text-charcoal">{label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Tablet: in flow. Desktop: bleeds to the right edge of the screen and sits on the section's bottom edge.
          Card sizes use container units so they scale with the photograph and cover the cards drawn into it. */}
      <div className="relative mt-10 hidden [container-type:inline-size] md:block lg:absolute lg:right-0 lg:bottom-0 lg:mt-0 lg:w-[var(--hero-w)]">
        <Image
          src={heroWide}
          alt={alt}
          sizes="(min-width: 1024px) 58vw, 100vw"
          placeholder="blur"
          preload
          className="h-auto w-full"
          style={fade(false)}
        />
        <div aria-hidden className="pointer-events-none text-[1.82cqw] leading-snug whitespace-nowrap">
          <Reveal delay={0.2} className="absolute top-[12cqw] left-[64.5cqw] w-[32cqw]">
            <BodyCard className="min-h-[18.2cqw] p-[1.8cqw]" />
          </Reveal>

          <Reveal delay={0.35} className="absolute top-[35.8cqw] left-[61.5cqw] w-[35cqw]">
            <div className={`${card} min-h-[18.4cqw] rounded-2xl p-[1.8cqw]`}>
              <p className="text-[1.05em] font-medium text-charcoal">Curated For You</p>
              <div className="mt-[1.2cqw] flex items-center gap-[0.8cqw]">
                {looks.map((l) => (
                  <Photo key={l.name} name={l.name} alt={l.alt} className="aspect-[4/5] flex-1 rounded-[0.8cqw]" sizes="140px" />
                ))}
                <CircleArrowRight strokeWidth={1.25} className="ml-[0.4cqw] h-[2.7cqw] w-[2.7cqw] shrink-0 text-chocolate" />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.5} className="absolute top-[56.3cqw] left-[64.5cqw] w-[32cqw]">
            <ul className={`${card} flex min-h-[16.1cqw] flex-col justify-center gap-[1.1cqw] rounded-2xl p-[1.8cqw] text-charcoal`}>
              {["Flatter Your Proportions", "Style Recommendations", "Complete Outfit Guidance"].map((t) => (
                <li key={t} className="flex items-center gap-[0.9cqw]">
                  <CircleCheck strokeWidth={1.5} className="h-[1.9cqw] w-[1.9cqw] shrink-0 text-chocolate" /> {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
