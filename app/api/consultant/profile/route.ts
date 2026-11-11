import { randomUUID } from "node:crypto";
import { currentConsultant } from "@/lib/consultantAuth";
import { cleanProfile } from "@/lib/consultantProfile";
import { normalisePhone } from "@/lib/phone";
import { deleteConsultantPhoto, updateConsultant, uploadConsultantPhoto } from "@/lib/supabase";

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_PHOTO_BYTES = 2_000_000; // the browser shrinks it first

// A signed-in consultant saves their profile, with an optional photo (or removes it).
export async function POST(request: Request) {
  const consultant = await currentConsultant();
  if (!consultant) return Response.json({ error: "unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "too_large" }, { status: 413 });
  }
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(String(form.get("profile") || "{}"));
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const profile = cleanProfile(raw, normalisePhone);
  if ("error" in profile) return Response.json({ error: profile.error }, { status: 400 });

  const photo = form.get("photo");
  const removePhoto = form.get("removePhoto") === "true";
  if (photo instanceof File && photo.size > 0 && (!PHOTO_TYPES[photo.type] || photo.size > MAX_PHOTO_BYTES)) {
    return Response.json({ error: "bad_photo" }, { status: 400 });
  }

  try {
    let photo_path = consultant.photo_path;
    if (photo instanceof File && photo.size > 0) {
      // A new file name each time, so a cached old photo is never shown.
      photo_path = `${consultant.id}/${randomUUID()}.${PHOTO_TYPES[photo.type]}`;
      await uploadConsultantPhoto(photo_path, await photo.arrayBuffer(), photo.type);
      if (consultant.photo_path) await deleteConsultantPhoto(consultant.photo_path).catch(() => {});
    } else if (removePhoto && consultant.photo_path) {
      await deleteConsultantPhoto(consultant.photo_path).catch(() => {});
      photo_path = null;
    }
    await updateConsultant(consultant.id, { ...profile, photo_path });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[consultant] Could not save a profile.", err);
    return Response.json({ error: "save_failed" }, { status: 502 });
  }
}
