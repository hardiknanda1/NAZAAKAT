import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getConsultant, type Consultant } from "./supabase";

// Consultant sign-in: a one-time code emailed to an address the admin added, then a signed cookie.
// Server only.

export const CONSULTANT_COOKIE = "nazaakat_consultant";
const SESSION_DAYS = 30;

// Signing key for codes and sessions. Changing it signs every consultant out.
const secret = () => (process.env.MEETING_ROOM_SECRET || process.env.ADMIN_PASSWORD || "").trim();
export const authConfigured = () => Boolean(secret());

const hmac = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
export const hashCode = (consultantId: string, code: string) => hmac(`code:${consultantId}:${code}`);
export const codeMatches = (consultantId: string, code: string, hash: string) => same(hashCode(consultantId, code), hash);

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
