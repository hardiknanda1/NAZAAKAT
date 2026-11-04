# NAZAAKAT — Personal Fashion Consulting

A single-page website with Calendly booking, booking-confirmed WhatsApp messages and in-browser Jitsi video consultations.

**Stack:** Next.js 16 (App Router) · React · TypeScript · Tailwind CSS 4 · Framer Motion (subtle fades only) · Lucide icons.
No database, no customer accounts.

```
app/
  page.tsx                      Landing page (Hero, Services, Statement, How It Works, About, Booking, Contact)
  consultation/[room]/          Video consultation page (Jitsi IFrame API)
  api/calendly/webhook/route.ts Calendly webhook → meeting link → WhatsApp
components/                     One file per section, plus Logo, Photo, Reveal, CalendlyEmbed
lib/                            site settings, WhatsApp client, room-name pattern
public/logo.*, public/images/   Brand logo and photographs (add these, see below)
```

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in what you have; everything is optional for local preview
npm run dev                  # http://localhost:3000
npm run build && npm start   # production build
```

## Brand assets (required before launch)

The supplied logo is in `public/logo.png` (favicons generated from it in `app/icon.png` and `app/apple-icon.png`). The hero portrait comes from the supplied design mockup. Other photographs show placeholders until added — drop files in and rebuild:

| File | Used for |
| --- | --- |
| `public/logo.png` | Brand logo (header, footer, consultation page). Replace to update everywhere. |
| `app/opengraph-image.jpg` (1200×630) | Social share image (optional). |
| `public/images/hero-wide.webp`, `hero-narrow.webp` | Hero portrait (tablet/desktop and phone crops). The desktop detail cards are positioned over this exact composition; if you replace it with a different photo, adjust the card positions in `components/Hero.tsx`. A higher-resolution original will look sharper on retina screens. |
| `public/images/look-1.jpg` … `look-3.jpg` | Outfit thumbnails in the hero "Curated For You" card (taken from the design mockup; replace with 4:5 product photos when available). |
| `public/images/services.jpg` | Services section (4:5, desktop only). |
| `public/images/about.jpg` | About section (4:5). |

Use licensed photography. Images are optimised and lazy-loaded automatically by `next/image`; the hero is preloaded.

## Sending meeting links (bookings page)

Automatic WhatsApp messages are optional. The simplest way to send links is the private **bookings page** at `/admin`:

1. In Calendly: **Integrations → API and webhooks → Personal access tokens → Generate new token**. Set it as `CALENDLY_API_TOKEN` in Vercel.
2. Set `ADMIN_PASSWORD` in Vercel (and `MEETING_ROOM_SECRET` if not already set), then redeploy.
3. Open `https://YOUR-SITE/admin`. The browser asks for a username (type anything) and the password.

Each upcoming booking shows the client's name, time and WhatsApp number with:

- **Send on WhatsApp** — opens WhatsApp with a ready-written message and the client's private video link.
- **Copy message** / **Copy customer link** — to paste anywhere.
- **Join as consultant** — opens the call with host controls. Never send this link to clients.

Links are the same ones the webhook would send, so both methods can be used together. This works on Calendly's free plan (no webhook needed).

## Calendly

1. Create an event type (e.g. "Style Consultation", 45 min).
2. **Booking questions:** keep Name. Calendly always requires an email address — it can't be turned off, so it stays as the only other standard field.
3. Add a custom question: type **Phone Number**, text exactly **`WhatsApp Number (with country code)`**, set to **required**. The webhook finds this answer by looking for "WhatsApp" in the question text.
4. Set **Location** to none (the video link comes from this site), and leave the confirmation page as Calendly's default. The site also shows its own confirmation message after booking.
5. Copy the event link into `NEXT_PUBLIC_CALENDLY_URL`. If it's missing, or Calendly can't load, the booking section shows a calm placeholder, with a WhatsApp button if `NEXT_PUBLIC_WHATSAPP_NUMBER` is set.

### Webhook (needs a paid Calendly plan, Standard or higher)

Choose a signing key (`openssl rand -hex 32`), set it as `CALENDLY_WEBHOOK_SIGNING_KEY`, then create the subscription with a Calendly personal access token:

```bash
# Find your organization URI
curl -s https://api.calendly.com/users/me -H "Authorization: Bearer $CALENDLY_TOKEN"
```

```bash
curl -X POST https://api.calendly.com/webhook_subscriptions \
  -H "Authorization: Bearer $CALENDLY_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "url": "https://YOUR-DOMAIN/api/calendly/webhook",
    "events": ["invitee.created"],
    "organization": "https://api.calendly.com/organizations/XXXX",
    "scope": "organization",
    "signing_key": "YOUR_SIGNING_KEY"
  }'
```

The webhook:

- rejects requests without a valid `Calendly-Webhook-Signature` (HMAC-SHA256, 5-minute tolerance), and returns 503 if the secrets aren't set;
- creates a private room name, `nazaakat-<24 hex>`, from the invitee URI and `MEETING_ROOM_SECRET`. Nothing is stored, and Calendly retries get the same link;
- sends `https://YOUR-DOMAIN/consultation/<room>` to the customer on WhatsApp, and optionally to the consultant;
- never returns or exposes other customers' details. The consultation page only accepts the room-name format and is excluded from search engines.

