"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "nazaakat_admin";

// The cookie holds a value derived from ADMIN_PASSWORD, so changing the password signs everyone out.
function sessionValue() {
  return createHmac("sha256", process.env.ADMIN_PASSWORD || "").update("nazaakat-admin-session").digest("hex");
}

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function isSignedIn() {
  // Read the cookie first: this also makes the page render per request, never at build time.
  const value = (await cookies()).get(COOKIE)?.value || "";
  return Boolean(process.env.ADMIN_PASSWORD) && same(value, sessionValue());
}

export async function signIn(_prev: { error: string } | null, form: FormData) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return { error: "ADMIN_PASSWORD is not set in Vercel yet." };

  if (!same(String(form.get("password") || ""), password)) {
    await new Promise((r) => setTimeout(r, 1000)); // slow down guessing
    return { error: "That password is not right. Please try again." };
  }

  (await cookies()).set(COOKIE, sessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 60 * 60 * 24 * 30, // 30 days on this device
  });
  redirect("/admin");
}

export async function signOut() {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
  redirect("/admin");
}
