"use client";

import { Camera, Loader2, Lock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MAX_PHOTOS, missingAnswers, questions } from "@/lib/intake";
import { shrink } from "@/lib/shrink";
import { whatsappLink } from "@/lib/site";

type Photo = { id: string; blob: Blob; url: string };

const errors: Record<string, string> = {
  no_photos: "Please add at least one photo.",
  photo: "One of the photos could not be prepared. Please try a different photo.",
  bad_photo: "One of the photos could not be used. Please try a different photo.",
  too_many_photos: "Please remove a photo. Up to 5 are allowed.",
  too_large: "The photos are too large together. Please remove one and try again.",
  need_answers: "Please answer the questions marked as required.",
  need_name: "Please go back and enter your name.",
  need_whatsapp: "Please go back and enter a valid WhatsApp number.",
  bad_slot: "Please go back and choose a time.",
  bad_answers: "Something went wrong with your answers. Please try again.",
  not_configured: "Online booking is not ready yet. Please message us on WhatsApp instead.",
  save_failed: "We could not save your booking just now. Nothing was booked, so please try again in a moment.",
};

function Chip({ type, name, value, checked, onChange }: { type: "radio" | "checkbox"; name: string; value: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="cursor-pointer">
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="inline-flex min-h-12 items-center rounded-full border border-taupe px-5 text-base text-charcoal transition-colors peer-checked:border-chocolate peer-checked:bg-chocolate peer-checked:text-ivory peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-chocolate">
        {value}
      </span>
    </label>
  );
}

export type Booked = { bookingId: string; startsAt: string; discountPercent: number | null };

// The last step of booking: photos and questionnaire. Pressing send books the chosen time together with
// them, so a booking always has its photos and answers. Leaving this step books nothing.
export default function Intake({
  slotId,
  name,
  whatsapp,
  onBooked,
  onSlotTaken,
}: {
  slotId: string;
  name: string;
  whatsapp: string;
  onBooked: (b: Booked) => void;
  onSlotTaken: () => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => heading.current?.focus(), []);
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    setError("");
    const room = MAX_PHOTOS - photos.length;
    const added: Photo[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      try {
        const blob = await shrink(file);
        added.push({ id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) });
      } catch {
        setError(errors.photo);
      }
    }
    setPhotos((p) => [...p, ...added]);
    if (picker.current) picker.current.value = "";
  }

  function toggle(id: string, value: string) {
    setAnswers((a) => {
      const list = Array.isArray(a[id]) ? (a[id] as string[]) : [];
      return { ...a, [id]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (photos.length === 0) return setError(errors.no_photos);
    const missing = missingAnswers(answers);
    if (missing.length) return setError(`Please answer: ${missing.join(", ")}.`);
    setBusy(true);
    setError("");
    const body = new FormData();
    body.set("slotId", slotId);
    body.set("name", name);
    body.set("whatsapp", whatsapp);
    body.set("answers", JSON.stringify(answers));
    photos.forEach((p, i) => body.append("photos", p.blob, `photo-${i + 1}.jpg`));
    try {
      const res = await fetch("/api/book", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "save_failed");
      onBooked({ bookingId: data.bookingId, startsAt: data.startsAt, discountPercent: data.discountPercent ?? null });
    } catch (err) {
      const code = (err as Error).message;
      if (code === "slot_taken") {
        setBusy(false);
        return onSlotTaken();
      }
      const wa = whatsappLink();
      setError(errors[code] || `We could not send your details just now. Please try again${wa ? ", or send your photos to us on WhatsApp" : ""}.`);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-taupe/60 bg-ivory p-5 sm:p-10">
      <p className="eyebrow">One last step</p>
      <h3 ref={heading} tabIndex={-1} className="mt-3 font-serif text-4xl leading-tight text-charcoal outline-none sm:text-5xl">
        Help us prepare <span className="text-chocolate italic">for you.</span>
      </h3>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Share a few photos and answers so your stylist can get to know you. Your time is booked as soon as you send them.
      </p>

      {/* Photos */}
      <fieldset className="mt-10">
        <legend className="text-xl font-medium text-charcoal">Your photos</legend>
        <p className="mt-2 text-base text-muted">
          Please add 2 or 3 photos in daylight, if you can: one full length from the front, one from the side, and one close up of your face.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {photos.map((p, i) => (
            <div key={p.id} className="relative aspect-[3/4] overflow-hidden rounded-lg bg-beige">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a chosen photo */}
              <img src={p.url} alt={`Your photo ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((list) => list.filter((x) => x.id !== p.id))}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1.5 right-1.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-charcoal/75 text-white"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
          ))}
        </div>
        {photos.length < MAX_PHOTOS && (
          <label className="btn-secondary mt-4 cursor-pointer rounded-lg text-lg focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-chocolate">
            <Camera size={20} strokeWidth={1.5} aria-hidden />
            {photos.length ? "Add more photos" : "Add photos"}
            <input ref={picker} type="file" accept="image/*" multiple onChange={(e) => addPhotos(e.target.files)} className="sr-only" />
          </label>
        )}
        <p className="mt-3 flex items-center gap-2 text-sm text-muted">
          <Lock size={14} aria-hidden /> Your photos are private. Only your stylist sees them.
        </p>
      </fieldset>

      {/* Questions */}
      <div className="mt-10 space-y-8">
        {questions.map((q) => (
          <fieldset key={q.id}>
            <legend className="text-lg font-medium text-charcoal">
              {q.label}
              {q.required && <span className="ml-1.5 text-base font-normal text-muted">(required)</span>}
            </legend>
            {q.type === "text" ? (
              <input
                aria-label={q.label}
                value={(answers[q.id] as string) || ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                placeholder={q.placeholder}
                maxLength={600}
                className="mt-3 block min-h-14 w-full border border-taupe bg-white px-4 text-lg text-charcoal"
              />
            ) : (
              <div className="mt-3 flex flex-wrap gap-2.5">
                {q.options.map((o) => (
                  <Chip
                    key={o}
                    type={q.type === "choice" ? "radio" : "checkbox"}
                    name={q.id}
                    value={o}
                    checked={q.type === "choice" ? answers[q.id] === o : ((answers[q.id] as string[]) || []).includes(o)}
                    onChange={() => (q.type === "choice" ? setAnswers((a) => ({ ...a, [q.id]: o })) : toggle(q.id, o))}
                  />
                ))}
              </div>
            )}
          </fieldset>
        ))}
      </div>

      <div aria-live="assertive">
        {error && (
          <p role="alert" className="mt-8 text-lg text-[#a3182c]">
            {error}
          </p>
        )}
      </div>

      <button type="submit" disabled={busy} className="btn-primary mt-8 w-full rounded-lg text-lg disabled:opacity-70 sm:w-auto">
        {busy ? (
          <>
            <Loader2 size={20} className="animate-spin" aria-hidden /> Booking your consultation…
          </>
        ) : (
          "Confirm my booking"
        )}
      </button>
    </form>
  );
}
