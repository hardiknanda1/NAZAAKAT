"use client";

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, RotateCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import drape from "@/public/images/hero-drape.webp";
import flowers from "@/public/images/hero-flowers.webp";
import woman from "@/public/images/hero-woman.webp";
import HeroFeatures from "./HeroFeatures";
import { BOOK_HREF } from "@/lib/site";
import { GUESS_KEY, SHAPE_DISCOUNT_PERCENT, bodyPath, shapes, type BodyShape } from "@/lib/shapes";

const ACCENT = "#49372e"; // the site-wide chocolate (--color-chocolate)
const GOLD = "#daa764";

// The ring: 15 panels in each shape's colour, repeating the five shapes round the ring. All sizes are
// in container units (cqw) of the stage, so the whole figure scales together.
const PANELS = 15;
const STEP = 360 / PANELS;
const RADIUS = 51;
const TILT = 15;
const PERSPECTIVE = 240;
const RING_Y = 50; // ring centre from the top of the stage
const PANEL = { w: 20.4, h: 24, rim: 0.55 };
const START = shapes.findIndex((s) => s.id === "rectangle"); // the shape shown first
const SPIN_MS = 3000; // one smooth, graceful turn
const TUCK_MS = 450; // the card shrinks back into the ring before it turns

const mod = (n: number, m: number) => ((n % m) + m) % m;

// Velvet colours round the ring, as in the artwork: maroon and coral on the left, gold, olive and teal on
// the right, peach and beige towards the front and back. Index 0 faces front when the page loads.
const RING_COLOURS = [
  "#eba083", "#d4a03e", "#a39150", "#2c6a50", "#1a5a5b", "#7a8f62", "#d29a3c", "#eab98a",
  "#efa486", "#dc6c5d", "#b02f3c", "#7a1020", "#951c2c", "#d25f53", "#e5806e",
];
const shapeOf = (panel: number) => shapes[panel % shapes.length];

// The guess goes with the visitor to the analyser page, which picks it up from here.
function saveGuess(id: string) {
  try {
    localStorage.setItem(GUESS_KEY, id);
  } catch {
    // storage blocked: they choose again on the analyser page
  }
}

// A panel of a different shape than the one in front, picked at random, so every spin lands somewhere new.
function randomPanel(current: number) {
  const options = Array.from({ length: PANELS }, (_, i) => i).filter((i) => i % shapes.length !== current % shapes.length);
  return options[Math.floor(Math.random() * options.length)];
}


function ShapeIcon({ id, className = "" }: { id: string; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {id === "inverted-triangle" && <path d="M4 5h16l-8 14Z" {...common} />}
      {id === "rectangle" && <rect x="6.5" y="4" width="11" height="16" {...common} />}
      {id === "hourglass" && <path d="M6 4h12l-6 8 6 8H6l6-8Z" {...common} />}
      {id === "pear" && <path d="M12 5l8 14H4Z" {...common} />}
      {id === "apple" && <circle cx="12" cy="12" r="8" {...common} />}
    </svg>
  );
}

function MiniFigure({ shape }: { shape: BodyShape }) {
  return (
    <svg viewBox="40 50 120 260" className="h-[max(3.6rem,10cqw)] w-[max(1.7rem,4.8cqw)] shrink-0" style={{ color: GOLD }} aria-hidden>
      <path d={bodyPath(shape.figure)} fill="none" stroke="currentColor" strokeWidth={4} strokeLinejoin="round" />
    </svg>
  );
}

