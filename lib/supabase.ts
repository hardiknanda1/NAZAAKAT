// Minimal server-only Supabase client (REST, no extra packages) for the booking questionnaire.
// Data lives in the table `consultation_intake`; photos in the PRIVATE storage bucket `client-photos`.
// Only the server holds the secret key, so visitors can never read anyone's answers or photos.
// Setup SQL: supabase/schema.sql

export const PHOTO_BUCKET = "client-photos";

const url = () => (process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
const key = () => (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

export function supabaseConfigured() {
  return Boolean(url() && key());
}

function headers(extra: Record<string, string> = {}) {
  const k = key();
  // Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys only need apikey.
  return { apikey: k, ...(k.startsWith("eyJ") ? { Authorization: `Bearer ${k}` } : {}), ...extra };
}

async function check(res: Response, what: string) {
  if (!res.ok) throw new Error(`Supabase ${what} failed (${res.status}): ${await res.text()}`);
  return res;
}

export type Intake = {
  id: string;
  created_at: string;
  invitee_uri: string | null;
  name: string | null;
  whatsapp: string | null;
  email: string | null;
  answers: Record<string, string | string[]>;
  photos: string[];
};

export async function uploadPhoto(path: string, body: ArrayBuffer, contentType: string) {
  await check(
    await fetch(`${url()}/storage/v1/object/${PHOTO_BUCKET}/${path}`, {
      method: "POST",
      headers: headers({ "Content-Type": contentType, "x-upsert": "false" }),
      body,
    }),
    "photo upload",
  );
}

export async function saveIntake(row: Omit<Intake, "id" | "created_at">) {
  await check(
    await fetch(`${url()}/rest/v1/consultation_intake`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify(row),
    }),
    "save",
  );
}

export async function recentIntakes(limit = 200): Promise<Intake[]> {
  const res = await check(
    await fetch(`${url()}/rest/v1/consultation_intake?select=*&order=created_at.desc&limit=${limit}`, {
      headers: headers(),
      cache: "no-store",
    }),
    "read",
  );
  return res.json();
}

/** Short-lived links (1 hour) so the admin page can show private photos. */
export async function signedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const res = await check(
    await fetch(`${url()}/storage/v1/object/sign/${PHOTO_BUCKET}`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ expiresIn: 3600, paths }),
      cache: "no-store",
    }),
    "photo links",
  );
  const list: { path: string; signedURL?: string | null }[] = await res.json();
  return Object.fromEntries(
    list.filter((x) => x.signedURL).map((x) => [x.path, `${url()}/storage/v1${x.signedURL}`]),
  );
}
