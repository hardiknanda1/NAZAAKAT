import { randomUUID } from "node:crypto";
import { roomForBooking } from "./meeting";

// Minimal server-only Supabase client (REST, no extra packages besides fflate for zip catalogues).
// Only the server holds the secret key, so visitors can never read anyone's bookings, answers or photos.
// Setup SQL: supabase/schema.sql

export const PHOTO_BUCKET = "client-photos";
export const CATALOGUE_BUCKET = "booking-catalogues";

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

function rest(path: string) {
  return `${url()}/rest/v1${path}`;
}

// ---- Questionnaire (consultation_intake) ----

export type Intake = {
  id: string;
  created_at: string;
  booking_id: string | null;
  name: string | null;
  whatsapp: string | null;
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
    await fetch(rest("/consultation_intake"), {
      method: "POST",
      headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify(row),
    }),
    "save intake",
  );
}

export async function recentIntakes(limit = 200): Promise<Intake[]> {
  const res = await check(
    await fetch(rest(`/consultation_intake?select=*&order=created_at.desc&limit=${limit}`), {
      headers: headers(),
      cache: "no-store",
    }),
    "read intake",
  );
  return res.json();
}

export async function intakeForBooking(bookingId: string): Promise<Intake | null> {
  const res = await check(
    await fetch(rest(`/consultation_intake?booking_id=eq.${bookingId}&select=*&order=created_at.desc&limit=1`), {
      headers: headers(),
      cache: "no-store",
    }),
    "read intake",
  );
  const rows: Intake[] = await res.json();
  return rows[0] ?? null;
}

/** Short-lived (1 hour) links so the admin page can show private files without making the bucket public. */
export async function signedUrls(bucket: string, paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const res = await check(
    await fetch(`${url()}/storage/v1/object/sign/${bucket}`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ expiresIn, paths }),
      cache: "no-store",
    }),
    "sign links",
  );
  const list: { path: string; signedURL?: string | null }[] = await res.json();
  return Object.fromEntries(list.filter((x) => x.signedURL).map((x) => [x.path, `${url()}/storage/v1${x.signedURL}`]));
}

// ---- Availability (booking_slots) ----

export type Slot = { id: string; starts_at: string; duration_minutes: number; is_booked: boolean };

export async function openSlots(fromIso: string, limit = 200): Promise<Slot[]> {
  const res = await check(
    await fetch(rest(`/booking_slots?is_booked=eq.false&starts_at=gte.${fromIso}&select=*&order=starts_at.asc&limit=${limit}`), {
      headers: headers(),
      cache: "no-store",
    }),
    "read slots",
  );
  return res.json();
}

export async function allSlots(fromIso: string, limit = 500): Promise<Slot[]> {
  const res = await check(
    await fetch(rest(`/booking_slots?starts_at=gte.${fromIso}&select=*&order=starts_at.asc&limit=${limit}`), {
      headers: headers(),
      cache: "no-store",
    }),
    "read slots",
  );
  return res.json();
}

export async function addSlots(rows: { starts_at: string; duration_minutes: number }[]) {
  // Existing slots at the same time are left alone, not duplicated or overwritten.
  await check(
    await fetch(rest("/booking_slots?on_conflict=starts_at"), {
      method: "POST",
      headers: headers({ "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" }),
      body: JSON.stringify(rows),
    }),
    "add slots",
  );
}

export async function deleteSlot(id: string) {
  await check(await fetch(rest(`/booking_slots?id=eq.${id}&is_booked=eq.false`), { method: "DELETE", headers: headers() }), "delete slot");
}

// ---- Bookings ----

export type Catalogue =
  | { type: "images"; pages: { path: string; width: number; height: number }[] }
  | { type: "pdf"; path: string; name: string };

export type BookingRow = {
  id: string;
  slot_id: string | null;
  starts_at: string;
  duration_minutes: number;
  name: string;
  whatsapp: string;
  status: "confirmed" | "cancelled";
  room: string;
  catalogue: Catalogue | null;
  discount_percent: number | null;
  created_at: string;
};

/**
 * Atomically claims an open slot and creates the booking. Returns null if the slot was
 * already taken (someone else booked it a moment earlier) so the caller can ask the
 * client to pick another time, instead of double-booking it.
 */
