"use client";

import { useActionState } from "react";
import { addConsultantAction } from "./actions";

export default function AddConsultantForm() {
  const [state, action, pending] = useActionState(addConsultantAction, null);
  return (
    <form action={action} key={state?.ok ? "reset" : "form"} className="border border-taupe/60 bg-ivory p-5 sm:p-7">
      <h2 className="font-serif text-2xl font-medium text-charcoal">Add a consultant</h2>
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
      {state?.ok && <p className="mt-4 text-base text-chocolate">Added. They can now sign in at /consultant with that email.</p>}
      <button type="submit" disabled={pending} className="btn-primary mt-5 rounded-lg text-base disabled:opacity-70">
        {pending ? "Adding…" : "Add consultant"}
      </button>
    </form>
  );
}
