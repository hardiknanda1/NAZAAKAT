"use server";

import { refresh } from "next/cache";
import { isSignedIn } from "@/app/admin/actions";
import { hashCode, newCode, normaliseEmail } from "@/lib/consultantAuth";
import { normalisePhone } from "@/lib/phone";
import {
  acceptRequest,
  addConsultant,
  createCode,
  declineRequest,
  deleteConsultant,
  getConsultant,
  setConsultantActive,
  unassignBooking,
} from "@/lib/supabase";

const ADMIN_CODE_HOURS = 24;

/**
 * A one-time code for a consultant that the admin sends them (e.g. on WhatsApp) instead of email. It
 * signs them in, or lets them set a new password with "Forgot password", for 24 hours.
 */
export async function oneTimeCodeAction(_prev: { code?: string; error?: string } | null, form: FormData) {
  const c = String(form.get("id") || "");
  if (!(await isSignedIn()) || !UUID.test(c)) return { error: "Your sign-in has expired. Please refresh and sign in again." };
  const consultant = await getConsultant(c).catch(() => null);
  if (!consultant) return { error: "This consultant could not be found." };
  if (!consultant.active) return { error: "This consultant is paused. Allow them again first." };
  const code = newCode();
  try {
    await createCode({
      consultant_id: consultant.id,
      code_hash: hashCode(consultant.id, code),
      expires_at: new Date(Date.now() + ADMIN_CODE_HOURS * 3_600_000).toISOString(),
      created_by: "admin",
    });
  } catch (err) {
    console.error("[admin/consultants] Could not create a code.", err);
    return { error: "Could not create a code just now. Please try again." };
  }
  return { code };
}

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
    // Added by the admin, so it counts straight away (they still sign in with an emailed code).
    if (!(await addConsultant({ name, email, phone, verified_at: new Date().toISOString() }))) return { error: "A consultant with this email is already on the list." };
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
