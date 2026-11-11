"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const errors: Record<string, string> = {
  need_email: "Please enter a valid email address.",
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
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("/api/consultant/code", { email });
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
          <p className="text-lg text-muted">Enter the email the NAZAAKAT team added for you. We&apos;ll email you a 6-digit code.</p>
          <label className="mt-6 block">
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
          <button type="submit" disabled={busy} className="btn-primary mt-5 w-full text-lg disabled:opacity-70">
            {busy && <Loader2 size={18} className="animate-spin" aria-hidden />} Email me a code
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6">
          <p className="text-lg text-muted">
            If <strong className="font-medium text-charcoal">{email}</strong> is registered, a code is on its way. It works for 10 minutes.
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
