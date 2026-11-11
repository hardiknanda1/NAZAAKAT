import { currentConsultant } from "@/lib/consultantAuth";
import { checkPassword, hashPassword, passwordProblem } from "@/lib/password";
import { updateConsultant } from "@/lib/supabase";

// A signed-in consultant sets their password, or changes it (which needs the current one).
export async function POST(request: Request) {
  const consultant = await currentConsultant();
  if (!consultant) return Response.json({ error: "unauthorized" }, { status: 401 });
  let body: { current?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const problem = passwordProblem(body.password);
  if (problem) return Response.json({ error: problem }, { status: 400 });
  try {
    if (consultant.password_hash && !(await checkPassword(String(body.current || ""), consultant.password_hash))) {
      await new Promise((r) => setTimeout(r, 700));
      return Response.json({ error: "wrong_current" }, { status: 400 });
    }
    await updateConsultant(consultant.id, { password_hash: await hashPassword(body.password as string), failed_logins: 0, locked_until: null });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[consultant] Could not save a password.", err);
    return Response.json({ error: "save_failed" }, { status: 502 });
  }
}
