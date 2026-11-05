import { openSlots, supabaseConfigured } from "@/lib/supabase";

// Public: the open consultation slots a visitor can book, from now onward.
export async function GET() {
  if (!supabaseConfigured()) return Response.json({ error: "not_configured", slots: [] }, { status: 503 });
  try {
    const slots = await openSlots(new Date().toISOString());
    return Response.json({ slots }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[slots] Could not read available slots.", err);
    return Response.json({ error: "read_failed", slots: [] }, { status: 502 });
  }
}
