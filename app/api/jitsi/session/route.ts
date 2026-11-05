import { cataloguePages } from "@/lib/catalogue";
import { isHost, isValidRoom, jaasAppId, jaasConfigured, jaasToken, roomForBooking } from "@/lib/meeting";
import { CATALOGUE_BUCKET, getBookingByRoom, signedUrls } from "@/lib/supabase";

type CatalogueOut =
  | { type: "images"; pages: { src: string; width: number; height: number }[] }
  | { type: "pdf"; url: string; name: string };

// The catalogue to show for this room: the booking's own, if one was uploaded in /admin, otherwise
// the default. Signed for 6 hours so it comfortably outlasts even a long consultation.
async function catalogueFor(room: string): Promise<CatalogueOut> {
  const fallback: CatalogueOut = { type: "images", pages: [...cataloguePages] };
  try {
    const booking = await getBookingByRoom(room);
    if (!booking?.catalogue) return fallback;

    if (booking.catalogue.type === "pdf") {
      const urls = await signedUrls(CATALOGUE_BUCKET, [booking.catalogue.path], 6 * 60 * 60);
      const url = urls[booking.catalogue.path];
      return url ? { type: "pdf", url, name: booking.catalogue.name } : fallback;
    }

    const paths = booking.catalogue.pages.map((p) => p.path);
    const urls = await signedUrls(CATALOGUE_BUCKET, paths, 6 * 60 * 60);
    const pages = booking.catalogue.pages.filter((p) => urls[p.path]).map((p) => ({ src: urls[p.path], width: p.width, height: p.height }));
    return pages.length > 0 ? { type: "images", pages } : fallback;
  } catch (err) {
    console.error("[jitsi] Could not load this booking's catalogue; showing the default.", err);
    return fallback;
  }
}

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
  const catalogue = await catalogueFor(room);
  const headers = { "Cache-Control": "no-store" };

  if (jaasConfigured()) {
    const appId = jaasAppId();
    try {
      return Response.json(
        {
          domain: "8x8.vc",
          scriptUrl: `https://8x8.vc/${appId}/external_api.js`,
          roomName: `${appId}/${room}`,
          jwt: jaasToken(room, moderator),
          moderator,
          catalogue,
        },
        { headers },
      );
    } catch (err) {
      console.error("[jitsi] Could not sign JaaS token. Check JAAS_PRIVATE_KEY.", err);
      return Response.json({ error: "Video service not configured" }, { status: 500 });
    }
  }

  // Public or self-hosted Jitsi (no token).
  const domain = process.env.JITSI_DOMAIN || "meet.jit.si";
  return Response.json({ domain, scriptUrl: `https://${domain}/external_api.js`, roomName: room, moderator, catalogue }, { headers });
}

// Quick check of the video setup (no secrets): open /api/jitsi/session in a browser.
export function GET() {
  const jaas = jaasConfigured();
  const missing = ["JAAS_APP_ID", "JAAS_KEY_ID", "JAAS_PRIVATE_KEY"].filter((k) => !(process.env[k] || "").trim());
  const problems: string[] = [];

  if (jaas) {
    if (!/^vpaas-magic-cookie-[a-z0-9]+$/i.test(jaasAppId())) {
      problems.push("JAAS_APP_ID should look like vpaas-magic-cookie-xxxxxxxx (copy it exactly from the JaaS console).");
    }
    try {
      jaasToken(roomForBooking("status-check"), false);
    } catch {
      problems.push("JAAS_PRIVATE_KEY could not be read. Paste the whole key file, including the BEGIN and END lines.");
    }
  }

  return Response.json(
    {
      videoService: jaas ? "8x8 JaaS (no time limit)" : `${process.env.JITSI_DOMAIN || "meet.jit.si"} (free server: calls end after ~5 minutes)`,
      status: jaas ? (problems.length ? "settings need fixing" : "ready") : "JaaS not set up",
      jaasSettingsMissing: missing,
      problems,
      jitsiScript: jaas ? `https://8x8.vc/${jaasAppId()}/external_api.js` : undefined,
      roomSecretSet: Boolean(process.env.MEETING_ROOM_SECRET),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
