import { formatWhen } from "./time";
import { site } from "./site";
import type { BookingRow } from "./supabase";

// Emails the site owner when a booking comes in, via Resend (https://resend.com), a
// transactional email service: a plain REST call, no SDK. Entirely optional and best-effort:
// a failure here is logged and never blocks or fails the booking itself.

// Where the "new booking" email goes. NOTIFY_EMAIL (comma-separated for several) replaces this.
// Until a domain is verified in Resend, it can only be the Resend account's own email.
export const notifyEmails = () =>
  (process.env.NOTIFY_EMAIL || "mynazaakat@gmail.com")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

export function notifyConfigured() {
  return Boolean((process.env.RESEND_API_KEY || "").trim() && notifyEmails().length);
}

/**
 * Resend's sandbox sender (the default here) can only deliver to the email address the
 * RESEND_API_KEY's account was created with. To notify a different address, verify a domain in
 * Resend and set NOTIFY_FROM_EMAIL to an address at that domain.
 */
function fromAddress() {
  return (process.env.NOTIFY_FROM_EMAIL || "").trim() || "NAZAAKAT <onboarding@resend.dev>";
}

export async function notifyNewBooking(booking: BookingRow) {
  if (!notifyConfigured()) return;

  const to = notifyEmails();
  const when = formatWhen(booking.starts_at);
  const adminUrl = `${site.url.replace(/\/$/, "")}/admin`;

  const html = `
    <p>A new consultation was just booked.</p>
    <p>
      <strong>${escapeHtml(booking.name)}</strong><br>
      ${escapeHtml(when)} IST<br>
      WhatsApp: +${escapeHtml(booking.whatsapp)}${booking.discount_percent ? `<br>${booking.discount_percent}% body-shape discount applied` : ""}
    </p>
    <p><a href="${adminUrl}">Open the bookings page</a> to send the client their meeting link.</p>
  `;

  await sendEmail({
    to,
    subject: `New booking: ${booking.name}, ${when}`,
    html,
    text: `${booking.name}\n${when} IST\nWhatsApp: +${booking.whatsapp}${booking.discount_percent ? `\n${booking.discount_percent}% body-shape discount applied` : ""}\n\nOpen the bookings page: ${adminUrl}`,
  });
}

export const emailConfigured = () => Boolean((process.env.RESEND_API_KEY || "").trim());

/** Sends one email through Resend. Returns false (and logs why) instead of throwing. */
export async function sendEmail(mail: { to: string[]; subject: string; html: string; text: string }): Promise<boolean> {
  if (!emailConfigured()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromAddress(), ...mail }),
    });
    if (res.ok) return true;
    console.error(`[notify] Resend rejected the email (${res.status}): ${await res.text()}`);
  } catch (err) {
    console.error("[notify] Could not reach Resend to send an email.", err);
  }
  return false;
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
