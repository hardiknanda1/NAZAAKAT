import { randomUUID } from "node:crypto";
import { normalisePhone } from "@/lib/phone";
import { MAX_PHOTO_BYTES, MAX_PHOTOS, MAX_TOTAL_BYTES, cleanAnswers } from "@/lib/intake";
import { getBooking, saveIntake, supabaseConfigured, uploadPhoto } from "@/lib/supabase";

// Receives the questionnaire and photos a client sends right after booking.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  if (!supabaseConfigured()) {
    console.error("[intake] SUPABASE_URL and SUPABASE_SECRET_KEY must be set.");
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "too_large" }, { status: 413 });
  }

  const bookingId = String(form.get("bookingId") || "");
  if (bookingId && !UUID.test(bookingId)) return Response.json({ error: "bad_booking" }, { status: 400 });

  let answers: Record<string, string | string[]>;
  try {
    answers = cleanAnswers(JSON.parse(String(form.get("answers") || "{}")));
  } catch {
    return Response.json({ error: "bad_answers" }, { status: 400 });
  }

  const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length === 0) return Response.json({ error: "no_photos" }, { status: 400 });
  if (photos.length > MAX_PHOTOS) return Response.json({ error: "too_many_photos" }, { status: 400 });
  if (photos.some((p) => !IMAGE_TYPES.has(p.type) || p.size > MAX_PHOTO_BYTES)) {
    return Response.json({ error: "bad_photo" }, { status: 400 });
  }
  if (photos.reduce((n, p) => n + p.size, 0) > MAX_TOTAL_BYTES) return Response.json({ error: "too_large" }, { status: 413 });

  // Name and number come from the booking when we have one, otherwise from the form.
  let name = String(form.get("name") || "").trim().slice(0, 120);
  let whatsapp = normalisePhone(String(form.get("whatsapp") || ""));
  if (bookingId) {
    const booking = await getBooking(bookingId).catch(() => null);
    if (!booking) return Response.json({ error: "bad_booking" }, { status: 400 });
    name = booking.name || name;
    whatsapp = normalisePhone(booking.whatsapp) ?? whatsapp;
  } else if (!name || !whatsapp) {
    return Response.json({ error: "need_contact" }, { status: 400 });
  }

  const id = randomUUID();
  try {
    const paths: string[] = [];
    for (const [i, photo] of photos.entries()) {
      const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
      const path = `${id}/${i + 1}.${ext}`;
      await uploadPhoto(path, await photo.arrayBuffer(), photo.type);
      paths.push(path);
    }
    await saveIntake({ booking_id: bookingId || null, name: name || null, whatsapp, answers, photos: paths });
  } catch (err) {
    console.error("[intake] Could not save the questionnaire.", err);
    return Response.json({ error: "save_failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
