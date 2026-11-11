"use client";

import { Eye, EyeOff, Loader2, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const errors: Record<string, string> = {
  need_name: "Please enter your name.",
  need_email: "Please enter a valid email address.",
  need_phone: "Please enter a valid phone number.",
  paused: "This consultant account is paused. Please contact the NAZAAKAT team.",
  too_many: "Too many sign-ups from this network. Please try again in an hour.",
  wrong_login: "That email and password don't match. Try again, or use Forgot password.",
  locked: "Too many wrong passwords. Please wait 15 minutes, or use Forgot password.",
  short_password: "Please choose a password of at least 8 characters.",
  bad_password: "That password is too long.",
  mismatch: "The two passwords don't match.",
  already_registered: "This email already has an account. Sign in with your password, or use Forgot password.",
  not_configured: "Sign-in isn't set up yet. Please contact the NAZAAKAT team.",
  not_ready: "Consultant sign-in isn't set up yet (the database needs updating). Please ask the NAZAAKAT team.",
};
const message = (code: string) => errors[code] || "Something went wrong. Please try again.";

async function post(url: string, body: object) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "failed");
  return data;
}

type Mode = "password" | "signup" | "forgot";

const input = "mt-1.5 block min-h-13 w-full border border-taupe bg-white px-4 text-lg";

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="text-base font-medium text-charcoal">{props.label}</span>
      {props.children}
    </label>
  );
}

export default function ConsultantLogin({ whatsapp, email: teamEmail }: { whatsapp: string; email: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function go(next: Mode) {
    setMode(next);
    setError("");
    setPassword("");
    setConfirm("");
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "signup" && password !== confirm) return setError(message("mismatch"));
    setBusy(true);
    try {
      if (mode === "password") {
        await post("/api/consultant/login", { email, password });
        router.refresh();
      } else {
        await post("/api/consultant/signup", { name, email, phone, password });
        router.push("/consultant/profile?welcome=1");
      }
    } catch (err) {
      setError(message((err as Error).message));
      setBusy(false);
    }
  };

  const titles: Record<Mode, string> = { password: "Consultant sign-in", signup: "Join as a consultant", forgot: "Forgot your password?" };
  const passwordInput = (value: string, set: (v: string) => void, auto: string) => (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => set(e.target.value)}
        autoComplete={auto}
        minLength={mode === "signup" ? 8 : undefined}
        required
        className={`${input} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-2 grid h-10 w-10 -translate-y-1/2 place-items-center text-muted hover:text-chocolate"
      >
        {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  );

  return (
    <div className="container-x max-w-md py-16">
      <h1 className="font-serif text-4xl font-medium text-charcoal">{titles[mode]}</h1>

      {mode === "forgot" ? (
        <div className="mt-4 space-y-4 text-lg text-muted">
          <p>
            Message the NAZAAKAT team from the phone number on your account. They&apos;ll send you a temporary password, which you can
            change on your profile page once you&apos;re signed in.
          </p>
          <div className="flex flex-wrap gap-3">
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn-primary min-h-12 px-5 text-base">
                <MessageCircle size={17} aria-hidden /> Message on WhatsApp
              </a>
            )}
            {teamEmail && (
              <a href={`mailto:${teamEmail}?subject=${encodeURIComponent("Consultant password reset")}`} className="btn-secondary min-h-12 px-5 text-base">
                Email {teamEmail}
              </a>
            )}
          </div>
        </div>
      ) : (
        <>
          {mode === "signup" && <p className="mt-3 text-lg text-muted">Tell us who you are and choose a password. You&apos;ll use it to sign in from now on.</p>}
          <form onSubmit={submit} className="mt-6">
            {mode === "signup" && (
              <Field label="Your name">
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required className={input} />
              </Field>
            )}
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required className={input} />
            </Field>
            {mode === "signup" && (
              <Field label="Phone number">
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+91 98765 43210" required className={input} />
              </Field>
            )}
            <Field label={mode === "signup" ? "Choose a password (at least 8 characters)" : "Password"}>
              {passwordInput(password, setPassword, mode === "signup" ? "new-password" : "current-password")}
            </Field>
            {mode === "signup" && <Field label="Type the password again">{passwordInput(confirm, setConfirm, "new-password")}</Field>}

            <button type="submit" disabled={busy} className="btn-primary mt-6 w-full text-lg disabled:opacity-70">
              {busy && <Loader2 size={18} className="animate-spin" aria-hidden />} {mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>
        </>
      )}

      <div aria-live="assertive">
        {error && (
          <p role="alert" className="mt-4 text-base text-[#a3182c]">
            {error}
          </p>
        )}
      </div>

      <div className="mt-8 space-y-3 border-t border-taupe/40 pt-6 text-base">
        {mode === "password" ? (
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
        ) : (
          <button type="button" onClick={() => go("password")} className="block text-chocolate underline underline-offset-4">
            {mode === "signup" ? "Already joined? Sign in" : "Back to sign-in"}
          </button>
        )}
      </div>
    </div>
  );
}
