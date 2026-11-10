import { randomUUID } from "node:crypto";
import { readIntake, photoExtension } from "@/lib/intakeForm";
import { normalisePhone } from "@/lib/phone";
import { notifyNewBooking } from "@/lib/notify";
import {
  cancelBooking,
  createBooking,
  deletePhotos,
  redeemDiscount,
  saveIntake,
  supabaseConfigured,
  unusedDiscountForPhone,
  uploadPhoto,
} from "@/lib/supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Books a slot together with the client's photos and questionnaire, in one request: a booking is only
// ever kept once its photos and answers are saved, so there is no way to book without them.
export async function POST(request: Request) {
  if (!supabaseConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    // Not a form with photos (e.g. a bare JSON request trying to skip the questionnaire), or too large.
    return Response.json({ error: "no_photos" }, { status: 400 });
  }

  const slotId = String(form.get("slotId") || "");
  const name = String(form.get("name") || "").trim().slice(0, 120);
  const whatsapp = normalisePhone(String(form.get("whatsapp") || ""));
  if (!UUID.test(slotId)) return Response.json({ error: "bad_slot" }, { status: 400 });
  if (!name) return Response.json({ error: "need_name" }, { status: 400 });
  if (!whatsapp) return Response.json({ error: "need_whatsapp" }, { status: 400 });

  const intake = readIntake(form);
  if (!intake.ok) return Response.json({ error: intake.error }, { status: intake.status });

  let booking;
  try {
    booking = await createBooking(slotId, name, whatsapp);
  } catch (err) {
    console.error("[book] Could not create the booking.", err);
    return Response.json({ error: "save_failed" }, { status: 502 });
  }
  if (!booking) return Response.json({ error: "slot_taken" }, { status: 409 });

  const folder = randomUUID();
  const paths: string[] = [];
  try {
    for (const [i, photo] of intake.value.photos.entries()) {
      const path = `${folder}/${i + 1}.${photoExtension(photo.type)}`;
      await uploadPhoto(path, await photo.arrayBuffer(), photo.type);
      paths.push(path);
    }
    await saveIntake({ booking_id: booking.id, name, whatsapp, answers: intake.value.answers, photos: paths });
  } catch (err) {
    console.error("[book] Could not save the photos and answers, so the booking was undone.", err);
    await deletePhotos(paths).catch(() => {});
    await cancelBooking(booking.id, booking.slot_id).catch((e) => console.error("[book] Could not undo the booking.", e));
    return Response.json({ error: "save_failed" }, { status: 502 });
  }

  // A body-shape discount saved to this WhatsApp number is applied automatically, once.
  try {
    const discount = await unusedDiscountForPhone(whatsapp);
    if (discount) booking.discount_percent = await redeemDiscount(discount.id, whatsapp, booking.id);
  } catch (err) {
    console.error("[book] Booked, but could not apply the discount.", err);
  }

  await notifyNewBooking(booking); // best-effort; never blocks or fails the booking itself
  return Response.json({ ok: true, bookingId: booking.id, startsAt: booking.starts_at, discountPercent: booking.discount_percent });
}
