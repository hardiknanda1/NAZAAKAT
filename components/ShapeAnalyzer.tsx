"use client";

import { ArrowRight, Camera, Check, Loader2, Lock, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BOOK_HREF } from "@/lib/site";
import { DISCOUNT_KEY, GUESS_KEY, SHAPE_DISCOUNT_PERCENT, bodyPath, shapeById, shapes, type BodyShape, type StoredDiscount } from "@/lib/shapes";
import { shrink } from "@/lib/shrink";

type Result =
  | { status: "ok"; shape: string; confidence: string; reason: string; correct: boolean; firstResult: boolean; analysisId?: string; percent?: number }
  | { status: "unclear"; reason: string };

const errors: Record<string, string> = {
  need_guess: "Please make your guess first.",
  need_photo: "Please add a photo.",
  photo: "That photo could not be prepared. Please try a different one.",
  bad_photo: "That photo could not be used. Please try a JPEG or PNG photo.",
  too_large: "That photo is too large. Please try a different one.",
  too_many: "You've reached today's limit for photo analysis. Please try again tomorrow.",
  not_configured: "The analyser isn't switched on yet. Please message us on WhatsApp and we'll help you.",
  analysis_failed: "We couldn't analyse your photo just now. Please try again in a moment.",
  save_failed: "Something went wrong on our side. Please try again in a moment.",
  need_phone: "Please enter a valid WhatsApp number.",
  bad_analysis: "This result can no longer be claimed. Please analyse your photo again.",
  already_claimed: "This discount has already been claimed.",
  phone_used: "This number already has a body-shape discount saved.",
};
const message = (code: string) => errors[code] || "Something went wrong. Please check your connection and try again.";

function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function store(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  } catch {
    // Storage blocked: the flow still works for this visit.
  }
}

