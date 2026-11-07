"use client";

import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import heroShapes from "@/public/images/hero-shapes.webp";
import { BOOK_HREF } from "@/lib/site";
import { HERO_IMAGE_SIZE, bodyPath, panelBox, panelPoints, shapes, type BodyShape } from "@/lib/shapes";

const GUESS_KEY = "nazaakat_shape_guess";
const START = shapes.findIndex((s) => s.id === "hourglass");
const CARD_MOVE = { type: "spring", stiffness: 120, damping: 20, mass: 0.9 } as const;

const mod = (n: number, m: number) => ((n % m) + m) % m;

// A random shape other than the one already showing.
function randomOther(current: number) {
  const pick = Math.floor(Math.random() * (shapes.length - 1));
  return pick >= current ? pick + 1 : pick;
}

// Pause before each hop of the spinning light: quick at first, slowing to a stop.
function hopDelays(count: number) {
  return Array.from({ length: count }, (_, i) => 55 + 330 * Math.pow((i + 1) / count, 2.8));
}

function paneStyle(shape: BodyShape) {
  return {
    background: `linear-gradient(145deg, ${shape.tone.from} 0%, ${shape.tone.to} 100%)`,
    boxShadow: `0 0 0 1px rgba(255,255,255,0.08) inset, 0 24px 60px -18px ${shape.tone.glow}, 0 0 40px -6px ${shape.tone.glow}`,
  };
}

function MiniFigure({ shape }: { shape: BodyShape }) {
  return (
    <svg viewBox="40 50 120 260" className="h-14 w-7 shrink-0 text-[#f8f1e7]/80" aria-hidden>
      <path d={bodyPath(shape.figure)} fill="none" stroke="currentColor" strokeWidth={5} strokeLinejoin="round" />
    </svg>
  );
}

