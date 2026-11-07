"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { BOOK_HREF } from "@/lib/site";
import { armPath, bodyPath, shapes, type BodyShape } from "@/lib/shapes";

const STEP = 360 / shapes.length;
const SPIN_MS = 3800;
const STEP_MS = 900;
const GUESS_KEY = "nazaakat_shape_guess";

const mod = (n: number, m: number) => ((n % m) + m) % m;

// A random shape other than the one already showing.
function randomOther(current: number) {
  const pick = Math.floor(Math.random() * (shapes.length - 1));
  return pick >= current ? pick + 1 : pick;
}

function Silhouette({ shape }: { shape: BodyShape }) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const transition = reduce ? { duration: 0 } : { duration: 1.1, ease: [0.65, 0, 0.35, 1] as const };
  return (
    <svg
      viewBox="0 0 200 400"
      className="absolute top-0 left-1/2 w-[42cqw] -translate-x-1/2 transition-[filter] duration-1000"
      style={{ filter: `drop-shadow(0 0 2.2cqw ${shape.tone.glow})` }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b2a22" />
          <stop offset="1" stopColor="#21160f" />
        </linearGradient>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.72" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={`${id}-mask`}>
          <rect width="200" height="400" fill={`url(#${id}-fade)`} />
        </mask>
      </defs>
      <g fill={`url(#${id}-fill)`} mask={`url(#${id}-mask)`}>
        <motion.path initial={false} animate={{ d: armPath(shape.figure, 1) }} transition={transition} />
        <motion.path initial={false} animate={{ d: armPath(shape.figure, -1) }} transition={transition} />
        <motion.path initial={false} animate={{ d: bodyPath(shape.figure) }} transition={transition} />
        <ellipse cx="100" cy="50" rx="15.5" ry="19.5" />
        <circle cx="100" cy="27" r="10" />
      </g>
    </svg>
  );
}

function MiniFigure({ shape }: { shape: BodyShape }) {
  return (
    <svg viewBox="40 50 120 260" className="h-[10cqw] w-[4.6cqw] shrink-0" aria-hidden>
      <path d={bodyPath(shape.figure)} fill="none" stroke="currentColor" strokeWidth={4} strokeLinejoin="round" />
    </svg>
  );
}

function ShapeCard({ shape, index, onSelect }: { shape: BodyShape; index: number; onSelect: () => void }) {
  const pane = {
    background: `linear-gradient(140deg, ${shape.tone.from} 0%, ${shape.tone.to} 100%)`,
    boxShadow: `0 0 3cqw ${shape.tone.glow}, inset 0 0 0 0.25cqw rgba(201, 169, 110, 0.55)`,
  };
  const face = "absolute inset-0 rounded-[1.4cqw] border-[0.55cqw] border-[#1b1310] [backface-visibility:hidden]";
  return (
    <div
      className="absolute -top-[9.5cqw] -left-[14cqw] h-[19cqw] w-[28cqw] cursor-pointer [transform-style:preserve-3d]"
      style={{ transform: `rotateY(${index * STEP}deg) translateZ(35cqw)` }}
      onClick={onSelect}
    >
      <div className={`${face} flex items-center gap-[1.6cqw] overflow-hidden px-[2.2cqw] text-[#f8f1e7]`} style={pane}>
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.28)_0%,transparent_38%)]" />
        <span className="absolute top-[1.4cqw] right-[1.8cqw] font-serif text-[2.2cqw] italic opacity-70">
          {String(index + 1).padStart(2, "0")}
        </span>
        <MiniFigure shape={shape} />
        <span className="relative min-w-0">
          <span className={`block font-serif leading-[1.05] font-medium ${shape.name.length > 10 ? "text-[2.7cqw]" : "text-[3.3cqw]"}`}>
            {shape.name}
          </span>
          <span className="mt-[0.6cqw] block text-[1.6cqw] tracking-[0.16em] whitespace-nowrap uppercase opacity-80">{shape.short}</span>
        </span>
      </div>
      <div className={face} style={{ ...pane, transform: "rotateY(180deg)", filter: "brightness(0.7)" }} />
    </div>
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