function Outline({ shape, className = "" }: { shape: BodyShape; className?: string }) {
  return (
    <svg viewBox="40 50 120 260" className={className} aria-hidden>
      <path d={bodyPath(shape.figure)} fill="none" stroke="currentColor" strokeWidth={5} strokeLinejoin="round" />
    </svg>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <section className="border-t border-taupe/50 py-8 first:border-t-0 first:pt-0">
      <h2 className="flex items-center gap-3 font-serif text-2xl font-medium text-charcoal sm:text-3xl">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-base font-sans ${done ? "bg-chocolate text-ivory" : "border border-chocolate/40 text-chocolate"}`}>
          {done ? <Check size={18} aria-hidden /> : n}
        </span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function ShapeAnalyzer() {
  const [guess, setGuess] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [phone, setPhone] = useState("");
  const [claimError, setClaimError] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [discount, setDiscount] = useState<StoredDiscount | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // A guess made in the home page hero carries over; so does a discount claimed on an earlier visit.
  useEffect(() => {
    void (async () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(GUESS_KEY); // plain text, as the hero saves it
      } catch {
        // storage blocked
      }
      if (shapeById(saved)) setGuess(saved);
      const claimed = readStored<StoredDiscount>(DISCOUNT_KEY);
      if (claimed?.id) setDiscount(claimed);
    })();
  }, []);

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.url)), [photo]);

  function chooseGuess(id: string) {
    setGuess(id);
    store(GUESS_KEY, id);
    setError("");
  }

  async function pickPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError("");
    try {
      const blob = await shrink(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setError(message("photo"));
    }
  }

  async function analyse() {
    if (!guess) return setError(message("need_guess"));
    if (!photo) return setError(message("need_photo"));
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("guess", guess);
      form.append("photo", photo.blob, "photo.jpg");
      const res = await fetch("/api/shape/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "analysis_failed");
      setResult(data);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err) {
      setError(message((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  function retry() {
    setResult(null);
    setPhoto(null);
    setError("");
  }

  // Saves the discount to the phone number: no code, no password. Booking with this WhatsApp
  // number applies it automatically.
  async function claim(e: React.FormEvent) {
    e.preventDefault();
    if (result?.status !== "ok" || !result.analysisId) return;
    setClaiming(true);
    setClaimError("");
    try {
      const res = await fetch("/api/shape/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: result.analysisId, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "save_failed");
      setDiscount(data.discount);
      store(DISCOUNT_KEY, data.discount);
    } catch (err) {
      setClaimError(message((err as Error).message));
    } finally {
      setClaiming(false);
    }
  }

  const guessed = shapeById(guess);
  const found = result?.status === "ok" ? shapeById(result.shape) : null;

  return (
    <div>
      {discount && !result && (
        <div className="mb-8 flex flex-col gap-3 border border-[#6b1424]/30 bg-[#6b1424]/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base text-charcoal">
            You already have <strong>{discount.percent}% off</strong> saved for +{discount.phone}.
          </p>
          <Link href={BOOK_HREF} className="btn-primary shrink-0">
            Book your consultation <ArrowRight size={18} strokeWidth={1.5} aria-hidden />
          </Link>
        </div>
      )}

      <div className="border border-taupe/60 bg-ivory p-5 sm:p-8">
        <Step n={1} title="Make your guess" done={Boolean(guessed)}>
          <p className="text-base text-muted">Which shape do you think you are? Guess right and you get {SHAPE_DISCOUNT_PERCENT}% off your consultation.</p>
          <div className="mt-4 flex flex-wrap gap-2.5" role="radiogroup" aria-label="Your guess">
            {shapes.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={guess === s.id}
                disabled={Boolean(result)}
                onClick={() => chooseGuess(s.id)}
                className={`inline-flex min-h-12 items-center gap-2.5 rounded-full border px-4 text-base transition-colors disabled:cursor-default ${
                  guess === s.id ? "border-chocolate bg-chocolate text-ivory" : "border-taupe text-charcoal hover:border-chocolate disabled:opacity-60"
                }`}
              >
                <Outline shape={s} className="h-6 w-3" />
                {s.name}
              </button>
            ))}
          </div>
        </Step>

        <Step n={2} title="Add one photo" done={Boolean(photo)}>
          <ul className="grid gap-x-6 gap-y-1.5 text-base text-muted sm:grid-cols-2">
            <li>Stand straight, facing the camera</li>
            <li>Shoulders to hips in view (full length is best)</li>
            <li>Fitted clothes and a plain background</li>
            <li>Good, even light</li>
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-5">
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element -- a local preview of the visitor's own photo
              <img src={photo.url} alt="Your photo" className="h-36 w-28 border border-taupe/60 object-cover" />
            )}
            {!result && (
              <label className="btn-secondary cursor-pointer rounded-lg">
                <Camera size={18} strokeWidth={1.5} aria-hidden /> {photo ? "Choose a different photo" : "Choose a photo"}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickPhoto(e.target.files)} />
              </label>
            )}
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Lock size={14} aria-hidden /> Your photo is only used for this analysis. It is never saved.
          </p>
        </Step>

        {!result && (
          <div className="border-t border-taupe/50 pt-8">
            <div aria-live="assertive">
              {error && (
                <p role="alert" className="mb-4 text-base text-[#a3182c]">
                  {error}
                </p>
              )}
            </div>
            <button type="button" onClick={analyse} disabled={busy} className="btn-primary w-full rounded-lg text-lg disabled:opacity-70 sm:w-auto">
              {busy ? (
                <>
                  <Loader2 size={20} className="animate-spin" aria-hidden /> Reading your proportions…
                </>
              ) : (
                <>
                  <Sparkles size={20} strokeWidth={1.5} aria-hidden /> Reveal my body shape
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div ref={resultRef} className="scroll-mt-28" aria-live="polite">
        {result?.status === "unclear" && (
          <div className="mt-8 border border-taupe/60 bg-ivory p-6 sm:p-8">
            <h2 className="font-serif text-3xl font-medium text-charcoal">We couldn&apos;t read that photo</h2>
            <p className="mt-2 text-lg text-muted">{result.reason}</p>
            <button type="button" onClick={retry} className="btn-secondary mt-6 rounded-lg">
              <RotateCcw size={18} strokeWidth={1.5} aria-hidden /> Try another photo
            </button>
          </div>
        )}

        {result?.status === "ok" && found && (
          <div className="mt-8 space-y-6">
            <div
              className="overflow-hidden rounded-xl border-[6px] border-[#16100e] p-6 text-[#f8f1e7] sm:p-8"
              style={{ background: `linear-gradient(145deg, ${found.tone.from} 0%, ${found.tone.to} 100%)` }}
            >
              <div className="flex items-center gap-5">
                <Outline shape={found} className="h-24 w-12 shrink-0 text-[#f8f1e7]/85" />
                <div>
                  <p className="text-xs font-medium tracking-[0.22em] uppercase opacity-80">Your body shape</p>
                  <p className="mt-1 font-serif text-4xl leading-none font-medium sm:text-5xl">{found.name}</p>
                </div>
              </div>
              <p className="mt-5 text-lg leading-relaxed opacity-95">{result.reason}</p>
              <p className="mt-5 text-xs font-medium tracking-[0.22em] uppercase opacity-80">What flatters you</p>
              <ul className="mt-2 grid gap-x-6 gap-y-1.5 text-base sm:grid-cols-2">
                {found.flatters.map((item) => (
                  <li key={item} className="flex gap-2.5 leading-snug">
                    <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rotate-45 bg-[#f1d9a6]" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {result.analysisId ? (
              <div className="border border-[#6b1424]/30 bg-ivory p-6 sm:p-8">
                <p className="font-serif text-3xl font-medium text-charcoal">
                  You guessed right! <span className="text-[#6b1424] italic">{result.percent}% off</span> is yours.
                </p>
                {discount ? (
                  <div className="mt-4">
                    <p className="text-lg text-charcoal">
                      Saved to +{discount.phone}. Book with this WhatsApp number and the discount comes off your consultation.
                    </p>
                    <Link href={BOOK_HREF} className="btn-primary mt-6 rounded-lg text-lg">
                      Book your consultation <ArrowRight size={20} strokeWidth={1.5} aria-hidden />
                    </Link>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-lg text-muted">
                      Enter your WhatsApp number to save it. When you book with this number, the discount comes off your consultation
                      automatically. No account, no password.
                    </p>
                    <form onSubmit={claim} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                      <label className="block flex-1">
                        <span className="text-base font-medium text-charcoal">WhatsApp number</span>
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          type="tel"
                          autoComplete="tel"
                          placeholder="+91 98765 43210"
                          required
                          className="mt-1.5 block min-h-13 w-full border border-taupe bg-white px-4 text-lg"
                        />
                      </label>
                      <button type="submit" disabled={claiming} className="btn-primary rounded-lg disabled:opacity-70">
                        {claiming ? <Loader2 size={18} className="animate-spin" aria-hidden /> : null} Save my discount
                      </button>
                    </form>
                    <div aria-live="assertive">
                      {claimError && (
                        <p role="alert" className="mt-4 text-base text-[#a3182c]">
                          {claimError}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="border border-taupe/60 bg-ivory p-6 sm:p-8">
                <p className="font-serif text-3xl font-medium text-charcoal">
                  {result.correct
                    ? "You guessed right!"
                    : `You guessed ${guessed?.name ?? "differently"}. So close.`}
                </p>
                <p className="mt-2 text-lg text-muted">
                  {result.correct
                    ? "The discount is only for a first guess, but your stylist can now plan around exactly the right shape."
                    : "Now you know what to look for, and your stylist can take it from here."}
                </p>
                <Link href={BOOK_HREF} className="btn-primary mt-6 rounded-lg text-lg">
                  Book your consultation <ArrowRight size={20} strokeWidth={1.5} aria-hidden />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
