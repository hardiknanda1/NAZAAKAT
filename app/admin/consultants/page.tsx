import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { site } from "@/lib/site";
import { listConsultants, supabaseConfigured, type Consultant } from "@/lib/supabase";
import CopyButton from "../CopyButton";
import AddConsultantForm from "./AddConsultantForm";
import { removeConsultantAction, setActiveAction } from "./actions";

export const metadata: Metadata = { title: "Consultants | NAZAAKAT", robots: { index: false, follow: false } };

async function List() {
  await connection();
  if (!supabaseConfigured()) return <p className="text-lg text-muted">Supabase is not set up yet.</p>;
  let consultants: Consultant[];
  try {
    consultants = await listConsultants();
  } catch (err) {
    console.error("[admin/consultants] Could not load consultants.", err);
    return <p role="alert" className="text-lg text-chocolate">Could not load consultants. Run the current supabase/schema.sql, then refresh.</p>;
  }
  if (consultants.length === 0) return <p className="text-lg text-muted">No consultants added yet.</p>;
  return (
    <ul className="divide-y divide-taupe/40 border-y border-taupe/40">
      {consultants.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-lg font-medium text-charcoal">
              {c.name} {!c.active && <span className="ml-2 rounded-full bg-beige px-2.5 py-0.5 text-xs font-medium text-muted">Paused</span>}
            </p>
            <p className="text-base text-muted">
              {c.email}
              {c.phone ? ` · +${c.phone}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={setActiveAction}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="active" value={String(!c.active)} />
              <button type="submit" className="btn-secondary min-h-10 px-4 text-sm">
                {c.active ? "Pause" : "Allow again"}
              </button>
            </form>
            <form action={removeConsultantAction}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className="min-h-10 px-3 text-sm text-muted underline underline-offset-4 hover:text-[#a3182c]">
                Remove
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ConsultantsPage() {
  const loginUrl = `${site.url.replace(/\/$/, "")}/consultant`;
  return (
    <div className="container-x max-w-4xl py-12">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-base text-muted hover:text-chocolate">
        <ArrowLeft size={16} aria-hidden /> Bookings
      </Link>
      <h1 className="mt-4 font-serif text-5xl font-medium text-charcoal">Consultants</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        Consultants sign in at <strong className="font-medium text-charcoal">{loginUrl}</strong> with a code emailed to them, ask to take
        open bookings, and see the consultant link once you accept. Pausing someone signs them out at once.
      </p>
      <div className="mt-4">
        <CopyButton text={loginUrl} label="Copy sign-in link" />
      </div>
      <div className="mt-10">
        <AddConsultantForm />
      </div>
      <div className="mt-10">
        <Suspense fallback={<p className="text-lg text-muted">Loading…</p>}>
          <List />
        </Suspense>
      </div>
    </div>
  );
}