// The card in front of the figure: the shape whose panel faces front.
function ShapeCard({ shape }: { shape: BodyShape }) {
  return (
    <div
      className="relative z-10 mx-auto w-[max(17.5rem,46cqw)] overflow-hidden rounded-[max(1.1rem,3cqw)] border-[max(2px,0.45cqw)] text-[#fbf3e8] shadow-[0_0_2.6cqw_0.3cqw_rgba(236,168,82,0.5),0_2cqw_5cqw_-1cqw_rgba(70,20,10,0.35)] transition-colors duration-700"
      style={{ borderColor: GOLD, backgroundColor: shape.tone.to }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(170deg, transparent 0%, ${shape.tone.from} 85%)` }} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={shape.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="relative px-[max(1.1rem,3.6cqw)] pt-[max(1rem,3.2cqw)] pb-[max(1.1rem,3.4cqw)]"
          aria-live="polite"
        >
          <div className="flex items-start gap-[max(0.8rem,2.4cqw)]">
            <MiniFigure shape={shape} />
            <div className="min-w-0 border-l pl-[max(0.8rem,2.4cqw)]" style={{ borderColor: `${GOLD}99` }}>
              <p className="text-[max(0.68rem,1.9cqw)] font-bold tracking-[0.18em] uppercase" style={{ color: "#e8c88f" }}>
                Body shape
              </p>
              <h2 className="mt-[0.3em] font-serif text-[max(1.65rem,5.6cqw)] leading-none font-medium italic">{shape.name}</h2>
              <p className="mt-[0.5em] text-[max(0.76rem,2.1cqw)] leading-snug opacity-95">{shape.description}</p>
            </div>
          </div>
          <div className="my-[max(0.8rem,2.4cqw)] h-px" style={{ background: `${GOLD}66` }} />
          <p className="text-[max(0.68rem,1.9cqw)] font-bold tracking-[0.24em] uppercase" style={{ color: "#e8c88f" }}>
            What flatters you
          </p>
          <ul className="mt-[max(0.55rem,1.6cqw)] space-y-[max(0.4rem,1.2cqw)] text-[max(0.82rem,2.45cqw)] leading-snug">
            {shape.flatters.slice(0, 3).map((item) => (
              <li key={item} className="flex gap-[0.7em]">
                <span className="mt-[0.4em] h-[0.5em] w-[0.5em] shrink-0 rotate-45" style={{ background: "#ecd3a0" }} aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function ShapeHero() {
  const reduce = useReducedMotion();
  const [front, setFront] = useState(START); // panel facing front, whose card is showing
  const [rotation, setRotation] = useState(START * STEP);
  const [spinning, setSpinning] = useState(false);
  const [cardOpen, setCardOpen] = useState(true);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const shape = shapeOf(front);

  // The card tucks back into the ring, the ring makes one slow turn to another shape, and that
  // shape's card rises out of it.
  function spin() {
    if (spinning) return;
    const target = randomPanel(front);
    const next = rotation - mod(rotation - target * STEP, 360) - 360;
    if (reduce) {
      setRotation(next);
      setFront(target);
      return;
    }
    setSpinning(true);
    setCardOpen(false);
    timers.current.push(window.setTimeout(() => setRotation(next), TUCK_MS));
    timers.current.push(
      window.setTimeout(() => {
        setFront(target);
        setCardOpen(true);
        setSpinning(false);
      }, TUCK_MS + SPIN_MS),
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="home"
        aria-labelledby="hero-title"
        className="relative overflow-hidden bg-[#fdf0e9] bg-[radial-gradient(60%_55%_at_72%_38%,#fff8f1_0%,transparent_70%),linear-gradient(115deg,#fdf1ea_0%,#fdf0e9_40%,#fbeae2_100%)]"
      >
        {/* Decorations from the artwork: bougainvillea top right, red silk bottom left */}
        <Image src={flowers} alt="" aria-hidden sizes="22rem" className="pointer-events-none absolute top-0 right-0 w-[min(46vw,21rem)]" />
        <Image
          src={drape}
          alt=""
          aria-hidden
          sizes="80vw"
          className="pointer-events-none absolute bottom-0 left-0 hidden w-[min(80vw,82rem)] lg:block"
          style={{ maskImage: "linear-gradient(to right, #000 55%, transparent 96%)", WebkitMaskImage: "linear-gradient(to right, #000 55%, transparent 96%)" }}
        />
        {/* Soft hand-over into the next section instead of a hard edge */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-[#f1ebe3]" />

        <div className="container-x relative grid items-center gap-12 pt-32 pb-14 sm:pt-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10 lg:pt-28 lg:pb-12">
          {/* Copy */}
          <div className="min-w-0 lg:pb-6">
            <p className="flex items-center gap-4 text-[0.78rem] font-bold tracking-[0.28em] uppercase sm:whitespace-nowrap sm:text-[0.95rem] lg:text-[0.8rem] xl:text-[0.95rem]" style={{ color: ACCENT }}>
              Personal Fashion Consulting
              <span aria-hidden className="hidden h-px w-20 min-w-0 shrink sm:block sm:w-28" style={{ background: "#b7a493" }} />
            </p>
            <h1 id="hero-title" className="mt-7 font-serif lg:[@media(max-height:780px)]:mt-5 text-[2.9rem] leading-[1.06] font-medium text-[#1f1a18] sm:text-6xl lg:text-[3.7rem] xl:text-[4.5rem] lg:[@media(max-height:780px)]:text-[3.3rem]">
              Style is personal.
              <span className="block italic" style={{ color: ACCENT }}>
                Let us make it yours.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg text-[#2e2826] sm:text-xl xl:text-[1.32rem] lg:[@media(max-height:780px)]:mt-5 lg:[@media(max-height:780px)]:text-lg">
              Discover your proportions, understand your style, and find the looks that celebrate you. Personalised fashion guidance
              designed around you.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row lg:[@media(max-height:780px)]:mt-7">
              <Link
                href={BOOK_HREF}
                className="inline-flex min-h-[3.75rem] items-center justify-center gap-3 bg-chocolate px-7 text-[1.15rem] font-semibold whitespace-nowrap text-ivory transition-colors hover:bg-charcoal"
              >
                Book Your Consultation <ArrowRight size={20} strokeWidth={1.75} aria-hidden />
              </Link>
              <Link
                href="/#services"
                className="inline-flex min-h-[3.75rem] items-center justify-center border-[1.5px] px-7 text-[1.15rem] font-semibold whitespace-nowrap transition-colors hover:bg-chocolate/5"
                style={{ borderColor: ACCENT, color: ACCENT }}
              >
                Explore Our Services
              </Link>
            </div>
            <HeroFeatures className="mt-14 lg:mt-12 lg:[@media(max-height:780px)]:mt-8" iconClassName="h-11 w-11 text-chocolate" labelClassName="text-base font-semibold sm:text-[1.15rem]" />
          </div>

          {/* The figure in its ring of shape panels, the card in front, and the guess buttons */}
          <div className="mx-auto w-full max-w-[38rem] min-w-0 lg:max-w-none">
            <div className="mx-auto [container-type:inline-size] lg:w-[min(100%,calc((100svh-28rem)*1.19))]">
              <div className="relative">
                {/* Golden arch: a warm, glowing disc with a gold rim that melts into the background below */}
                <div
                  aria-hidden
                  className="absolute top-[0.3cqw] left-1/2 h-[77cqw] w-[77cqw] -translate-x-1/2 rounded-full border-[0.3cqw]"
                  style={{
                    borderColor: "#e8a95b",
                    background: "radial-gradient(circle at 50% 28%, #fff6ea 0%, #fadfc2 34%, #f2c49b 58%, #eaa97a 80%, #e39a6c 100%)",
                    boxShadow: "0 0 3cqw 0.6cqw rgba(232, 155, 80, 0.5), inset 0 0 3cqw rgba(255, 240, 220, 0.6)",
                    maskImage: "linear-gradient(to bottom, #000 42%, rgba(0,0,0,0.6) 52%, transparent 66%)",
                    WebkitMaskImage: "linear-gradient(to bottom, #000 42%, rgba(0,0,0,0.6) 52%, transparent 66%)",
                  }}
                />
                {/* Warm golden haze under the ring, as if it is lit from within */}
                <div
                  aria-hidden
                  className="absolute left-1/2 h-[22cqw] w-[118cqw] -translate-x-1/2 rounded-[50%] blur-[2.5cqw]"
                  style={{ top: `${RING_Y + 14}cqw`, background: "radial-gradient(ellipse at center, rgba(236,165,90,0.55) 0%, rgba(236,165,90,0.22) 45%, transparent 72%)" }}
                />

                {/* Figure and ring share one 3D space, so back panels pass behind her and front ones in front */}
                <div className="absolute inset-x-0 top-0 h-[80cqw]" style={{ perspective: `${PERSPECTIVE}cqw`, perspectiveOrigin: `50% ${RING_Y}cqw` }}>
                  <div className="absolute inset-0 [transform-style:preserve-3d]">
                    <Image
                      src={woman}
                      alt="A woman in an ivory saree with her hair in a bun, inside a ring of colour panels, one for each body shape"
                      sizes="(min-width: 1024px) 24rem, 63vw"
                      preload
                      className="absolute top-[4.2cqw] left-[17.75cqw] h-auto w-[63cqw]"
                    />
                    <div
                      aria-hidden
                      className="absolute left-1/2 [transform-style:preserve-3d]"
                      style={{
                        top: `${RING_Y}cqw`,
                        transform: `rotateX(${-TILT}deg) rotateY(${rotation}deg)`,
                        transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.45, 0.05, 0.2, 1)` : "none",
                      }}
                    >
                      {Array.from({ length: PANELS }, (_, i) => (
                        <div
                          key={i}
                          className="absolute rounded-[1.1cqw]"
                          style={{
                            width: `${PANEL.w}cqw`,
                            height: `${PANEL.h}cqw`,
                            left: `${-PANEL.w / 2}cqw`,
                            top: `${-PANEL.h / 2}cqw`,
                            padding: `${PANEL.rim}cqw`,
                            transform: `rotateY(${-i * STEP}deg) translateZ(${RADIUS}cqw)`, // warm colours to the left, as in the artwork
                            // Polished gold rim, as on the supplied panel
                            background: "linear-gradient(165deg, #fbe39d 0%, #d9a93f 22%, #f5d27a 48%, #b8862b 74%, #f0cd78 100%)",
                            boxShadow: "0 0 1.3cqw rgba(236, 168, 82, 0.5), 0 1.2cqw 2.4cqw rgba(110,45,30,0.2)", // golden glow round the rim
                          }}
                        >
                          <div
                            className="h-full w-full rounded-[0.7cqw]"
                            style={{
                              backgroundColor: RING_COLOURS[mod(START - i, PANELS)],
                              // The supplied velvet damask, tinted to the panel's colour and shaded like a curved surface
                              backgroundImage: "linear-gradient(90deg, rgba(0,0,0,0.3) 0%, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.03) 60%, rgba(0,0,0,0.28) 100%), url(/images/velvet.webp)",
                              backgroundBlendMode: "normal, multiply",
                              backgroundSize: "100% 100%, auto 100%",
                              backgroundPosition: `0 0, ${(i * 37) % 100}% 50%`,
                              boxShadow: "inset 0 0 1.2cqw rgba(0,0,0,0.35)",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-[39cqw]">
                <motion.div
                  className="relative z-10"
                  style={{ transformOrigin: "50% 35%" }}
                  initial={false}
                  animate={cardOpen ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.3, opacity: 0, y: -24 }}
                  transition={cardOpen ? { type: "spring", stiffness: 210, damping: 17 } : { duration: TUCK_MS / 1000, ease: [0.55, 0, 0.75, 0.3] }}
                >
                  <ShapeCard shape={shape} />
                </motion.div>
                </div>
                <div className="relative z-10 mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={spin}
                    disabled={spinning}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border bg-ivory px-4 text-sm font-semibold tracking-wide shadow-[0_6px_18px_-10px_rgba(73,55,46,0.45)] transition-colors hover:bg-beige disabled:opacity-70"
                    style={{ borderColor: GOLD, color: ACCENT }}
                  >
                    <RotateCw size={15} strokeWidth={2} className={spinning ? "animate-spin" : ""} aria-hidden />
                    {spinning ? "Exploring…" : "Explore"}
                  </button>
                </div>
              </div>
            </div>

            {/* Guess your shape */}
            <div className="relative mt-6">
              <p className="flex items-center gap-4 font-serif text-[1.7rem] leading-tight text-[#1f1a18] sm:text-[2rem] lg:text-[1.8rem] xl:text-[2.15rem]">
                <span aria-hidden className="h-px min-w-6 flex-1" style={{ background: "#b7a493" }} />
                <span className="text-center sm:whitespace-nowrap lg:whitespace-normal xl:whitespace-nowrap">
                  Guess your{" "}
                  <span className="italic" style={{ color: ACCENT }}>
                    Body shape right
                  </span>{" "}
                  and{" "}
                  <span className="whitespace-nowrap italic" style={{ color: ACCENT }}>
                    get {SHAPE_DISCOUNT_PERCENT}% off
                  </span>
                </span>
                <span aria-hidden className="h-px min-w-6 flex-1" style={{ background: "#b7a493" }} />
              </p>
              <ul className="mt-6 flex flex-wrap justify-center gap-3" aria-label="Guess your body shape">
                {shapes.map((s) => {
                  const on = s.id === shape.id;
                  return (
                    <li key={s.id} className="w-[calc((100%-1.5rem)/3)] sm:w-[calc((100%-3rem)/5)]">
                      <Link
                        href="/body-shape"
                        onClick={() => saveGuess(s.id)}
                        className={`flex h-full min-h-[6.2rem] w-full flex-col items-center justify-center gap-2 rounded-2xl border px-1.5 py-3 text-center text-[1rem] leading-tight font-medium transition-colors lg:text-[0.88rem] xl:text-[1.05rem] ${
                          on ? "border-chocolate/50 bg-beige font-semibold" : "border-taupe/50 bg-ivory/80 text-charcoal hover:border-chocolate/50"
                        }`}
                        style={on ? { color: ACCENT } : undefined}
                      >
                        <ShapeIcon id={s.id} className="h-10 w-10 text-chocolate" />
                        {s.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-center text-base text-muted">Pick your guess, then add a photo to find out.</p>
            </div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
