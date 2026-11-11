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
  wrong_code: "That code isn't right, or it has expired. Check it, or ask for a new one.",
  wrong_login: "That email and password don't match. Try again, or use Forgot password.",
  locked: "Too many wrong passwords. Please wait 15 minutes, or use Forgot password.",
  short_password: "Please choose a password of at least 8 characters.",
  bad_password: "That password is too long.",
  email_not_configured: "Sign-in emails aren't set up yet. Please contact the NAZAAKAT team.",
  not_configured: "Sign-in isn't set up yet. Please contact the NAZAAKAT team.",
  send_failed: "We couldn't send the code just now. Please try again in a moment.",
  email_domain:
    "We can't email codes to this address yet: the site's email service is still in test mode. Ask the NAZAAKAT team for a one-time code instead.",
  not_ready: "Consultant sign-in isn't set up yet (the database needs updating). Please ask the NAZAAKAT team.",
  verify_failed: "We couldn't check that just now. Please try again.",
};
const message = (code: string) => errors[code] || "Something went wrong. Please try again.";

async function post(url: string, body: object) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "send_failed");
  return data;
}

type Mode = "password" | "signup" | "code" | "forgot" | "reset";

const input = "mt-1.5 block min-h-13 w-full border border-taupe bg-white px-4 text-lg";

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="text-base font-medium text-charcoal">{props.label}</span>
      {props.children}
    </label>
  );
}

export default function ConsultantLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function go(next: Mode, note = "") {
    setMode(next);
    setError("");
    setNotice(note);
    setCode("");
    setPassword("");
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(message((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (mode === "password") {
        await post("/api/consultant/login", { email, password });
        router.refresh();
      } else if (mode === "signup") {
        await post("/api/consultant/code", { name, email, phone });
        go("code", `We sent a 6-digit code to ${email}. It works for 10 minutes.`);
      } else if (mode === "code") {
        const data = await post("/api/consultant/verify", { email, code });
        if (data.needsPassword) router.push("/consultant/profile?welcome=1");
        else router.refresh();
      } else if (mode === "forgot") {
        await post("/api/consultant/code", { email, purpose: "reset" });
        go("reset", `If ${email} has an account, a reset code is on its way. It works for 10 minutes.`);
      } else {
        await post("/api/consultant/reset", { email, code, password });
        router.refresh();
      }
    });
  };

  const titles: Record<Mode, string> = {
    password: "Consultant sign-in",
    signup: "Join as a consultant",
    code: "Enter your code",
    forgot: "Forgot your password?",
    reset: "Set a new password",
  };
  const button: Record<Mode, string> = {
    password: "Sign in",
    signup: "Email me a code",
    code: "Sign in",
    forgot: "Email me a reset code",
    reset: "Save password and sign in",
  };

  return (
    <div className="container-x max-w-md py-16">
      <h1 className="font-serif text-4xl font-medium text-charcoal">{titles[mode]}</h1>
      {mode === "signup" && <p className="mt-3 text-lg text-muted">Tell us who you are and we&apos;ll email you a 6-digit code to confirm your email.</p>}
      {mode === "forgot" && <p className="mt-3 text-lg text-muted">Enter your email and we&apos;ll send a code. You&apos;ll set the new password on the next screen.</p>}
      {notice && <p className="mt-3 text-lg text-muted">{notice}</p>}

      <form onSubmit={submit} className="mt-6">
        {mode === "signup" && (
          <Field label="Your name">
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required className={input} />
          </Field>
        )}
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            readOnly={mode === "code" || mode === "reset"}
            className={`${input} read-only:bg-beige/50`}
          />
        </Field>
        {mode === "signup" && (
          <Field label="Phone number">
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+91 98765 43210" required className={input} />
          </Field>
        )}
        {(mode === "code" || mode === "reset") && (
          <Field label="6-digit code">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              autoFocus
              className={`${input} tracking-[0.3em]`}
            />
          </Field>
        )}
        {(mode === "password" || mode === "reset") && (
          <Field label={mode === "reset" ? "New password (at least 8 characters)" : "Password"}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "reset" ? "new-password" : "current-password"}
              minLength={mode === "reset" ? 8 : undefined}
              required
              className={input}
            />
          </Field>
        )}

        <button type="submit" disabled={busy} className="btn-primary mt-6 w-full text-lg disabled:opacity-70">
          {busy && <Loader2 size={18} className="animate-spin" aria-hidden />} {button[mode]}
        </button>
      </form>

      <div aria-live="assertive">
        {error && (
          <p role="alert" className="mt-4 text-base text-[#a3182c]">
            {error}
          </p>
        )}
      </div>

      <div className="mt-8 space-y-3 border-t border-taupe/40 pt-6 text-base">
        {mode === "password" && (
          <>
            <button type="button" onClick={() => go("forgot")} className="block text-chocolate underline underline-offset-4">
              Forgot password?
            </button>
            <p className="text-muted">
              New here?{" "}
              <button type="button" onClick={() => go("signup")} className="text-chocolate underline underline-offset-4">
                Join as a consultant
              </button>
            </p>
          </>
        )}
        {mode !== "password" && (
          <button type="button" onClick={() => go("password")} className="block text-chocolate underline underline-offset-4">
            Sign in with your password
          </button>
        )}
        {mode !== "code" && mode !== "reset" && (
          <button type="button" onClick={() => go("code")} className="block text-muted underline underline-offset-4 hover:text-chocolate">
            I have a code from the NAZAAKAT team
          </button>
        )}
      </div>
    </div>
  );
}
