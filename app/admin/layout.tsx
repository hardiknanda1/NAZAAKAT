import type { ReactNode } from "react";
import { Suspense } from "react";
import Logo from "@/components/Logo";
import { isSignedIn, signOut } from "./actions";
import PasswordForm from "./PasswordForm";

// Every /admin/* page shares this one password gate. A booking's "consultant info" link
// (/admin/booking/[id]) is under the same path, so it needs the same password, but only
// reveals that one booking once the consultant is signed in.
async function Gate({ children }: { children: ReactNode }) {
  if (!(await isSignedIn())) {
    return (
      <div className="container-x max-w-md py-16">
        <p className="mb-6 text-lg text-muted">Enter the password to continue.</p>
        <PasswordForm />
      </div>
    );
  }
  return (
    <>
      {children}
      <div className="container-x max-w-4xl pb-16">
        <form action={signOut} className="mt-10 border-t border-taupe/40 pt-6">
          <button type="submit" className="text-base text-muted underline underline-offset-4 hover:text-chocolate">
            Sign out on this device
          </button>
        </form>
      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-beige">
        <div className="container-x flex h-24 items-center justify-between">
          <Logo />
          <p className="eyebrow">Admin</p>
        </div>
      </header>
      <main id="main">
        <Suspense fallback={<p className="container-x py-16 text-lg text-muted">Loading…</p>}>
          <Gate>{children}</Gate>
        </Suspense>
      </main>
    </div>
  );
}
