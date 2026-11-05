import { randomUUID } from "node:crypto";
import { normalisePhone } from "@/lib/calendly";
import { MAX_PHOTO_BYTES, MAX_PHOTOS, MAX_TOTAL_BYTES, cleanAnswers } from "@/lib/intake";
import { saveIntake, supabaseConfigured, uploadPhoto } from "@/lib/supabase";

// Receives the questionnaire and photos a client sends right after booking.
const INVITEE_URI = /^https:\/\/api\.calendly\.com\/scheduled_events\/[A-Za-z0-9-]+\/invitees\/[A-Za-z0-9-]+$/;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type Invitee = { name?: string; email?: string; text_reminder_number?: string | null; questions_and_answers?: { question?: string; answer?: string }[] };

// Confirms the booking really exists, and reads the client's name and WhatsApp number from it.
async function lookUpInvitee(uri: string): Promise<Invitee | null> {
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) return {};
  try {
    const res = await fetch(uri, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (res.status === 404) return null; // no such booking
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()).resource ?? {};
  } catch (err) {
    // Calendly unreachable right now: keep the client's photos rather than lose them.
    console.warn("[intake] Could not check the booking with Calendly; saving anyway.", err);
    return {};
  }
}

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

  const inviteeUri = String(form.get("inviteeUri") || "");
  if (inviteeUri && !INVITEE_URI.test(inviteeUri)) return Response.json({ error: "bad_booking" }, { status: 400 });

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

  // Name and number come from the Calendly booking when we have it, otherwise from the form.
  let name = String(form.get("name") || "").trim().slice(0, 120);
  let whatsapp = normalisePhone(String(form.get("whatsapp") || ""));
  let email: string | null = null;
  if (inviteeUri) {
    const invitee = await lookUpInvitee(inviteeUri);
    if (!invitee) return Response.json({ error: "bad_booking" }, { status: 400 });
    name = invitee.name?.trim() || name;
    email = invitee.email || null;
    const qa = invitee.questions_and_answers?.find((x) => /whats\s?app|mobile|phone/i.test(x.question || ""));
    whatsapp = normalisePhone(qa?.answer) ?? normalisePhone(invitee.text_reminder_number) ?? whatsapp;
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
    await saveIntake({ invitee_uri: inviteeUri || null, name: name || null, whatsapp, email, answers, photos: paths });
  } catch (err) {
    console.error("[intake] Could not save the questionnaire.", err);
    return Response.json({ error: "save_failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