## WhatsApp (Meta WhatsApp Business Platform)

1. Set up a WhatsApp Business account and phone number in [Meta for Developers](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started), then create a **permanent system-user access token**.
2. In WhatsApp Manager, create a **Utility** message template and get it approved, for example `consultation_booked`:
   > Hello {{1}}, your NAZAAKAT style consultation is confirmed for {{2}}. Join your private video call here: {{3}} — no app or account needed.
3. Set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME` and `WHATSAPP_TEMPLATE_LANGUAGE` (the template's language code, e.g. `en` or `en_US`).
4. Optional consultant copy: approve a second template with the same three parameters, then set `CONSULTANT_WHATSAPP_NUMBER` and `WHATSAPP_CONSULTANT_TEMPLATE_NAME`.

Until WhatsApp is configured, bookings are accepted and the webhook logs `whatsapp: "not_configured"`. **No message is sent**, so share links manually in the meantime.

**Prefer Interakt or AiSensy?** Both are WhatsApp Business partners with simpler onboarding in India. Replace the body of `sendTemplate()` in `lib/whatsapp.ts` with their "send template message" API call. Nothing else changes.

## Video consultations (Jitsi)

Customers open the link from WhatsApp, enter their name and tap **Join Consultation** — the call runs inside the page with the [Jitsi IFrame API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe). No account or app.

Each booking gets two links, both signed with `MEETING_ROOM_SECRET` (nothing is stored):

- **Customer link** `…/consultation/nazaakat-…` — sent to the customer on WhatsApp.
- **Consultant link** — the same plus `?host=…`, which gives host (moderator) controls. Sent on WhatsApp if the consultant template is set up, and always written to the Vercel logs (`[calendly] Booking for …`).

Made-up room addresses show "page not found" and never get a video token.

### Production: 8x8 Jitsi as a Service (JaaS)

1. In the [JaaS console](https://jaas.8x8.vc): **API keys → Add API key → Generate API key pair**. Download the private key file and note the **Key ID**.
2. Copy your **App ID** (`vpaas-magic-cookie-…`) from the console.
3. In Vercel set `JAAS_APP_ID`, `JAAS_KEY_ID` and `JAAS_PRIVATE_KEY` (paste the whole key file, including the `-----BEGIN` / `-----END` lines), then redeploy.

The server (`app/api/jitsi/session`) then signs a short-lived token for each person: customers join as guests, the consultant link joins as moderator. No sign-in and no 5-minute limit. The free JaaS tier covers a limited number of monthly users — check your plan in the console.

Without JaaS, calls use `JITSI_DOMAIN` (default `meet.jit.si`). The public meet.jit.si is for testing only: embedded calls end after ~5 minutes and someone must sign in as host. A self-hosted Jitsi server with guest access also works — set `JITSI_DOMAIN` to it.

### Make a test call without booking

```bash
node scripts/consultation-link.mjs YOUR_MEETING_ROOM_SECRET https://YOUR-SITE
```

It prints a customer link and a consultant link for a fresh test room. Open one on each device.

## Environment variables

See `.env.example`. `NEXT_PUBLIC_*` values are public. Everything else is a server-only secret: set those in Vercel and never commit them.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Yes (prod) | Canonical URL, OG metadata, meeting links |
| `NEXT_PUBLIC_CALENDLY_URL` | Yes | Calendly event link |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Recommended | "Chat on WhatsApp" buttons |
| `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_CONTACT_EMAIL` | Optional | Contact section (placeholders shown when empty) |
| `JAAS_APP_ID`, `JAAS_KEY_ID`, `JAAS_PRIVATE_KEY` | For launch | 8x8 JaaS video (no time limit, no host sign-in) |
| `JITSI_DOMAIN` | Optional | Jitsi server when JaaS isn't set (default `meet.jit.si`, testing only) |
| `CALENDLY_WEBHOOK_SIGNING_KEY` | For webhook | Verifies Calendly requests |
| `MEETING_ROOM_SECRET` | Yes | Signs meeting and consultant links |
| `ADMIN_PASSWORD`, `CALENDLY_API_TOKEN` | For /admin | Private bookings page with links to send |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME` | For WhatsApp | Sending meeting links |
| `WHATSAPP_TEMPLATE_LANGUAGE`, `WHATSAPP_API_VERSION` | Optional | Defaults `en`, `v23.0` |
| `CONSULTANT_WHATSAPP_NUMBER`, `WHATSAPP_CONSULTANT_TEMPLATE_NAME` | Optional | Consultant copy of each link |

## Deploy on Vercel

1. Push this repository to GitHub and choose **Import Project** in Vercel. The framework is detected automatically.
2. Add the environment variables in **Project → Settings → Environment Variables**.
3. Deploy, connect your domain, then set `NEXT_PUBLIC_SITE_URL` to it and redeploy.
4. Create the Calendly webhook pointing at `https://YOUR-DOMAIN/api/calendly/webhook`.
5. Make a test booking with your own WhatsApp number, and check **Vercel → Logs** for `[calendly]` entries.
