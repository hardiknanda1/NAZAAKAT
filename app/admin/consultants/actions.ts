"use server";

import { refresh } from "next/cache";
import { isSignedIn } from "@/app/admin/actions";
import { normaliseEmail } from "@/lib/consultantAuth";
import { normalisePhone } from "@/lib/phone";
import { acceptRequest, addConsultant, declineRequest, deleteConsultant, setConsultantActive, unassignBooking } from "@/lib/supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id = (form: FormData) => {
  const v = String(form.get("id") || "");
  return UUID.test(v) ? v : null;
};

export async function addConsultantAction(_prev: { error: string; ok?: boolean } | null, form: FormData) {
  if (!(await isSignedIn())) return { error: "Your sign-in has expired. Please refresh and sign in again." };
  const name = String(form.get("name") || "").trim().slice(0, 120);
  const email = normaliseEmail(form.get("email"));
  const phoneRaw = String(form.get("phone") || "").trim();
  const phone = phoneRaw ? normalisePhone(phoneRaw) : null;
  if (!name) return { error: "Please enter a name." };
  if (!email) return { error: "Please enter a valid email address." };
  if (phoneRaw && !phone) return { error: "Please enter a valid phone number, or leave it empty." };
  try {
    if (!(await addConsultant({ name, email, phone }))) return { error: "A consultant with this email is already on the list." };
  } catch (err) {
    console.error("[admin/consultants] Could not add a consultant.", err);
    return { error: "Could not save just now. Check that supabase/schema.sql has been run, then try again." };
  }
  refresh();
  return { error: "", ok: true };
}

export async function setActiveAction(form: FormData) {
  const c = id(form);
  if (!(await isSignedIn()) || !c) return;
  await setConsultantActive(c, form.get("active") === "true");
  refresh();
}

export async function removeConsultantAction(form: FormData) {
  const c = id(form);
  if (!(await isSignedIn()) || !c) return;
  await deleteConsultant(c);
  refresh();
}

export async function acceptRequestAction(form: FormData) {
  const r = id(form);
  if (!(await isSignedIn()) || !r) return;
  await acceptRequest(r);
  refresh();
}

export async function declineRequestAction(form: FormData) {
  const r = id(form);
  if (!(await isSignedIn()) || !r) return;
  await declineRequest(r);
  refresh();
}

export async function unassignAction(form: FormData) {
  const b = id(form);
  if (!(await isSignedIn()) || !b) return;
  await unassignBooking(b);
  refresh();
}
