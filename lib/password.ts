import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Consultant passwords, hashed with scrypt and a random salt. Server only.

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
export const MIN_PASSWORD = 8;

export function passwordProblem(pw: unknown): string | null {
  const s = typeof pw === "string" ? pw : "";
  if (s.length < MIN_PASSWORD) return "short_password";
  if (s.length > 200) return "bad_password";
  return null;
}

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function checkPassword(pw: string, stored: string | null) {
  const [kind, saltHex, hashHex] = (stored || "").split("$");
  if (kind !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(pw, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}
