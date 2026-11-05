// Creates a test consultation room and prints the customer and consultant links.
// Usage: node scripts/consultation-link.mjs <MEETING_ROOM_SECRET> <site URL>
// Example: node scripts/consultation-link.mjs my-secret https://nazaakat.vercel.app
import { createHmac, randomUUID } from "node:crypto";

const [secret, site = "http://localhost:3000"] = process.argv.slice(2);
if (!secret) {
  console.error("Usage: node scripts/consultation-link.mjs <MEETING_ROOM_SECRET> <site URL>");
  process.exit(1);
}

const hmac = (v) => createHmac("sha256", secret).update(v).digest("hex");
const id = hmac(`booking:test-${randomUUID()}`).slice(0, 12);
const room = `nazaakat-${id}${hmac(`room:${id}`).slice(0, 12)}`;
const base = `${site.replace(/\/$/, "")}/consultation/${room}`;

console.log(`\nCustomer link:   ${base}`);
console.log(`Consultant link: ${base}?host=${hmac(`host:${room}`).slice(0, 32)}\n`);
