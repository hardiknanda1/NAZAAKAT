import { endSession } from "@/lib/consultantAuth";

export async function POST() {
  await endSession();
  return Response.json({ ok: true });
}
