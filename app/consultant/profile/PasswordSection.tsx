"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const errors: Record<string, string> = {
  short_password: "Please choose a password of at least 8 characters.",
  bad_password: "That password is too long.",
  wrong_current: "Your current password isn't right.",
  unauthorized: "Your sign-in has expired. Please refresh and sign in again.",
};

export default function PasswordSection({ hasPassword, highlight }: { hasPassword: boolean; highlight: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/consultant/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current, password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "save_failed");
      setDone(true);
      setCurrent("");
      setPassword("");
      setConfirm("");
      router.refresh();
    } catch (err) {
      setError(errors[(err as Error).message] || "Could not save your password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-1.5 block min-h-12 w-full border border-taupe bg-white px-3 text-base";
  return (
    <form onSubmit={save} className={`border bg-ivory p-5 sm:p-7 ${highlight ? "border-chocolate/50" : "border-taupe/60"}`}>
      <h2 className="font-serif text-2xl font-medium text-charcoal">{hasPassword ? "Change your password" : "Set a password"}</h2>
      <p className="mt-1 text-base text-muted">
        {hasPassword ? "You can always reset it with Forgot password on the sign-in page." : "Then you can sign in with your email and password, without waiting for a code."}
      </p>
      <div className={`mt-5 grid gap-4 ${hasPassword ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {hasPassword && (
          <label className="block">
            <span className="text-base font-medium text-charcoal">Current password</span>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required className={input} />
          </label>
        )}
        <label className="block">
          <span className="text-base font-medium text-charcoal">New password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required className={input} />
        </label>
        <label className="block">
          <span className="text-base font-medium text-charcoal">Type it again</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={8} required className={input} />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-base text-[#a3182c]">
          {error}
        </p>
      )}
      {done && <p className="mt-4 text-base text-chocolate">Password saved.</p>}
      <button type="submit" disabled={busy} className="btn-primary mt-5 rounded-lg text-base disabled:opacity-70">
        {busy && <Loader2 size={16} className="animate-spin" aria-hidden />} Save password
      </button>
    </form>
  );
}
