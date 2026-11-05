import { isSignedIn } from "@/app/admin/actions";
import { addSlots, allSlots, deleteSlot, supabaseConfigured } from "@/lib/supabase";

function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET() {
  if (!(await isSignedIn())) return unauthorized();
  if (!supabaseConfigured()) return Response.json({ error: "not_configured", slots: [] }, { status: 503 });
  try {
    const slots = await allSlots(new Date().toISOString());
    return Response.json({ slots }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[admin/slots] Could not read slots.", err);
    return Response.json({ error: "read_failed", slots: [] }, { status: 502 });
  }
}

type NewSlot = { startsAt?: string; durationMinutes?: number };

export async function POST(request: Request) {
  if (!(await isSignedIn())) return unauthorized();
  if (!supabaseConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });

  let body: { slots?: NewSlot[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const input = Array.isArray(body.slots) ? body.slots : [];
  const rows = input
    .map((s) => ({ starts_at: String(s.startsAt || ""), duration_minutes: Math.min(Math.max(Number(s.durationMinutes) || 45, 10), 240) }))
    .filter((s) => !Number.isNaN(new Date(s.starts_at).getTime()) && new Date(s.starts_at).getTime() > Date.now());

  if (rows.length === 0) return Response.json({ error: "no_slots" }, { status: 400 });
  if (rows.length > 500) return Response.json({ error: "too_many" }, { status: 400 });

  try {
    await addSlots(rows);
    return Response.json({ ok: true, added: rows.length });
  } catch (err) {
    console.error("[admin/slots] Could not add slots.", err);
    return Response.json({ error: "save_failed" }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isSignedIn())) return unauthorized();
  if (!supabaseConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return Response.json({ error: "bad_request" }, { status: 400 });

  try {
    await deleteSlot(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[admin/slots] Could not delete slot.", err);
    return Response.json({ error: "delete_failed" }, { status: 502 });
  }
}
