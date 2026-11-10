import { MAX_PHOTO_BYTES, MAX_PHOTOS, MAX_TOTAL_BYTES, cleanAnswers, missingAnswers } from "./intake";

// Reads and checks the photos and questionnaire answers sent with a booking. Server only.

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type IntakeInput = { answers: Record<string, string | string[]>; photos: File[] };

export function readIntake(form: FormData): { ok: true; value: IntakeInput } | { ok: false; error: string; status: number } {
  let answers: Record<string, string | string[]>;
  try {
    answers = cleanAnswers(JSON.parse(String(form.get("answers") || "{}")));
  } catch {
    return { ok: false, error: "bad_answers", status: 400 };
  }
  if (missingAnswers(answers).length) return { ok: false, error: "need_answers", status: 400 };

  const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length === 0) return { ok: false, error: "no_photos", status: 400 };
  if (photos.length > MAX_PHOTOS) return { ok: false, error: "too_many_photos", status: 400 };
  if (photos.some((p) => !IMAGE_TYPES.has(p.type) || p.size > MAX_PHOTO_BYTES)) return { ok: false, error: "bad_photo", status: 400 };
  if (photos.reduce((n, p) => n + p.size, 0) > MAX_TOTAL_BYTES) return { ok: false, error: "too_large", status: 413 };

  return { ok: true, value: { answers, photos } };
}

export const photoExtension = (type: string) => (type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg");
