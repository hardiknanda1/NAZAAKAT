import { normalisePhone } from "@/lib/phone";
import { notifyNewBooking } from "@/lib/notify";
import { createBooking, getDiscount, supabaseConfigured, redeemDiscount } from "@/lib/supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Books a slot: claims it atomically so two people can never take the same time.
export async function POST(request: Request) {
  if (!supabaseConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });

  let body: { slotId?: string; name?: string; whatsapp?: string; discountId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const slotId = String(body.slotId || "");
  const name = String(body.name || "").trim().slice(0, 120);
  const whatsapp = normalisePhone(body.whatsapp);
  const discountId = body.discountId ? String(body.discountId) : null;
  if (!UUID.test(slotId)) return Response.json({ error: "bad_slot" }, { status: 400 });
  if (!name) return Response.json({ error: "need_name" }, { status: 400 });
  if (!whatsapp) return Response.json({ error: "need_whatsapp" }, { status: 400 });
  if (discountId && !UUID.test(discountId)) return Response.json({ error: "discount_invalid" }, { status: 400 });

  try {
    // A body-shape discount only applies to the number it was verified with, and only once.
    if (discountId) {
      const discount = await getDiscount(discountId);
      if (!discount || discount.booking_id || discount.phone !== whatsapp) return Response.json({ error: "discount_invalid" }, { status: 409 });
    }

    const booking = await createBooking(slotId, name, whatsapp);
    if (!booking) return Response.json({ error: "slot_taken" }, { status: 409 });
    if (discountId) booking.discount_percent = await redeemDiscount(discountId, whatsapp, booking.id);

    await notifyNewBooking(booking); // best-effort; never blocks or fails the booking itself
    return Response.json({ ok: true, bookingId: booking.id, startsAt: booking.starts_at, discountPercent: booking.discount_percent });
  } catch (err) {
    console.error("[book] Could not create the booking.", err);
    return Response.json({ error: "save_failed" }, { status: 502 });
  }
}