export default function ShapeHero() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [duration, setDuration] = useState(STEP_MS);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const shape = shapes[active];

  // Turns the ring so `target` faces front: the short way round, or with extra full turns for a spin.
  function goTo(target: number, turns = 0) {
    if (spinning) return;
    const offset = mod(target * STEP + rotation, 360);
    const next = turns > 0 ? rotation - offset - 360 * turns : offset > 180 ? rotation + (360 - offset) : rotation - offset;
    if (reduce) {
      setDuration(0);
      setRotation(next);
      setActive(target);
      return;
    }
    if (turns === 0) {
      setDuration(STEP_MS);
      setRotation(next);
      setActive(target);
      return;
    }
    setDuration(SPIN_MS);
    setRotation(next);
    setSpinning(true);
    timer.current = setTimeout(() => {
      setActive(target);
      setSpinning(false);
    }, SPIN_MS - 250);
  }

  function spin() {
    goTo(randomOther(active), 2);
  }

  return (
    <section
      id="home"
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-[linear-gradient(to_bottom,transparent_60%,#f1ebe3),linear-gradient(100deg,#f6f1eb_0%,#f2eae2_55%,#ede4db_100%)]"
    >
      <div className="container-x relative z-10 grid items-center gap-12 pt-32 pb-12 sm:pt-36 lg:grid-cols-[1fr_minmax(0,32rem)] lg:gap-16 lg:pt-32 xl:grid-cols-[1fr_minmax(0,34rem)]">
        {/* Copy */}
        <div>
          <p className="eyebrow">Personal Fashion Consulting</p>
          <h1 id="hero-title" className="mt-6 font-serif text-[2.6rem] leading-[1.08] font-medium text-balance text-charcoal sm:text-[3.4rem] lg:text-[3.3rem] xl:text-[3.9rem]">
            Every body has a shape.
            <span className="mt-1 block text-chocolate italic">Every shape has its style.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-muted sm:text-xl">
            Hourglass, pear, apple, rectangle or inverted triangle: the right cuts, necklines and drapes change
            everything. Spin the wheel to explore each shape, then let us find the looks made for{" "}
            <em className="font-serif text-[1.12em] text-chocolate italic">yours</em>.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link href={BOOK_HREF} className="btn-primary text-lg">
              Book Your Consultation <ArrowRight size={20} strokeWidth={1.5} aria-hidden />
            </Link>
            <Link href="/#services" className="btn-secondary text-lg">
              Explore Our Services
            </Link>
          </div>
        </div>

        {/* Shape wheel */}
        <div className="mx-auto w-full max-w-[30rem] lg:max-w-none">
          <div className="relative [container-type:inline-size]">
            <div
              aria-hidden
              className="absolute top-[16cqw] left-1/2 h-[62cqw] w-[62cqw] -translate-x-1/2 rounded-full opacity-40 blur-[7cqw] transition-colors duration-1000"
              style={{ background: shape.tone.to }}
            />
            <div className="relative h-[90cqw] [perspective:210cqw] [perspective-origin:50%_30%]">
              <div className="absolute inset-0 [transform-style:preserve-3d]">
                <Silhouette shape={shape} />
                <div
                  className="absolute top-[64cqw] left-1/2 [transform-style:preserve-3d]"
                  style={{
                    transform: `rotateX(-13deg) rotateY(${rotation}deg)`,
                    transition: duration ? `transform ${duration}ms cubic-bezier(${spinning ? "0.15, 0.7, 0.12, 1" : "0.45, 0, 0.2, 1"})` : "none",
                  }}
                >
                  {shapes.map((s, i) => (
                    <ShapeCard key={s.id} shape={s} index={i} onSelect={() => goTo(i)} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-2 flex justify-center">
            <button
              type="button"
              onClick={spin}
              disabled={spinning}
              className="inline-flex min-h-12 items-center gap-2.5 rounded-full border border-chocolate/70 bg-ivory/80 px-6 text-base font-medium tracking-wide text-chocolate shadow-[0_10px_30px_-12px_rgba(73,55,46,0.35)] backdrop-blur transition-colors hover:bg-chocolate hover:text-ivory disabled:opacity-60"
            >
              <RotateCw size={18} strokeWidth={1.5} className={spinning ? "animate-spin" : ""} aria-hidden />
              {spinning ? "Spinning…" : "Spin to discover a shape"}
            </button>
          </div>

          {/* Details of the shape facing front */}
          <div className="relative mt-6 overflow-hidden rounded-2xl border border-white/80 bg-[#f8f4ef]/90 p-6 shadow-[0_12px_40px_-14px_rgba(73,55,46,0.22)] sm:p-7">
            <span aria-hidden className="absolute inset-y-0 left-0 w-1 transition-colors duration-1000" style={{ background: shape.tone.to }} />
            <div className="flex items-start justify-between gap-4">
              <p className="eyebrow !text-xs">
                Body shape {String(active + 1).padStart(2, "0")} / {String(shapes.length).padStart(2, "0")}
              </p>
              <div className="-mt-2 -mr-2 flex">
                <button type="button" onClick={() => goTo(mod(active - 1, shapes.length))} disabled={spinning} aria-label="Previous shape" className="grid h-10 w-10 place-items-center rounded-full text-chocolate hover:bg-beige disabled:opacity-50">
                  <ChevronLeft size={20} strokeWidth={1.5} aria-hidden />
                </button>
                <button type="button" onClick={() => goTo(mod(active + 1, shapes.length))} disabled={spinning} aria-label="Next shape" className="grid h-10 w-10 place-items-center rounded-full text-chocolate hover:bg-beige disabled:opacity-50">
                  <ChevronRight size={20} strokeWidth={1.5} aria-hidden />
                </button>
              </div>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={shape.id}
                aria-live="polite"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
              >
                <h2 className="font-serif text-3xl leading-tight font-medium text-charcoal">{shape.name}</h2>
                <p className="mt-1.5 text-base text-muted">{shape.description}</p>
                <p className="mt-5 text-xs font-medium tracking-[0.2em] text-chocolate uppercase">What flatters you</p>
                <ul className="mt-2.5 grid gap-x-6 gap-y-1.5 text-base text-charcoal sm:grid-cols-2">
                  {shape.flatters.map((item) => (
                    <li key={item} className="flex gap-2.5 leading-snug">
                      <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rotate-45 bg-[#b8924f]" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <GuessBand />
    </section>
  );
}
