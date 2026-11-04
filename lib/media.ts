import { existsSync } from "node:fs";
import path from "node:path";

// Returns the first file (relative to /public) that exists, or null.
// Lets the real logo and photographs be dropped into /public without code changes.
export function findPublicFile(...candidates: string[]): string | null {
  for (const file of candidates) {
    if (existsSync(path.join(process.cwd(), "public", file))) return `/${file}`;
  }
  return null;
}
