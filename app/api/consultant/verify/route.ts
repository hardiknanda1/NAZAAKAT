import { startSession } from "@/lib/consultantAuth";
import { redeemCode } from "@/lib/consultantCode";

// Signs a consultant in with a one-time code. Tells the page whether they still need to set a password.
export async function POST(request: Request) {
  let body: { email?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const consultant = await redeemCode(body.email, body.code);
    if (!consultant) return Response.json({ error: "wrong_code" }, { status: 400 });
    await startSession(consultant.id);
    return Response.json({ ok: true, needsPassword: !consultant.password_hash });
  } catch (err) {
    console.error("[consultant] Could not check a sign-in code.", err);
    return Response.json({ error: "verify_failed" }, { status: 502 });
  }
}
