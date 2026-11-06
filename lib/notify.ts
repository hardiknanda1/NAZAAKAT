import { formatWhen } from "./time";
import { site } from "./site";
import type { BookingRow } from "./supabase";

// Emails the site owner when a booking comes in, via Resend (https://resend.com), a
// transactional email service: a plain REST call, no SDK. Entirely optional and best-effort:
// a failure here is logged and never blocks or fails the booking itself.

export function notifyConfigured() {
  return Boolean((process.env.RESEND_API_KEY || "").trim() && (process.env.NOTIFY_EMAIL || "").trim());
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

  const to = (process.env.NOTIFY_EMAIL || "").trim();
  const when = formatWhen(booking.starts_at);
  const adminUrl = `${site.url.replace(/\/$/, "")}/admin`;

  const html = `
    <p>A new consultation was just booked.</p>
    <p>
      <strong>${escapeHtml(booking.name)}</strong><br>
      ${escapeHtml(when)} IST<br>
      WhatsApp: +${escapeHtml(booking.whatsapp)}
    </p>
    <p><a href="${adminUrl}">Open the bookings page</a> to send the client their meeting link.</p>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [to],
        subject: `New booking: ${booking.name}, ${when}`,
        html,
        text: `${booking.name}\n${when} IST\nWhatsApp: +${booking.whatsapp}\n\nOpen the bookings page: ${adminUrl}`,
      }),
    });
    if (!res.ok) {
      console.error(`[notify] Resend rejected the email (${res.status}): ${await res.text()}`);
    }
  } catch (err) {
    console.error("[notify] Could not reach Resend to send the booking email.", err);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
