import { isHost, isValidRoom, jaasConfigured, jaasToken } from "@/lib/meeting";

// Returns what the browser needs to open a consultation room.
// With JaaS configured, only rooms created by a real booking get a token.
export async function POST(request: Request) {
  let body: { room?: string; host?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const room = body.room || "";
  if (!isValidRoom(room)) return Response.json({ error: "Unknown room" }, { status: 404 });
  const moderator = isHost(room, body.host);
  const headers = { "Cache-Control": "no-store" };

  if (jaasConfigured()) {
    const appId = process.env.JAAS_APP_ID!;
    try {
      return Response.json(
        {
          domain: "8x8.vc",
          scriptUrl: `https://8x8.vc/${appId}/external_api.js`,
          roomName: `${appId}/${room}`,
          jwt: jaasToken(room, moderator),
          moderator,
        },
        { headers },
      );
    } catch (err) {
      console.error("[jitsi] Could not sign JaaS token — check JAAS_PRIVATE_KEY.", err);
      return Response.json({ error: "Video service not configured" }, { status: 500 });
    }
  }

  // Public or self-hosted Jitsi (no token).
  const domain = process.env.JITSI_DOMAIN || "meet.jit.si";
  return Response.json({ domain, scriptUrl: `https://${domain}/external_api.js`, roomName: room, moderator }, { headers });
}

// Quick check of which video service is active (no secrets): open /api/jitsi/session in a browser.
export function GET() {
  const jaas = jaasConfigured();
  const missing = ["JAAS_APP_ID", "JAAS_KEY_ID", "JAAS_PRIVATE_KEY"].filter((k) => !process.env[k]);
  return Response.json(
    {
      videoService: jaas ? "8x8 JaaS (no time limit)" : `${process.env.JITSI_DOMAIN || "meet.jit.si"} (free server: calls end after ~5 minutes)`,
      jaasSettingsMissing: missing,
      roomSecretSet: Boolean(process.env.MEETING_ROOM_SECRET),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
