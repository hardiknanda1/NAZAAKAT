"use server";

import { refresh } from "next/cache";
import { isSignedIn } from "@/app/admin/actions";
import { normaliseEmail, tempPassword } from "@/lib/consultantAuth";
import { hashPassword } from "@/lib/password";
import { normalisePhone } from "@/lib/phone";
import {
  acceptRequest,
  addConsultant,
  declineRequest,
  deleteConsultant,
  getConsultant,
  setConsultantActive,
  unassignBooking,
  updateConsultant,
} from "@/lib/supabase";

/**
 * Sets a temporary password for a consultant who forgot theirs (there are no emailed codes). The admin
 * sends it to them, e.g. on WhatsApp; they sign in with it and can change it on their profile page.
 */
export async function tempPasswordAction(_prev: { password?: string; error?: string } | null, form: FormData) {
  const c = String(form.get("id") || "");
  if (!(await isSignedIn()) || !UUID.test(c)) return { error: "Your sign-in has expired. Please refresh and sign in again." };
  const consultant = await getConsultant(c).catch(() => null);
  if (!consultant) return { error: "This consultant could not be found." };
  if (!consultant.active) return { error: "This consultant is paused. Allow them again first." };
  const password = tempPassword();
  try {
    await updateConsultant(consultant.id, { password_hash: await hashPassword(password), failed_logins: 0, locked_until: null });
  } catch (err) {
    console.error("[admin/consultants] Could not set a temporary password.", err);
    return { error: "Could not set a password just now. Please try again." };
  }
  refresh();
  return { password };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id = (form: FormData) => {
  const v = String(form.get("id") || "");
  return UUID.test(v) ? v : null;
};

type Added = { error: string; ok?: boolean; name?: string; phone?: string | null; email?: string; password?: string };

/** Adds a consultant with a temporary password for the admin to send them. */
export async function addConsultantAction(_prev: Added | null, form: FormData): Promise<Added> {
  if (!(await isSignedIn())) return { error: "Your sign-in has expired. Please refresh and sign in again." };
  const name = String(form.get("name") || "").trim().slice(0, 120);
  const email = normaliseEmail(form.get("email"));
  const phoneRaw = String(form.get("phone") || "").trim();
  const phone = phoneRaw ? normalisePhone(phoneRaw) : null;
  if (!name) return { error: "Please enter a name." };
  if (!email) return { error: "Please enter a valid email address." };
  if (phoneRaw && !phone) return { error: "Please enter a valid phone number, or leave it empty." };
  const password = tempPassword();
  try {
    const added = await addConsultant({ name, email, phone, verified_at: new Date().toISOString(), password_hash: await hashPassword(password) });
    if (!added) return { error: "A consultant with this email is already on the list." };
  } catch (err) {
    console.error("[admin/consultants] Could not add a consultant.", err);
    return { error: "Could not save just now. Check that supabase/schema.sql has been run, then try again." };
  }
  refresh();
  return { error: "", ok: true, name, phone, email, password };
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
