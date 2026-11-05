import { createHmac, createPrivateKey, createSign, timingSafeEqual } from "node:crypto";

// Room names look like "nazaakat-<12 hex id><12 hex signature>". The signature is
// derived from MEETING_ROOM_SECRET, so the server can tell a real booking's room
// from a made-up one without storing anything.
export const ROOM_PATTERN = /^nazaakat-[a-f0-9]{24}$/;

const secret = () => process.env.MEETING_ROOM_SECRET || "";
const hmac = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Room for a Calendly booking. The same booking always gets the same room. */
export function roomForBooking(inviteeUri: string) {
  const id = hmac(`booking:${inviteeUri}`).slice(0, 12);
  return `nazaakat-${id}${hmac(`room:${id}`).slice(0, 12)}`;
}

/** True when the room was created by this site. Without a secret (local dev) any well-formed room is allowed. */
export function isValidRoom(room: string) {
  if (!ROOM_PATTERN.test(room)) return false;
  if (!secret()) return true;
  const id = room.slice(9, 21);
  return safeEqual(room.slice(21), hmac(`room:${id}`).slice(0, 12));
}

/** Token that marks the consultant's link (gives host controls). */
export function hostToken(room: string) {
  return hmac(`host:${room}`).slice(0, 32);
}

export function isHost(room: string, token: string | null | undefined) {
  return Boolean(secret() && token && safeEqual(token, hostToken(room)));
}

export function consultationLinks(siteUrl: string, room: string) {
  const base = `${siteUrl.replace(/\/$/, "")}/consultation/${room}`;
  return { customer: base, consultant: `${base}?host=${hostToken(room)}` };
}

// ---- Jitsi as a Service (8x8 JaaS) ----

const env = (name: string) => (process.env[name] || "").trim();

export function jaasConfigured() {
  return Boolean(env("JAAS_APP_ID") && env("JAAS_KEY_ID") && env("JAAS_PRIVATE_KEY"));
}

export const jaasAppId = () => env("JAAS_APP_ID");

/**
 * Rebuilds the private key in proper PEM form. Pasting into Vercel often turns the
 * line breaks into spaces or "\n", which would make signing fail.
 */
export function jaasPrivateKey() {
  const raw = env("JAAS_PRIVATE_KEY").replace(/\\n/g, "\n");
  const match = raw.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
  const label = match ? match[1] : "PRIVATE KEY";
  const body = (match ? match[2] : raw).replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g) || [];
  return createPrivateKey(`-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`);
}

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

/** Short-lived RS256 token that lets one person into one JaaS room. */
export function jaasToken(room: string, moderator: boolean) {
  const appId = jaasAppId();
  const keyId = env("JAAS_KEY_ID");
  const privateKey = jaasPrivateKey();
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT", kid: keyId.startsWith(appId) ? keyId : `${appId}/${keyId}` };
  const payload = {
    aud: "jitsi",
    iss: "chat",
    sub: appId,
    room,
    nbf: now - 30,
    exp: now + 4 * 60 * 60,
    context: {
      user: { id: moderator ? "consultant" : `guest-${now}`, name: moderator ? "NAZAAKAT Stylist" : "Guest", moderator },
      // Screen sharing and file sharing are allowed for everyone in the call; paid extras stay off.
      features: {
        "screen-sharing": true,
        "file-upload": true,
        livestreaming: false,
        recording: false,
        transcription: false,
        "outbound-call": false,
      },
    },
  };

  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey);
  return `${unsigned}.${b64url(signature)}`;
}