export async function createBooking(slotId: string, name: string, whatsapp: string): Promise<BookingRow | null> {
  const claim = await fetch(rest(`/booking_slots?id=eq.${slotId}&is_booked=eq.false`), {
    method: "PATCH",
    headers: headers({ "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify({ is_booked: true }),
  });
  await check(claim, "claim slot");
  const claimed: Slot[] = await claim.json();
  if (claimed.length === 0) return null; // someone else just took it

  const slot = claimed[0];
  // The id is generated here (not by the database) so the room, which is derived from it, can be
  // stored in the same insert, and looked up later without ever recomputing the hash.
  const id = randomUUID();
  const room = roomForBooking(id);
  const res = await check(
    await fetch(rest("/bookings"), {
      method: "POST",
      headers: headers({ "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify({ id, room, slot_id: slot.id, starts_at: slot.starts_at, duration_minutes: slot.duration_minutes, name, whatsapp }),
    }),
    "create booking",
  );
  const rows: BookingRow[] = await res.json();
  return rows[0];
}

/**
 * Undoes a booking whose photos or answers could not be saved: removes the booking and frees its slot,
 * so no booking is ever left without its questionnaire.
 */
export async function cancelBooking(bookingId: string, slotId: string | null) {
  await check(await fetch(rest(`/bookings?id=eq.${bookingId}`), { method: "DELETE", headers: headers() }), "remove booking");
  if (slotId) {
    await check(
      await fetch(rest(`/booking_slots?id=eq.${slotId}`), {
        method: "PATCH",
        headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({ is_booked: false }),
      }),
      "free slot",
    );
  }
}

/** Removes uploaded client photos (used when a booking is undone). */
export async function deletePhotos(paths: string[]) {
  if (paths.length === 0) return;
  await fetch(`${url()}/storage/v1/object/${PHOTO_BUCKET}`, {
    method: "DELETE",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefixes: paths }),
  });
}

export async function getBookingByRoom(room: string): Promise<BookingRow | null> {
  const res = await check(await fetch(rest(`/bookings?room=eq.${room}&select=*&limit=1`), { headers: headers(), cache: "no-store" }), "read booking");
  const rows: BookingRow[] = await res.json();
  return rows[0] ?? null;
}

export async function getBooking(id: string): Promise<BookingRow | null> {
  const res = await check(await fetch(rest(`/bookings?id=eq.${id}&select=*&limit=1`), { headers: headers(), cache: "no-store" }), "read booking");
  const rows: BookingRow[] = await res.json();
  return rows[0] ?? null;
}

export async function upcomingBookings(fromIso: string, limit = 100): Promise<BookingRow[]> {
  const res = await check(
    await fetch(rest(`/bookings?status=eq.confirmed&starts_at=gte.${fromIso}&select=*&order=starts_at.asc&limit=${limit}`), {
      headers: headers(),
      cache: "no-store",
    }),
    "read bookings",
  );
  return res.json();
}

export async function setBookingCatalogue(id: string, catalogue: Catalogue) {
  await check(
    await fetch(rest(`/bookings?id=eq.${id}`), {
      method: "PATCH",
      headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({ catalogue }),
    }),
    "save catalogue",
  );
}

// ---- Catalogue storage ----

export async function uploadCatalogueFile(path: string, body: ArrayBuffer, contentType: string) {
  await check(
    await fetch(`${url()}/storage/v1/object/${CATALOGUE_BUCKET}/${path}`, {
      method: "POST",
      headers: headers({ "Content-Type": contentType, "x-upsert": "true" }),
      body,
    }),
    "catalogue upload",
  );
}

/** Removes every file under a booking's catalogue folder, e.g. before replacing it with a new upload. */
export async function clearCatalogueFolder(bookingId: string) {
  const res = await fetch(`${url()}/storage/v1/object/list/${CATALOGUE_BUCKET}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefix: `${bookingId}/`, limit: 200 }),
  });
  if (!res.ok) return;
  const files: { name: string }[] = await res.json();
  if (files.length === 0) return;
  await fetch(`${url()}/storage/v1/object/${CATALOGUE_BUCKET}`, {
    method: "DELETE",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefixes: files.map((f) => `${bookingId}/${f.name}`) }),
  });
}

// ---- Body-shape analyser and the discount for guessing right ----

export type ShapeAnalysis = { id: string; created_at: string; ip_hash: string; guess: string; result: string; correct: boolean };
export type ShapeDiscount = {
  id: string;
  created_at: string;
  phone: string;
  percent: number;
  analysis_id: string;
  booking_id: string | null;
  used_at: string | null;
};

export async function recordAnalysis(row: Pick<ShapeAnalysis, "ip_hash" | "guess" | "result" | "correct">): Promise<ShapeAnalysis> {
  const res = await check(
    await fetch(rest("/shape_analyses"), {
      method: "POST",
      headers: headers({ "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify(row),
    }),
    "record analysis",
  );
  const rows: ShapeAnalysis[] = await res.json();
  return rows[0];
}

/** How many analyses this network ran since a time; with `resultsOnly`, only those that found a shape. */
export async function analysesSince(ipHash: string, sinceIso: string, resultsOnly = false): Promise<number> {
  const filter = resultsOnly ? "&result=neq.unclear" : "";
  const res = await check(
    await fetch(rest(`/shape_analyses?ip_hash=eq.${ipHash}&created_at=gte.${encodeURIComponent(sinceIso)}${filter}&select=id`), {
      headers: headers(),
      cache: "no-store",
    }),
    "count analyses",
  );
  return ((await res.json()) as unknown[]).length;
}

export async function getAnalysis(id: string): Promise<ShapeAnalysis | null> {
  const res = await check(await fetch(rest(`/shape_analyses?id=eq.${id}&select=*&limit=1`), { headers: headers(), cache: "no-store" }), "read analysis");
  const rows: ShapeAnalysis[] = await res.json();
  return rows[0] ?? null;
}

/** The discount already issued for this phone number or this analysis, if any (each can have only one). */
export async function existingDiscount(phone: string, analysisId: string): Promise<ShapeDiscount | null> {
  const res = await check(
    await fetch(rest(`/shape_discounts?or=(phone.eq.${phone},analysis_id.eq.${analysisId})&select=*&limit=1`), { headers: headers(), cache: "no-store" }),
    "read discount",
  );
  const rows: ShapeDiscount[] = await res.json();
  return rows[0] ?? null;
}

/** Issues the discount. Returns null if this phone or analysis already has one (the unique constraints decide). */
export async function createDiscount(row: Pick<ShapeDiscount, "phone" | "percent" | "analysis_id">): Promise<ShapeDiscount | null> {
  const res = await fetch(rest("/shape_discounts"), {
    method: "POST",
    headers: headers({ "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(row),
  });
  if (res.status === 409) return null;
  await check(res, "create discount");
  const rows: ShapeDiscount[] = await res.json();
  return rows[0];
}

/** The unused discount saved to this phone number, if there is one. */
export async function unusedDiscountForPhone(phone: string): Promise<ShapeDiscount | null> {
  const res = await check(
    await fetch(rest(`/shape_discounts?phone=eq.${phone}&booking_id=is.null&select=*&limit=1`), { headers: headers(), cache: "no-store" }),
    "read discount",
  );
  const rows: ShapeDiscount[] = await res.json();
  return rows[0] ?? null;
}

/**
 * Marks the discount as used by this booking and records it on the booking. The update only matches
 * an unused discount for the same phone, so it can never be applied twice, even by two requests at once.
 */
export async function redeemDiscount(id: string, phone: string, bookingId: string): Promise<number | null> {
  const res = await check(
    await fetch(rest(`/shape_discounts?id=eq.${id}&phone=eq.${phone}&booking_id=is.null`), {
      method: "PATCH",
      headers: headers({ "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify({ booking_id: bookingId, used_at: new Date().toISOString() }),
    }),
    "use discount",
  );
  const rows: ShapeDiscount[] = await res.json();
  if (rows.length === 0) return null;
  await check(
    await fetch(rest(`/bookings?id=eq.${bookingId}`), {
      method: "PATCH",
      headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({ discount_percent: rows[0].percent }),
    }),
    "record booking discount",
  );
  return rows[0].percent;
}
