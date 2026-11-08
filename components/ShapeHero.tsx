"use client";

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import drape from "@/public/images/hero-drape.webp";
import flowers from "@/public/images/hero-flowers.webp";
import woman from "@/public/images/hero-woman.webp";
import HeroFeatures from "./HeroFeatures";
import { BOOK_HREF } from "@/lib/site";
import { GUESS_KEY, SHAPE_DISCOUNT_PERCENT, bodyPath, shapes, type BodyShape } from "@/lib/shapes";

const MAROON = "#6b0117";
const GOLD = "#daa764";

// The ring: 15 panels in each shape's colour, repeating the five shapes round the ring. All sizes are
// in container units (cqw) of the stage, so the whole figure scales together.
const PANELS = 15;
const STEP = 360 / PANELS;
const RADIUS = 48;
const TILT = 15;
const PERSPECTIVE = 240;
const RING_Y = 50; // ring centre from the top of the stage
const PANEL = { w: 19.6, h: 27 };
const START = shapes.findIndex((s) => s.id === "rectangle"); // the shape shown first
const SPIN_MS = 2600;

const mod = (n: number, m: number) => ((n % m) + m) % m;
const shapeOf = (panel: number) => shapes[panel % shapes.length];

// One of the ring's panels for this shape, picked at random so the ring stops in a different place each time.
function panelFor(shapeIndex: number) {
  const options = Array.from({ length: PANELS }, (_, i) => i).filter((i) => i % shapes.length === shapeIndex);
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
  const index = shapes.indexOf(shape);
  return (
    <div
      className="relative z-10 mx-auto w-[max(17.5rem,46cqw)] overflow-hidden rounded-[max(1.1rem,3cqw)] border-[max(2px,0.45cqw)] text-[#fbf3e8] shadow-[0_2cqw_5cqw_-1cqw_rgba(70,20,10,0.35)] transition-colors duration-700"
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
                Shape {String(index + 1).padStart(2, "0")} / {String(shapes.length).padStart(2, "0")}
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
  const [guess, setGuess] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const shape = shapeOf(front);

  // Picking a shape locks in the guess and spins the ring until one of that shape's panels faces front.
  function pick(id: string) {
    if (spinning) return;
    setGuess(id);
    try {
      localStorage.setItem(GUESS_KEY, id);
    } catch {
      // storage blocked: the guess just isn't remembered
    }
    const s = shapes.findIndex((x) => x.id === id);
    if (s === front % shapes.length) return;
    const target = panelFor(s);
    const next = rotation - mod(rotation - target * STEP, 360) - 360 * 2;
    setRotation(next);
    if (reduce) {
      setFront(target);
      return;
    }
    setSpinning(true);
    timer.current = window.setTimeout(() => {
      setFront(target);
      setSpinning(false);
    }, SPIN_MS - 200);
  }

  const picked = shapes.find((s) => s.id === guess);

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="home"
        aria-labelledby="hero-title"
        className="relative overflow-hidden bg-[#fdf0e9] bg-[radial-gradient(60%_55%_at_72%_38%,#fff8f1_0%,transparent_70%),linear-gradient(115deg,#fdf1ea_0%,#fdf0e9_40%,#fbeae2_100%)]"
      >
        {/* Decorations from the artwork: bougainvillea top right, red silk bottom left */}
        <Image src={flowers} alt="" aria-hidden sizes="16rem" className="pointer-events-none absolute top-0 right-0 w-[min(34vw,15.5rem)]" />
        <Image src={drape} alt="" aria-hidden sizes="60vw" className="pointer-events-none absolute bottom-0 left-0 hidden w-[min(58vw,62rem)] lg:block" />

        <div className="container-x relative grid items-center gap-12 pt-32 pb-14 sm:pt-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10 lg:pt-28 lg:pb-12">
          {/* Copy */}
          <div className="min-w-0 lg:pb-6">
            <p className="flex items-center gap-4 text-[0.78rem] font-bold tracking-[0.28em] uppercase sm:whitespace-nowrap sm:text-[0.95rem] lg:text-[0.8rem] xl:text-[0.95rem]" style={{ color: "#771526" }}>
              Personal Fashion Consulting
              <span aria-hidden className="hidden h-px w-20 min-w-0 shrink sm:block sm:w-28" style={{ background: "#89595e" }} />
            </p>
            <h1 id="hero-title" className="mt-7 font-serif text-[2.9rem] leading-[1.06] font-medium text-[#1f1a18] sm:text-6xl lg:text-[3.7rem] xl:text-[4.5rem]">
              Style is personal.
              <span className="block italic" style={{ color: MAROON }}>
                Let us make it yours.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg text-[#2e2826] sm:text-xl xl:text-[1.32rem]">
              Discover your proportions, understand your style, and find the looks that celebrate you. Personalised fashion guidance
              designed around you.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href={BOOK_HREF}
                className="inline-flex min-h-[3.75rem] items-center justify-center gap-3 px-7 text-[1.15rem] font-semibold whitespace-nowrap text-[#fdf0e9] transition-colors hover:brightness-125"
                style={{ background: MAROON }}
              >
                Book Your Consultation <ArrowRight size={20} strokeWidth={1.75} aria-hidden />
              </Link>
              <Link
                href="/#services"
                className="inline-flex min-h-[3.75rem] items-center justify-center border-[1.5px] px-7 text-[1.15rem] font-semibold whitespace-nowrap transition-colors hover:bg-[#6b0117]/5"
                style={{ borderColor: MAROON, color: MAROON }}
              >
                Explore Our Services
              </Link>
            </div>
            <HeroFeatures iconClassName="h-11 w-11 text-[#6b0117]" labelClassName="text-base font-semibold sm:text-[1.15rem]" />
          </div>

          {/* The figure in its ring of shape panels, the card in front, and the guess buttons */}
          <div className="mx-auto w-full max-w-[38rem] min-w-0 lg:max-w-none">
            <div className="[container-type:inline-size]">
              <div className="relative">
                {/* Golden arch */}
                <div
                  aria-hidden
                  className="absolute top-[0.3cqw] left-1/2 h-[77cqw] w-[77cqw] -translate-x-1/2 rounded-full border-[0.22cqw] bg-[radial-gradient(circle_at_50%_40%,#fffaf2_0%,#fdf2e6_55%,rgba(253,240,233,0)_75%)]"
                  style={{
                    borderColor: GOLD,
                    maskImage: "linear-gradient(to bottom, #000 40%, transparent 62%)",
                    WebkitMaskImage: "linear-gradient(to bottom, #000 40%, transparent 62%)",
                  }}
                />

                {/* Figure and ring share one 3D space, so back panels pass behind her and front ones in front */}
                <div className="absolute inset-x-0 top-0 h-[80cqw]" style={{ perspective: `${PERSPECTIVE}cqw`, perspectiveOrigin: `50% ${RING_Y}cqw` }}>
                  <div className="absolute inset-0 [transform-style:preserve-3d]">
                    <Image
                      src={woman}
                      alt="A woman in an ivory saree with her hair in a bun, inside a ring of colour panels, one for each body shape"
                      sizes="(min-width: 1024px) 15rem, 36vw"
                      preload
                      className="absolute top-[2.5cqw] left-[34.2cqw] h-auto w-[35.6cqw]"
                    />
                    <div
                      aria-hidden
                      className="absolute left-1/2 [transform-style:preserve-3d]"
                      style={{
                        top: `${RING_Y}cqw`,
                        transform: `rotateX(${-TILT}deg) rotateY(${rotation}deg)`,
                        transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.2, 0.7, 0.12, 1)` : "none",
                      }}
                    >
                      {Array.from({ length: PANELS }, (_, i) => (
                        <div
                          key={i}
                          className="absolute rounded-[0.7cqw] border-[0.32cqw]"
                          style={{
                            width: `${PANEL.w}cqw`,
                            height: `${PANEL.h}cqw`,
                            left: `${-PANEL.w / 2}cqw`,
                            top: `${-PANEL.h / 2}cqw`,
                            transform: `rotateY(${-i * STEP}deg) translateZ(${RADIUS}cqw)`, // warm colours to the left, as in the artwork
                            borderColor: "#e3c27f",
                            backgroundColor: shapeOf(i).panel,
                            backgroundImage:
                              "linear-gradient(90deg, rgba(0,0,0,0.22) 0%, rgba(255,255,255,0.14) 28%, rgba(255,255,255,0.05) 62%, rgba(0,0,0,0.2) 100%), linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0.12) 100%)",
                            boxShadow: "0 1cqw 2cqw rgba(110,45,30,0.18)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-[39cqw]">
                  <ShapeCard shape={shape} />
                </div>
              </div>
            </div>

            {/* Guess your shape */}
            <div className="relative mt-9">
              <p className="flex items-center gap-4 font-serif text-[1.7rem] leading-tight text-[#1f1a18] sm:text-[2rem] lg:text-[1.8rem] xl:text-[2.15rem]">
                <span aria-hidden className="h-px min-w-6 flex-1" style={{ background: "#8a4a52" }} />
                <span className="text-center sm:whitespace-nowrap lg:whitespace-normal xl:whitespace-nowrap">
                  Guess your{" "}
                  <span className="italic" style={{ color: MAROON }}>
                    Body shape
                  </span>{" "}
                  and{" "}
                  <span className="whitespace-nowrap italic" style={{ color: MAROON }}>
                    get {SHAPE_DISCOUNT_PERCENT}% off
                  </span>
                </span>
                <span aria-hidden className="h-px min-w-6 flex-1" style={{ background: "#8a4a52" }} />
              </p>
              <ul className="mt-6 flex flex-wrap justify-center gap-3" aria-label="Guess your body shape">
                {shapes.map((s) => {
                  const on = s.id === shape.id;
                  return (
                    <li key={s.id} className="w-[calc((100%-1.5rem)/3)] sm:w-[calc((100%-3rem)/5)]">
                      <button
                        type="button"
                        onClick={() => pick(s.id)}
                        disabled={spinning}
                        aria-pressed={guess === s.id}
                        className={`flex h-full min-h-[6.2rem] w-full flex-col items-center justify-center gap-2 rounded-2xl border px-1.5 py-3 text-center text-[1rem] leading-tight font-medium lg:text-[0.88rem] xl:text-[1.05rem] transition-colors disabled:cursor-wait ${
                          on ? "border-[#c9867f] bg-[#f8dbcc] font-semibold" : "border-[#f0d6cc] bg-[#fdf6f2]/80 text-charcoal hover:border-[#c9867f]"
                        }`}
                        style={on ? { color: MAROON } : undefined}
                      >
                        <ShapeIcon id={s.id} className="h-10 w-10 text-[#6b0117]" />
                        {s.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div aria-live="polite" className="mt-4 min-h-7 text-center text-base text-charcoal">
                {picked && !spinning && (
                  <p>
                    Locked in:{" "}
                    <span className="font-serif text-lg italic" style={{ color: MAROON }}>
                      {picked.name}
                    </span>
                    .{" "}
                    <Link href="/body-shape" className="font-medium underline underline-offset-4" style={{ color: MAROON }}>
                      Find out with a photo
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
