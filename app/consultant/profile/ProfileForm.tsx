"use client";

import { Camera, Loader2, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EXPERTISE, LANGUAGES } from "@/lib/consultantProfile";
import { shrink } from "@/lib/shrink";

type Values = {
  name: string;
  phone: string;
  expertise: string[];
  years_experience: string;
  languages: string[];
  city: string;
  bio: string;
  portfolio_url: string;
};

const errors: Record<string, string> = {
  need_name: "Please enter your name.",
  need_phone: "Please enter a valid phone number.",
  bad_years: "Please enter your years of experience as a whole number.",
  bad_link: "That link doesn't look right. Please check it.",
  bad_photo: "That photo couldn't be used. Please try a JPEG or PNG.",
  photo: "That photo couldn't be prepared. Please try a different one.",
  too_large: "That photo is too large. Please try a different one.",
  unauthorized: "Your sign-in has expired. Please refresh and sign in again.",
};

function Chips({ options, value, onChange, label }: { options: string[]; value: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={`min-h-10 rounded-full border px-4 text-sm transition-colors ${on ? "border-chocolate bg-chocolate text-ivory" : "border-taupe text-charcoal hover:border-chocolate"}`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export default function ProfileForm({ email, photoUrl, initial }: { email: string; photoUrl: string | null; initial: Values }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(initial);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const set = (k: keyof Values) => (val: string | string[]) => setV((x) => ({ ...x, [k]: val }));

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.url)), [photo]);

  async function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError("");
    try {
      const blob = await shrink(file, 800);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
      setRemoved(false);
    } catch {
      setError(errors.photo);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const body = new FormData();
    body.set("profile", JSON.stringify(v));
    if (photo) body.set("photo", photo.blob, "photo.jpg");
    if (removed) body.set("removePhoto", "true");
    try {
      const res = await fetch("/api/consultant/profile", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "save_failed");
      setSaved(true);
      setPhoto(null);
      setRemoved(false);
      router.refresh();
    } catch (err) {
      setError(errors[(err as Error).message] || "Could not save your profile. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const shown = photo?.url ?? (removed ? null : photoUrl);
  const input = "mt-1.5 block min-h-12 w-full border border-taupe bg-white px-3 text-base";
  const label = "text-base font-medium text-charcoal";

  return (
    <form onSubmit={save} className="border border-taupe/60 bg-ivory p-5 sm:p-7">
      <h2 className="font-serif text-2xl font-medium text-charcoal">About you</h2>
      <p className="mt-1 text-base text-muted">This helps the NAZAAKAT team match you with the right clients.</p>

      <div className="mt-6 flex flex-wrap items-center gap-5">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border border-taupe/60 bg-beige">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- the consultant's own photo, from a short-lived private link or a local preview
            <img src={shown} alt="Your photo" className="h-full w-full object-cover" />
          ) : (
            <UserRound size={40} strokeWidth={1.25} className="text-taupe" aria-hidden />
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="btn-secondary min-h-11 cursor-pointer rounded-lg px-4 text-sm">
            <Camera size={16} aria-hidden /> {shown ? "Change photo" : "Add a photo (optional)"}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files)} />
          </label>
          {shown && (
            <button
              type="button"
              onClick={() => {
                setPhoto(null);
                setRemoved(true);
              }}
              className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-muted underline underline-offset-4 hover:text-chocolate"
            >
              <X size={14} aria-hidden /> Remove
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Name</span>
          <input value={v.name} onChange={(e) => set("name")(e.target.value)} autoComplete="name" required className={input} />
        </label>
        <label className="block">
          <span className={label}>Email</span>
          <input value={email} readOnly className={`${input} bg-beige/50 text-muted`} />
        </label>
        <label className="block">
          <span className={label}>Phone number</span>
          <input type="tel" value={v.phone} onChange={(e) => set("phone")(e.target.value)} autoComplete="tel" required className={input} />
        </label>
        <label className="block">
          <span className={label}>City</span>
          <input value={v.city} onChange={(e) => set("city")(e.target.value)} autoComplete="address-level2" placeholder="e.g. Mumbai" className={input} />
        </label>
        <label className="block">
          <span className={label}>Years of styling experience</span>
          <input value={v.years_experience} onChange={(e) => set("years_experience")(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" className={input} />
        </label>
        <label className="block">
          <span className={label}>Instagram or portfolio link</span>
          <input value={v.portfolio_url} onChange={(e) => set("portfolio_url")(e.target.value)} placeholder="instagram.com/yourname" className={input} />
        </label>
      </div>

      <fieldset className="mt-6">
        <legend className={label}>Your expertise</legend>
        <Chips label="Your expertise" options={EXPERTISE} value={v.expertise} onChange={set("expertise") as (x: string[]) => void} />
      </fieldset>
      <fieldset className="mt-6">
        <legend className={label}>Languages you consult in</legend>
        <Chips label="Languages" options={LANGUAGES} value={v.languages} onChange={set("languages") as (x: string[]) => void} />
      </fieldset>
      <label className="mt-6 block">
        <span className={label}>A few lines about you</span>
        <textarea
          value={v.bio}
          onChange={(e) => set("bio")(e.target.value)}
          maxLength={600}
          rows={4}
          placeholder="Your style, the clients you love working with, anything that makes you you."
          className="mt-1.5 block w-full border border-taupe bg-white px-3 py-2 text-base"
        />
      </label>

      {error && (
        <p role="alert" className="mt-5 text-base text-[#a3182c]">
          {error}
        </p>
      )}
      {saved && <p className="mt-5 text-base text-chocolate">Profile saved.</p>}
      <button type="submit" disabled={busy} className="btn-primary mt-6 rounded-lg text-base disabled:opacity-70">
        {busy && <Loader2 size={16} className="animate-spin" aria-hidden />} Save profile
      </button>
    </form>
  );
}
