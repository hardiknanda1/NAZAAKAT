"use client";

import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import figure from "@/public/images/hero-figure.webp";
import HeroFeatures from "./HeroFeatures";
import { BOOK_HREF } from "@/lib/site";
import { GUESS_KEY, SHAPE_DISCOUNT_PERCENT, bodyPath, shapes, type BodyShape } from "@/lib/shapes";

// The ring: 15 glowing panels, each standing for one of the five shapes (in order, three times round).
// Proportions follow the original artwork: radius, tilt and perspective are in container units (cqw)
// of the stage, so everything scales together.
const PANELS = 15;
const STEP = 360 / PANELS;
const RADIUS = 41;
const TILT = 10.7;
const PERSPECTIVE = 133;
const FIG = { top: 3, left: 34.5, width: 32.3 }; // figure image placement; its height is 66cqw
const RING_Y = FIG.top + 27.6; // ring centre, measured from the top of the stage
const START = 2; // the hourglass panel faces front first
const SPIN_MS = 3600;
const STEP_MS = 700;
const CARD_MOVE = {
  type: "spring",
  stiffness: 120,
  damping: 20,
  mass: 0.9,
} as const;

const mod = (n: number, m: number) => ((n % m) + m) % m;
const shapeOf = (panel: number) => shapes[panel % shapes.length];
// Hues run round the ring like the artwork's rainbow, with cyan facing front at the start.
const hueOf = (panel: number) => mod(186 - (panel - START) * STEP, 360);

// A random panel whose shape differs from the one showing.
function randomPanel(current: number) {
  const options = Array.from({ length: PANELS }, (_, i) => i).filter((i) => i % shapes.length !== current % shapes.length);
  return options[Math.floor(Math.random() * options.length)];
}

function cardStyle(hue: number) {
  return {
    background: `linear-gradient(145deg, hsl(${hue} 72% 19%) 0%, hsl(${hue} 70% 33%) 100%)`,
    boxShadow: `0 24px 60px -18px hsl(${hue} 90% 50% / 0.55), 0 0 40px -8px hsl(${hue} 90% 55% / 0.5)`,
  };
}

function MiniFigure({ shape }: { shape: BodyShape }) {
  return (
    <svg viewBox="40 50 120 260" className="h-12 w-6 shrink-0 text-[#f8f1e7]/80" aria-hidden>
      <path d={bodyPath(shape.figure)} fill="none" stroke="currentColor" strokeWidth={5} strokeLinejoin="round" />
    </svg>
  );
}

