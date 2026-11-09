import { connection } from "next/server";
import { notifyConfigured, notifyEmails } from "@/lib/notify";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Quick check of the booking-notification setup (no secrets): open /api/notify/status in a browser.
export async function GET() {
  await connection(); // read env vars fresh on every request, never bake them in at build time
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const emails = notifyEmails();
  const problems: string[] = [];

  if (!apiKey) problems.push("RESEND_API_KEY is not set. Notifications are off until it is.");
  for (const e of emails) if (!EMAIL.test(e)) problems.push(`"${e}" in NOTIFY_EMAIL does not look like an email address.`);

  let keyWorks: boolean | null = null;
  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      });
      keyWorks = res.status !== 401 && res.status !== 403;
      if (!keyWorks) problems.push("RESEND_API_KEY was rejected by Resend. Check it was copied in full.");
    } catch {
      problems.push("Could not reach Resend to check RESEND_API_KEY.");
    }
  }

  return Response.json(
    {
      configured: notifyConfigured(),
      status: notifyConfigured() ? (problems.length ? "settings need fixing" : "ready") : "not set up (bookings still work; you just won't be emailed)",
      problems,
      keyWorks,
      sendsTo: emails,
      usingSandboxSender: !(process.env.NOTIFY_FROM_EMAIL || "").trim(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