// The selected panel, enlarged beside the figure, with everything about that shape.
function ShapeCard({ shape, index, busy, onStep }: { shape: BodyShape; index: number; busy: boolean; onStep: (dir: 1 | -1) => void }) {
  return (
    <motion.div
      layoutId="shape-card"
      transition={CARD_MOVE}
      className="relative overflow-hidden rounded-xl border-[6px] border-[#16100e] text-[#f8f1e7]"
      style={{ ...paneStyle(shape), borderRadius: 12 }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.22)_0%,transparent_34%)]" />
      <motion.div
        key={shape.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="relative p-6 sm:p-7"
        aria-live="polite"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <MiniFigure shape={shape} />
            <div>
              <p className="text-xs font-medium tracking-[0.22em] whitespace-nowrap uppercase opacity-80">
                Shape {String(index + 1).padStart(2, "0")} / {String(shapes.length).padStart(2, "0")}
              </p>
              <h2 className="mt-1 font-serif text-[2.1rem] leading-none font-medium">{shape.name}</h2>
            </div>
          </div>
          <div className="-mt-1 -mr-2 flex shrink-0">
            <button type="button" onClick={() => onStep(-1)} disabled={busy} aria-label="Previous shape" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15 disabled:opacity-50">
              <ChevronLeft size={20} strokeWidth={1.5} aria-hidden />
            </button>
            <button type="button" onClick={() => onStep(1)} disabled={busy} aria-label="Next shape" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15 disabled:opacity-50">
              <ChevronRight size={20} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </div>
        <p className="mt-4 text-base leading-relaxed opacity-90">{shape.description}</p>
        <p className="mt-5 text-xs font-medium tracking-[0.22em] uppercase opacity-80">What flatters you</p>
        <ul className="mt-2.5 space-y-1.5 text-base">
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
      <div className="flex flex-col gap-6 border-t border-chocolate/20 pt-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="shrink-0">
          <p className="font-serif text-3xl leading-tight text-charcoal sm:text-4xl">
            Do you know your <span className="text-[#6b1424] italic">body shape?</span>
          </p>
          <p className="mt-1 text-base text-muted">Take a guess. Soon you can upload a photo and find out if you were right.</p>
        </div>

        <div aria-live="polite" className="min-h-[3.25rem] lg:max-w-xl">
          {picked ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <p className="text-base text-charcoal">
                Locked in: <span className="font-serif text-xl text-chocolate italic">{picked.name}</span>. Our photo
                analyser is coming soon. Guess right, and you unlock a discount on your consultation.
              </p>
              <button type="button" onClick={() => choose(null)} className="shrink-0 text-base text-muted underline underline-offset-4 hover:text-chocolate">
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
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-chocolate/30 bg-ivory/70 px-4 text-base text-charcoal transition-colors hover:border-chocolate hover:bg-chocolate hover:text-ivory"
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

export default function ShapeHero() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(START); // the shape whose card is showing
  const [light, setLight] = useState(START); // the panel lit up in the photo
  const [revealed, setRevealed] = useState(true); // card out beside the figure, or tucked back into its panel
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const later = (ms: number, fn: () => void) => void timers.current.push(window.setTimeout(fn, ms));

  function land(target: number) {
    setLight(target);
    setActive(target);
    later(60, () => {
      setRevealed(true);
      setBusy(false);
    });
  }

  function show(target: number, hops: number) {
    if (busy) return;
    if (reduce) {
      setLight(target);
      setActive(target);
      return;
    }
    setBusy(true);
    setRevealed(false); // the card flies back into its panel first
    let at = 520;
    hopDelays(hops).forEach((delay, i) => {
      at += delay;
      const panel = mod(active + i + 1, shapes.length);
      later(at, () => setLight(panel));
    });
    later(at + 380, () => land(target));
  }

  const spin = () => {
    const target = randomOther(active);
    show(target, 2 * shapes.length + mod(target - active, shapes.length));
  };
  const step = (dir: 1 | -1) => show(mod(active + dir, shapes.length), 0);

  const shape = shapes[active];
  const lit = shapes[light];
  const { width: W, height: H } = HERO_IMAGE_SIZE;

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="home"
        aria-labelledby="hero-title"
        className="relative overflow-hidden bg-[linear-gradient(to_bottom,#dccac0_0%,#dccac0_72%,#e6d8cf_100%)]"
      >
        {/* Copy: headline on the left, introduction and actions on the right */}
        <div className="container-x relative z-10 grid gap-7 pt-32 sm:pt-36 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end lg:gap-16 lg:pt-32">
          <div>
            <p className="eyebrow">Personal Fashion Consulting</p>
            <h1 id="hero-title" className="mt-5 font-serif text-[2.6rem] leading-[1.06] font-medium text-charcoal sm:text-[3.4rem] lg:text-[3.2rem] xl:text-[3.6rem]">
              Every body has a shape.
              <span className="block text-chocolate italic">Every shape has its style.</span>
            </h1>
          </div>
          <div>
            <p className="max-w-xl text-lg text-muted">
              Hourglass, pear, apple, rectangle or inverted triangle: the right cuts, necklines and drapes change
              everything. Spin to light up a shape, then let us find the looks made for{" "}
              <em className="font-serif text-[1.12em] text-chocolate italic">yours</em>.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={BOOK_HREF} className="btn-primary">
                Book Your Consultation <ArrowRight size={20} strokeWidth={1.5} aria-hidden />
              </Link>
              <Link href="/#services" className="btn-secondary">
                Explore Our Services
              </Link>
            </div>
          </div>
        </div>

        {/* Figure with the five shape panels, and the selected panel's card beside it */}
        <div className="container-x relative z-10 grid items-center gap-6 pt-6 pb-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-12 lg:pt-2">
          <div>
            <div>
              <div className="relative">
                <Image
                  src={heroShapes}
                  alt="Silhouette of a woman encircled by a ring of glowing colour panels, one for each body shape"
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  placeholder="blur"
                  preload
                  className="h-auto w-full"
                  style={{
                    maskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent), linear-gradient(to bottom, transparent, #000 10%, #000 84%, transparent)",
                    WebkitMaskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent), linear-gradient(to bottom, transparent, #000 10%, #000 84%, transparent)",
                    maskComposite: "intersect",
                    WebkitMaskComposite: "source-in",
                  }}
                />

                {/* The light that runs around the panels */}
                <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                  <defs>
                    <filter id="panel-glow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="14" />
                    </filter>
                  </defs>
                  <polygon points={panelPoints(lit)} fill={lit.tone.glow} filter="url(#panel-glow)" />
                  <polygon points={panelPoints(lit)} fill="rgba(255,255,255,0.22)" stroke="#fff" strokeWidth={5} strokeLinejoin="round" />
                </svg>

                {/* Clicking a panel shows that shape */}
                {shapes.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    tabIndex={-1}
                    aria-hidden
                    onClick={() => i !== active && show(i, 0)}
                    className="absolute cursor-pointer"
                    style={panelBox(s)}
                  />
                ))}

                {/* Where the card tucks back into when it leaves the side */}
                {!revealed && (
                  <motion.div
                    layoutId="shape-card"
                    transition={{ ...CARD_MOVE, opacity: { duration: 0.3, delay: 0.45 } }}
                    className="pointer-events-none absolute border-2 border-[#16100e]"
                    style={{ ...panelBox(shape), ...paneStyle(shape), borderRadius: 4 }}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="min-h-[29rem] sm:min-h-[25rem] lg:min-h-[23rem]">
              {revealed && <ShapeCard shape={shape} index={active} busy={busy} onStep={step} />}
            </div>
            <div className="order-first mb-6 flex justify-center lg:order-none lg:mt-5 lg:mb-0 lg:justify-start">
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