// The front panel, enlarged under the ring, with everything about that shape.
function ShapeCard({ panel, busy, onStep }: { panel: number; busy: boolean; onStep: (dir: 1 | -1) => void }) {
  const shape = shapeOf(panel);
  const index = panel % shapes.length;
  return (
    <motion.div
      layoutId="shape-card"
      transition={CARD_MOVE}
      className="relative overflow-hidden border-[6px] border-[#16100e] text-[#f8f1e7]"
      style={{ ...cardStyle(hueOf(panel)), borderRadius: 12 }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.2)_0%,transparent_34%)]"
      />
      <motion.div
        key={panel}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="relative p-5 sm:p-6"
        aria-live="polite"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <MiniFigure shape={shape} />
            <div>
              <p className="text-xs font-medium tracking-[0.22em] whitespace-nowrap uppercase opacity-80">
                Shape {String(index + 1).padStart(2, "0")} / {String(shapes.length).padStart(2, "0")}
              </p>
              <h2 className="mt-1 font-serif text-[1.9rem] leading-none font-medium">{shape.name}</h2>
            </div>
          </div>
          <div className="-mt-1 -mr-2 flex shrink-0">
            <button
              type="button"
              onClick={() => onStep(-1)}
              disabled={busy}
              aria-label="Previous shape"
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15 disabled:opacity-50"
            >
              <ChevronLeft size={20} strokeWidth={1.5} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onStep(1)}
              disabled={busy}
              aria-label="Next shape"
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15 disabled:opacity-50"
            >
              <ChevronRight size={20} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </div>
        <p className="mt-3 text-base leading-relaxed opacity-90">{shape.description}</p>
        <p className="mt-4 text-xs font-medium tracking-[0.22em] uppercase opacity-80">What flatters you</p>
        <ul className="mt-2 grid gap-x-5 gap-y-1.5 text-[0.95rem] sm:grid-cols-2">
          {shape.flatters.map((item) => (
            <li key={item} className="flex gap-2.5 leading-snug">
              <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rotate-45 bg-[#f1d9a6]" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}

function GuessBand() {
  const [guess, setGuess] = useState<string | null>(null);

  function choose(id: string | null) {
    setGuess(id);
    try {
      if (id) localStorage.setItem(GUESS_KEY, id);
      else localStorage.removeItem(GUESS_KEY);
    } catch {
      // Private mode or storage blocked: the guess just isn't remembered.
    }
  }

  const picked = shapes.find((s) => s.id === guess);

  return (
    <div className="container-x relative z-10 pb-14 lg:pb-16">
      <div className="flex flex-col gap-6 border-t border-taupe/50 pt-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="shrink-0">
          <p className="font-serif text-3xl leading-tight text-charcoal sm:text-4xl">
            Do you know your <span className="text-[#6b1424] italic">body shape?</span>
          </p>
          <p className="mt-1 text-base text-muted">
            Take a guess, then add one photo to find out. Guess right for {SHAPE_DISCOUNT_PERCENT}% off your consultation.
          </p>
        </div>

        <div aria-live="polite" className="min-h-[3.25rem] lg:max-w-xl">
          {picked ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <p className="text-base text-charcoal">
                Locked in: <span className="font-serif text-xl text-chocolate italic">{picked.name}</span>.
              </p>
              <Link href="/body-shape" className="btn-primary shrink-0 rounded-lg">
                Find out with a photo <ArrowRight size={18} strokeWidth={1.5} aria-hidden />
              </Link>
              <button
                type="button"
                onClick={() => choose(null)}
                className="shrink-0 text-base text-muted underline underline-offset-4 hover:text-chocolate"
              >
                Change guess
              </button>
            </div>
          ) : (
            <ul className="flex flex-wrap gap-2.5" aria-label="Guess your body shape">
              {shapes.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => choose(s.id)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-taupe bg-ivory/70 px-4 text-base text-charcoal transition-colors hover:border-chocolate hover:bg-chocolate hover:text-ivory"
                  >
                    <span className="h-2 w-2 rotate-45" style={{ background: s.tone.to }} aria-hidden />
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

type Box = { left: number; top: number; width: number; height: number };

export default function ShapeHero() {
  const reduce = useReducedMotion();
  const [front, setFront] = useState(START); // panel facing front, whose card is showing
  const [rotation, setRotation] = useState(-START * STEP);
  const [duration, setDuration] = useState(0);
  const [revealed, setRevealed] = useState(true); // card out under the ring, or tucked back into its panel
  const [tuck, setTuck] = useState<Box | null>(null);
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);
  const wrap = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const later = (ms: number, fn: () => void) => void timers.current.push(window.setTimeout(fn, ms));

  // Where the front panel sits on screen, relative to the wheel, so the card can shrink into it.
  function frontBox(): Box | null {
    const p = panels.current[front]?.getBoundingClientRect();
    const w = wrap.current?.getBoundingClientRect();
    if (!p || !w) return null;
    return {
      left: p.left - w.left,
      top: p.top - w.top,
      width: p.width,
      height: p.height,
    };
  }

  // Turns the ring so `target` faces front, adding full turns for a spin.
  function turnTo(target: number, turns: number) {
    if (busy) return;
    const offset = mod(target * STEP + rotation, 360);
    const next = turns > 0 ? rotation - offset - 360 * turns : offset > 180 ? rotation + (360 - offset) : rotation - offset;
    if (reduce) {
      setRotation(next);
      setFront(target);
      return;
    }
    const ms = turns > 0 ? SPIN_MS : STEP_MS;
    setBusy(true);
    setTuck(frontBox());
    setRevealed(false); // the card flies back into the front panel first
    later(480, () => {
      setDuration(ms);
      setRotation(next);
    });
    later(480 + ms + 120, () => {
      setFront(target);
      setRevealed(true);
      setBusy(false);
    });
  }

  const spin = () => turnTo(randomPanel(front), 2);
  const step = (dir: 1 | -1) => turnTo(mod(front + dir, PANELS), 0);

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="home"
        aria-labelledby="hero-title"
        className="relative overflow-hidden bg-[linear-gradient(to_bottom,transparent_60%,#f1ebe3),linear-gradient(100deg,#f6f1eb_0%,#f2eae2_55%,#ede4db_100%)]"
      >
        <div className="container-x relative z-10 grid items-center gap-10 pt-32 pb-12 sm:pt-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:pt-32">
          {/* Copy: the original hero */}
          <div>
            <p className="eyebrow">Personal Fashion Consulting</p>
            <h1
              id="hero-title"
              className="mt-6 font-serif text-[2.9rem] leading-[1.05] font-medium text-charcoal sm:text-6xl lg:text-[3.1rem] xl:text-[4.1rem]"
            >
              Style is personal.
              <span className="mt-1 block text-chocolate italic">Let us make it yours.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg text-muted sm:text-xl">
              Discover your proportions, understand your style, and find the looks that celebrate you. Personalised fashion guidance
              designed around <em className="font-serif text-[1.12em] text-chocolate italic">you</em>.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Link href={BOOK_HREF} className="btn-primary text-lg">
                Book Your Consultation <ArrowRight size={20} strokeWidth={1.5} aria-hidden />
              </Link>
              <Link href="/#services" className="btn-secondary text-lg">
                Explore Our Services
              </Link>
            </div>

            <HeroFeatures />
          </div>

          {/* The figure in its ring of shape panels, with the front panel's card */}
          <div ref={wrap} className="relative mx-auto w-full max-w-[36rem]">
            <div className="[container-type:inline-size]">
              <div
                className="relative h-[70cqw]"
                style={{
                  perspective: `${PERSPECTIVE}cqw`,
                  perspectiveOrigin: `50% ${RING_Y}cqw`,
                }}
              >
                <div
                  aria-hidden
                  className="absolute top-[4cqw] left-1/2 h-[64cqw] w-[64cqw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#fbf3ea_0%,rgba(246,236,226,0.7)_45%,transparent_70%)]"
                />
                <div className="absolute inset-0 [transform-style:preserve-3d]">
                  <Image
                    src={figure}
                    alt="Silhouette of a woman encircled by a ring of glowing colour panels, one for each body shape"
                    sizes="(min-width: 1024px) 18rem, 33vw"
                    preload
                    className="absolute h-auto"
                    style={{
                      top: `${FIG.top}cqw`,
                      left: `${FIG.left}cqw`,
                      width: `${FIG.width}cqw`,
                      maskImage: "linear-gradient(to bottom, #000 78%, transparent 97%)",
                      WebkitMaskImage: "linear-gradient(to bottom, #000 78%, transparent 97%)",
                    }}
                  />
                  <div
                    aria-hidden
                    className="absolute left-1/2 [transform-style:preserve-3d]"
                    style={{
                      top: `${RING_Y}cqw`,
                      transform: `rotateX(${-TILT}deg) rotateY(${rotation}deg)`,
                      transition: duration
                        ? `transform ${duration}ms cubic-bezier(${duration === SPIN_MS ? "0.2, 0.7, 0.12, 1" : "0.45, 0, 0.2, 1"})`
                        : "none",
                    }}
                  >
                    {Array.from({ length: PANELS }, (_, i) => {
                      const hue = hueOf(i);
                      const lit = i === front && revealed && !busy;
                      return (
                        <div
                          key={i}
                          ref={(el) => {
                            panels.current[i] = el;
                          }}
                          className="absolute -top-[7.8cqw] -left-[7.4cqw] h-[15.6cqw] w-[14.8cqw] rounded-[0.6cqw] border-[0.5cqw] border-[#0e0a09] transition-[outline-color] duration-500"
                          style={{
                            transform: `rotateY(${i * STEP}deg) translateZ(${RADIUS}cqw)`,
                            background: `radial-gradient(120% 90% at 50% 100%, hsl(${hue} 100% 66%) 0%, hsl(${hue} 92% 50%) 45%, hsl(${hue} 85% 34%) 100%)`,
                            boxShadow: `0 0 2.6cqw hsl(${hue} 95% 55% / 0.55), inset 0 0 1.4cqw rgba(255,255,255,0.18)`,
                            outline: `0.35cqw solid ${lit ? "rgba(255,255,255,0.9)" : "transparent"}`,
                            outlineOffset: "-0.9cqw",
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Where the card tucks back into while the ring turns */}
            {!revealed && tuck && (
              <motion.div
                layoutId="shape-card"
                transition={{
                  ...CARD_MOVE,
                  opacity: { duration: 0.25, delay: 0.4 },
                }}
                className="pointer-events-none absolute z-20 border-2 border-[#16100e]"
                style={{ ...tuck, ...cardStyle(hueOf(front)), borderRadius: 4 }}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
              />
            )}

            <div className="relative z-10 -mt-[15%] min-h-[22.5rem] sm:min-h-[18rem] lg:min-h-[19.5rem] xl:min-h-[18rem]">
              {revealed && <ShapeCard panel={front} busy={busy} onStep={step} />}
            </div>

            <div className="relative z-10 mt-5 flex justify-center">
              <button
                type="button"
                onClick={spin}
                disabled={busy}
                className="inline-flex min-h-12 items-center gap-2.5 rounded-full border border-chocolate/60 bg-ivory/80 px-6 text-base font-medium tracking-wide text-chocolate shadow-[0_10px_30px_-12px_rgba(73,55,46,0.35)] backdrop-blur transition-colors hover:bg-chocolate hover:text-ivory disabled:opacity-60"
              >
                <RotateCw size={18} strokeWidth={1.5} className={busy ? "animate-spin" : ""} aria-hidden />
                {busy ? "Spinning…" : "Spin to discover a shape"}
              </button>
            </div>
          </div>
        </div>

        <GuessBand />
      </section>
    </MotionConfig>
  );
}
