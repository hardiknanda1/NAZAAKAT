"use client";

import { KeyRound, MessageCircle } from "lucide-react";
import { useActionState } from "react";
import CopyButton from "../CopyButton";
import { tempPasswordAction } from "./actions";

/** Shows a temporary password once, with a WhatsApp message ready to send. */
export function PasswordBox({ name, email, phone, password, loginUrl }: { name: string; email: string; phone: string | null; password: string; loginUrl: string }) {
  const text = `Hi ${name.split(" ")[0]}, your NAZAAKAT consultant sign-in: open ${loginUrl}, enter ${email} and the password ${password}. Then go to "Your profile" and change it to one of your own.`;
  return (
    <div className="mt-3 border border-chocolate/30 bg-beige/50 p-3">
      <p className="text-sm text-muted">Temporary password, shown only now. It works until they change it.</p>
      <p className="mt-1 font-mono text-2xl tracking-[0.15em] text-charcoal">{password}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {phone && (
          <a href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="btn-primary min-h-10 px-4 text-sm">
            <MessageCircle size={15} aria-hidden /> Send on WhatsApp
          </a>
        )}
        <CopyButton text={text} label="Copy message" />
      </div>
    </div>
  );
}

/** For a consultant who forgot their password: sets a new temporary one. */
export default function TempPassword({ id, name, email, phone, loginUrl }: { id: string; name: string; email: string; phone: string | null; loginUrl: string }) {
  const [state, action, pending] = useActionState(tempPasswordAction, null);
  return (
    <div>
      <form
        action={action}
        onSubmit={(e) => {
          if (!confirm(`Set a new temporary password for ${name}? Their current password will stop working.`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={pending} className="btn-secondary min-h-10 px-4 text-sm disabled:opacity-70">
          <KeyRound size={15} aria-hidden /> {pending ? "Setting…" : "Reset password"}
        </button>
      </form>
      {state?.error && <p className="mt-2 text-sm text-[#a3182c]">{state.error}</p>}
      {state?.password && <PasswordBox name={name} email={email} phone={phone} password={state.password} loginUrl={loginUrl} />}
    </div>
  );
}
