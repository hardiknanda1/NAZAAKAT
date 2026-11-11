import { currentConsultant } from "@/lib/consultantAuth";
import { escapeHtml, notifyEmails, sendEmail } from "@/lib/notify";
import { site } from "@/lib/site";
import { formatWhen } from "@/lib/time";
import { createRequest, getBooking } from "@/lib/supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A signed-in consultant asks to take an upcoming booking that nobody has been given yet.
export async function POST(request: Request) {
  const consultant = await currentConsultant();
  if (!consultant) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: { bookingId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const bookingId = String(body.bookingId || "");
  if (!UUID.test(bookingId)) return Response.json({ error: "not_found" }, { status: 404 });

  try {
    const booking = await getBooking(bookingId);
    if (!booking || booking.status !== "confirmed" || new Date(booking.starts_at).getTime() < Date.now()) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    if (booking.consultant_id) return Response.json({ error: "taken" }, { status: 409 });
    await createRequest(booking.id, consultant.id);

    // Best-effort heads-up for the admin.
    const when = formatWhen(booking.starts_at);
    const adminUrl = `${site.url.replace(/\/$/, "")}/admin`;
    void sendEmail({
      to: notifyEmails(),
      subject: `${consultant.name} wants to take the ${when} booking`,
      html: `<p><strong>${escapeHtml(consultant.name)}</strong> asked to take the consultation with ${escapeHtml(booking.name)} on ${escapeHtml(when)} IST.</p><p><a href="${adminUrl}">Open the bookings page</a> to accept or decline.</p>`,
      text: `${consultant.name} asked to take the consultation with ${booking.name} on ${when} IST.\n\nAccept or decline: ${adminUrl}`,
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[consultant] Could not save a booking request.", err);
    return Response.json({ error: "save_failed" }, { status: 502 });
  }
}
