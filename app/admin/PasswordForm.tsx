"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export default function PasswordForm() {
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <form action={action} className="max-w-md">
      <label htmlFor="password" className="block text-lg font-medium text-charcoal">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoFocus
        autoComplete="current-password"
        className="mt-2 block min-h-14 w-full border border-taupe bg-white px-4 text-lg text-charcoal"
      />
      <button type="submit" disabled={pending} className="btn-primary mt-5 w-full text-lg disabled:opacity-60">
        {pending ? "Checking…" : "Open bookings"}
      </button>
      {state?.error && (
        <p role="alert" className="mt-4 text-lg text-chocolate">
          {state.error}
        </p>
      )}
    </form>
  );
}
