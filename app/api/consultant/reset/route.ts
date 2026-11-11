import { startSession } from "@/lib/consultantAuth";
import { redeemCode } from "@/lib/consultantCode";
import { hashPassword, passwordProblem } from "@/lib/password";
import { updateConsultant } from "@/lib/supabase";

// Forgot password: the code (emailed, or from the admin) and the new password in one step. Signs them in.
export async function POST(request: Request) {
  let body: { email?: string; code?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const problem = passwordProblem(body.password);
  if (problem) return Response.json({ error: problem }, { status: 400 });
  try {
    const consultant = await redeemCode(body.email, body.code);
    if (!consultant) return Response.json({ error: "wrong_code" }, { status: 400 });
    await updateConsultant(consultant.id, { password_hash: await hashPassword(body.password as string), failed_logins: 0, locked_until: null });
    await startSession(consultant.id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[consultant] Could not reset a password.", err);
    return Response.json({ error: "verify_failed" }, { status: 502 });
  }
}
