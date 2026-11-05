"use client";

import { ArrowLeft, CalendarDays, Clock, Loader2, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Intake from "@/components/Intake";
import { whatsappLink } from "@/lib/site";
import { formatShort, formatTime, formatWhen } from "@/lib/time";

type Slot = { id: string; starts_at: string; duration_minutes: number };
type Stage = "loading" | "slots" | "contact" | "intake" | "done" | "unavailable";

const bookErrors: Record<string, string> = {
  slot_taken: "That time was just taken by someone else. Please choose another.",
  need_name: "Please enter your name.",
  need_whatsapp: "Please enter a valid WhatsApp number.",
  bad_slot: "Please choose a time.",
};

export default function BookingFlow() {
  const [stage, setStage] = useState<Stage>("loading");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);

  // Starts in "loading" (the initial state above); this never sets it synchronously from an effect.
  async function loadSlots() {
    try {
      const res = await fetch("/api/slots", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "read_failed");
      setSlots(data.slots);
      setStage(data.slots.length === 0 ? "unavailable" : "slots");
    } catch {
      setStage("unavailable");
    }
  }

  // Only ever runs once, on mount; loadSlots is also called later, after a slot turns out to be taken.
  useEffect(() => {
    void (async () => {
      await loadSlots();
    })();
  }, []);

  useEffect(() => {
    if (stage !== "loading") heading.current?.focus();
  }, [stage]);

  // Slots grouped by calendar day (in IST), in order.
  const days = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = formatShort(s.starts_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()];
  }, [slots]);

  // The selected day, defaulting to the first day with open times; computed during render
  // (not stored via an effect) so there is no extra render pass just to pick a default.
  const selectedDay = day ?? days[0]?.[0] ?? null;

  async function confirmBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!slot) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: slot.id, name, whatsapp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "save_failed");
      setBookingId(data.bookingId);
      setStage("intake");
    } catch (err) {
      const code = (err as Error).message;
      if (code === "slot_taken") {
        setError(bookErrors.slot_taken);
        setSlot(null);
        setStage("slots");
        loadSlots();
      } else {
        setError(bookErrors[code] || "We could not book that time. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const wa = whatsappLink("Hello NAZAAKAT, I would like to book a style consultation.");

  if (stage === "loading") {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 border border-taupe/60 bg-ivory text-muted">
        <CalendarDays size={32} strokeWidth={1.25} aria-hidden />
        <p>Loading available times…</p>
      </div>
    );
  }

  if (stage === "unavailable") {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center border border-taupe/60 bg-ivory px-6 py-16 text-center">
        <p className="eyebrow">Online booking</p>
        <p className="mt-5 max-w-lg font-serif text-4xl leading-tight text-charcoal">No times are open right now.</p>
        <p className="mt-4 max-w-md text-lg text-muted">
          Please check back soon{wa ? ", or message us on WhatsApp and we will find a time with you." : "."}
        </p>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-primary mt-8 text-lg">
            <MessageCircle size={20} strokeWidth={1.5} aria-hidden /> Book on WhatsApp
          </a>
        )}
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="flex gap-4 border border-chocolate/30 bg-ivory p-6 sm:p-8" role="status">
        <CalendarDays className="mt-1 shrink-0 text-chocolate" size={28} strokeWidth={1.5} aria-hidden />
        <div>
          <h1 className="font-serif text-3xl font-medium text-charcoal">Your consultation is booked.</h1>
          <p className="mt-2 text-lg text-muted">
            Thank you. We will send your private video consultation link to your WhatsApp number shortly. Simply tap the
            link at your appointment time. No account or app download needed.
          </p>
        </div>
      </div>
    );
  }

  if (stage === "intake" && bookingId) {
    return <Intake bookingId={bookingId} onDone={() => setStage("done")} />;
  }

  const dayTimes = selectedDay ? (days.find(([d]) => d === selectedDay)?.[1] ?? []) : [];

  return (
    <div className="border border-taupe/60 bg-ivory p-5 sm:p-8">
      {stage === "contact" && slot ? (
        <form onSubmit={confirmBooking}>
          <button
            type="button"
            onClick={() => {
              setStage("slots");
              setError("");
            }}
            className="inline-flex items-center gap-1.5 text-base text-muted hover:text-chocolate"
          >
            <ArrowLeft size={16} aria-hidden /> Choose a different time
          </button>
          <h2 ref={heading} tabIndex={-1} className="mt-5 font-serif text-3xl leading-tight font-medium text-charcoal outline-none sm:text-4xl">
            {formatWhen(slot.starts_at)}
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-lg font-medium text-charcoal">Your name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                autoFocus
                required
                className="mt-2 block min-h-14 w-full border border-taupe bg-white px-4 text-lg"
              />
            </label>
            <label className="block">
              <span className="text-lg font-medium text-charcoal">WhatsApp Number (with country code)</span>
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                type="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                required
                className="mt-2 block min-h-14 w-full border border-taupe bg-white px-4 text-lg"
              />
            </label>
          </div>
          <div aria-live="assertive">
            {error && (
              <p role="alert" className="mt-6 text-lg text-[#a3182c]">
                {error}
              </p>
            )}
          </div>
          <button type="submit" disabled={busy} className="btn-primary mt-8 w-full rounded-lg text-lg disabled:opacity-70 sm:w-auto">
            {busy ? (
              <>
                <Loader2 size={20} className="animate-spin" aria-hidden /> Booking…
              </>
            ) : (
              "Confirm this time"
            )}
          </button>
        </form>
      ) : (
        <>
          <h2 ref={heading} tabIndex={-1} className="font-serif text-2xl font-medium text-charcoal outline-none">
            Choose a date and time
          </h2>
          <div aria-live="assertive">
            {error && (
              <p role="alert" className="mt-3 text-base text-[#a3182c]">
                {error}
              </p>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Date">
            {days.map(([d]) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={d === selectedDay}
                onClick={() => setDay(d)}
                className={`min-h-12 rounded-full border px-5 text-base transition-colors ${
                  d === selectedDay ? "border-chocolate bg-chocolate text-ivory" : "border-taupe text-charcoal hover:border-chocolate"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3" role="list" aria-label="Available times">
            {dayTimes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSlot(s);
                  setStage("contact");
                  setError("");
                }}
                className="inline-flex min-h-14 items-center justify-center gap-2 border border-taupe px-3 text-base text-charcoal transition-colors hover:border-chocolate hover:bg-chocolate hover:text-ivory"
              >
                <Clock size={16} aria-hidden /> {formatTime(s.starts_at)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
