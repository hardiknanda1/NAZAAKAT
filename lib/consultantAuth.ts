import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getConsultant, type Consultant } from "./supabase";

// Consultant sign-in: email and password, then a signed cookie.
// Server only.

export const CONSULTANT_COOKIE = "nazaakat_consultant";
const SESSION_DAYS = 30;

// Signing key for sessions. Changing it signs every consultant out.
const secret = () => (process.env.MEETING_ROOM_SECRET || process.env.ADMIN_PASSWORD || "").trim();
export const authConfigured = () => Boolean(secret());

const hmac = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** A keyed hash of the visitor's IP address, used only to rate-limit sign-ups. */
export function ipHash(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  return hmac(`consultant-ip:${ip}`).slice(0, 32);
}

// Easy to read out or type: no 0/O, 1/l/I. About 50 bits, and it only works until they change it.
const TEMP_LETTERS = "abcdefghjkmnpqrstuvwxyz23456789";
/** A temporary password the admin gives a consultant who forgot theirs, e.g. "k7mq-4trx-p9wh". */
export const tempPassword = () =>
  Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => TEMP_LETTERS[randomInt(TEMP_LETTERS.length)]).join("")).join("-");

export const normaliseEmail = (raw: unknown) => {
  const email = String(raw || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200 ? email : null;
};

/** Signs the consultant in on this device. */
export async function startSession(consultantId: string) {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const value = `${consultantId}.${expires}.${hmac(`session:${consultantId}:${expires}`)}`;
  (await cookies()).set(CONSULTANT_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession() {
  (await cookies()).delete({ name: CONSULTANT_COOKIE, path: "/" });
}

/** The signed-in consultant, or null. A removed or deactivated consultant is signed out at once. */
export async function currentConsultant(): Promise<Consultant | null> {
  const value = (await cookies()).get(CONSULTANT_COOKIE)?.value || "";
  if (!authConfigured()) return null;
  const [id, expires, sig] = value.split(".");
  if (!id || !expires || !sig || Number(expires) < Date.now()) return null;
  if (!same(sig, hmac(`session:${id}:${expires}`))) return null;
  const consultant = await getConsultant(id).catch(() => null);
  return consultant?.active ? consultant : null;
}
