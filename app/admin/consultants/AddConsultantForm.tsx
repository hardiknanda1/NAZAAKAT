"use client";

import { useActionState } from "react";
import { addConsultantAction } from "./actions";
import { PasswordBox } from "./TempPassword";

export default function AddConsultantForm({ loginUrl }: { loginUrl: string }) {
  const [state, action, pending] = useActionState(addConsultantAction, null);
  return (
    <div className="border border-taupe/60 bg-ivory p-5 sm:p-7">
      <form action={action} key={state?.ok ? `done-${state.email}` : "form"}>
        <h2 className="font-serif text-2xl font-medium text-charcoal">Add a consultant</h2>
        <p className="mt-1 text-base text-muted">Optional: they can also sign up themselves. You get a temporary password to send them.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-base font-medium text-charcoal">Name</span>
            <input name="name" required className="mt-1.5 block min-h-12 w-full border border-taupe bg-white px-3 text-base" />
          </label>
          <label className="block">
            <span className="text-base font-medium text-charcoal">Email</span>
            <input name="email" type="email" required className="mt-1.5 block min-h-12 w-full border border-taupe bg-white px-3 text-base" />
          </label>
          <label className="block">
            <span className="text-base font-medium text-charcoal">Phone</span>
            <input name="phone" type="tel" placeholder="+91 98765 43210" className="mt-1.5 block min-h-12 w-full border border-taupe bg-white px-3 text-base" />
          </label>
        </div>
        {state?.error && (
          <p role="alert" className="mt-4 text-base text-[#a3182c]">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn-primary mt-5 rounded-lg text-base disabled:opacity-70">
          {pending ? "Adding…" : "Add consultant"}
        </button>
      </form>
      {state?.ok && state.password && state.name && state.email && (
        <div className="mt-5">
          <p className="text-base text-chocolate">Added {state.name}. Send them their sign-in:</p>
          <PasswordBox name={state.name} email={state.email} phone={state.phone ?? null} password={state.password} loginUrl={loginUrl} />
        </div>
      )}
    </div>
  );
}
