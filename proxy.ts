import { NextResponse, type NextRequest } from "next/server";

// Password-protects the private bookings page with the browser's built-in sign-in box.
// Username: anything (e.g. "admin"). Password: ADMIN_PASSWORD.
export function proxy(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return new NextResponse("Set ADMIN_PASSWORD to use this page.", { status: 503 });

  const header = request.headers.get("authorization") || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const supplied = atob(encoded).split(":").slice(1).join(":");
    if (sameText(supplied, password)) return NextResponse.next();
  }

  return new NextResponse("Sign in required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="NAZAAKAT bookings", charset="UTF-8"' },
  });
}

function sameText(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
