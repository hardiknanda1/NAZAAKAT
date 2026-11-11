"use client";

import { KeyRound, MessageCircle } from "lucide-react";
import { useActionState } from "react";
import CopyButton from "../CopyButton";
import { oneTimeCodeAction } from "./actions";

// Shows a fresh one-time code once, with a WhatsApp message ready to send.
export default function OneTimeCode({ id, name, phone, loginUrl }: { id: string; name: string; phone: string | null; loginUrl: string }) {
  const [state, action, pending] = useActionState(oneTimeCodeAction, null);
  const text = state?.code
    ? `Hi ${name.split(" ")[0]}, your NAZAAKAT consultant code is ${state.code}. Open ${loginUrl}, choose "I have a code from the NAZAAKAT team", and enter your email and this code. It works once, for 24 hours. To set a new password instead, use "Forgot password" and enter this code there.`
    : "";
  return (
    <div>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={pending} className="btn-secondary min-h-10 px-4 text-sm disabled:opacity-70">
          <KeyRound size={15} aria-hidden /> {pending ? "Creating…" : "Give one-time code"}
        </button>
      </form>
      {state?.error && <p className="mt-2 text-sm text-[#a3182c]">{state.error}</p>}
      {state?.code && (
        <div className="mt-3 border border-chocolate/30 bg-beige/50 p-3">
          <p className="text-sm text-muted">Valid once, for 24 hours. Shown only now.</p>
          <p className="mt-1 font-mono text-2xl tracking-[0.3em] text-charcoal">{state.code}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {phone && (
              <a href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="btn-primary min-h-10 px-4 text-sm">
                <MessageCircle size={15} aria-hidden /> Send on WhatsApp
              </a>
            )}
            <CopyButton text={text} label="Copy message" />
          </div>
        </div>
      )}
    </div>
  );
}
