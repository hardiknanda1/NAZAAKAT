"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const errors: Record<string, string> = {
  need_name: "Please enter your name.",
  need_email: "Please enter a valid email address.",
  need_phone: "Please enter a valid phone number.",
  paused: "This consultant account is paused. Please contact the NAZAAKAT team.",
  wait: "A code was just sent. Please wait a minute before asking for another.",
  too_many: "Too many codes asked for. Please try again in an hour.",
  wrong_code: "That code isn't right, or it has expired. Check it, or send a new one.",
  email_not_configured: "Sign-in emails aren't set up yet. Please contact the NAZAAKAT team.",
  not_configured: "Sign-in isn't set up yet. Please contact the NAZAAKAT team.",
  send_failed: "We couldn't send the code just now. Please try again in a moment.",
  verify_failed: "We couldn't check the code just now. Please try again.",
};
const message = (code: string) => errors[code] || "Something went wrong. Please try again.";

async function post(url: string, body: object) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "send_failed");
}

export default function ConsultantLogin() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("/api/consultant/code", { name, email, phone });
      setSent(true);
      setCode("");
    } catch (err) {
      setError(message((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("/api/consultant/verify", { email, code });
      router.refresh();
    } catch (err) {
      setError(message((err as Error).message));
      setBusy(false);
    }
  }

  return (
    <div className="container-x max-w-md py-16">
      <h1 className="font-serif text-4xl font-medium text-charcoal">Consultant sign-in</h1>
      {!sent ? (
        <form onSubmit={sendCode} className="mt-6">
          <p className="text-lg text-muted">New or returning, enter your details and we&apos;ll email you a 6-digit code. No password needed.</p>
          <label className="mt-6 block">
            <span className="text-base font-medium text-charcoal">Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              className="mt-1.5 block min-h-13 w-full border border-taupe bg-white px-4 text-lg"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-base font-medium text-charcoal">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="mt-1.5 block min-h-13 w-full border border-taupe bg-white px-4 text-lg"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-base font-medium text-charcoal">Phone number</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="+91 98765 43210"
              required
              className="mt-1.5 block min-h-13 w-full border border-taupe bg-white px-4 text-lg"
            />
          </label>
          <button type="submit" disabled={busy} className="btn-primary mt-5 w-full text-lg disabled:opacity-70">
            {busy && <Loader2 size={18} className="animate-spin" aria-hidden />} Email me a code
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6">
          <p className="text-lg text-muted">
            We sent a code to <strong className="font-medium text-charcoal">{email}</strong>. It works for 10 minutes.
          </p>
          <label className="mt-6 block">
            <span className="text-base font-medium text-charcoal">6-digit code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              autoFocus
              className="mt-1.5 block min-h-13 w-full border border-taupe bg-white px-4 text-lg tracking-[0.3em]"
            />
          </label>
          <button type="submit" disabled={busy} className="btn-primary mt-5 w-full text-lg disabled:opacity-70">
            {busy && <Loader2 size={18} className="animate-spin" aria-hidden />} Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setError("");
            }}
            className="mt-4 text-base text-muted underline underline-offset-4 hover:text-chocolate"
          >
            Use a different email or send a new code
          </button>
        </form>
      )}
      <div aria-live="assertive">
        {error && (
          <p role="alert" className="mt-4 text-base text-[#a3182c]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
