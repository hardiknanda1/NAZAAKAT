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
| `public/images/look-1.jpg` … `look-3.jpg` | Three small outfit thumbnails in the hero "Curated For You" card (4:5). Fabric-tone swatches show until added. |
| `public/images/services.jpg` | Services section (4:5, desktop only). |
| `public/images/about.jpg` | About section (4:5). |

Use licensed photography. Images are optimised and lazy-loaded automatically by `next/image`; the hero is preloaded.

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

## Jitsi

Customers open the link from WhatsApp, enter their name and tap **Join Consultation**. The call opens on the page through the [Jitsi IFrame API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe), with no account or app needed.

- **Development:** `NEXT_PUBLIC_JITSI_DOMAIN=meet.jit.si`. Embedded calls on the public meet.jit.si server are limited to about 5 minutes, and the first participant may be asked to sign in. Use it for testing only.
- **Production, option A — Jitsi as a Service (8x8 JaaS):** set `NEXT_PUBLIC_JITSI_DOMAIN=8x8.vc` and `NEXT_PUBLIC_JITSI_ROOM_PREFIX=<your vpaas-magic-cookie app ID>`. JaaS normally requires a signed JWT (RS256) to join, so a small server route that signs one with your JaaS private key still needs to be added before launch. Pass it as the `jwt` option in `app/consultation/[room]/JitsiRoom.tsx`.
- **Production, option B — self-hosted Jitsi:** set `NEXT_PUBLIC_JITSI_DOMAIN` to your server, e.g. `meet.nazaakat.com`. No other changes are needed.

The consultant joins with the same link (sent on WhatsApp if the consultant template is configured).

## Environment variables

See `.env.example`. `NEXT_PUBLIC_*` values are public. Everything else is a server-only secret: set those in Vercel and never commit them.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Yes (prod) | Canonical URL, OG metadata, meeting links |
| `NEXT_PUBLIC_CALENDLY_URL` | Yes | Calendly event link |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Recommended | "Chat on WhatsApp" buttons |
| `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_CONTACT_EMAIL` | Optional | Contact section (placeholders shown when empty) |
| `NEXT_PUBLIC_JITSI_DOMAIN`, `NEXT_PUBLIC_JITSI_ROOM_PREFIX` | Optional | Video server (default `meet.jit.si`) |
| `CALENDLY_WEBHOOK_SIGNING_KEY` | For webhook | Verifies Calendly requests |
| `MEETING_ROOM_SECRET` | For webhook | Derives private room names |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME` | For WhatsApp | Sending meeting links |
| `WHATSAPP_TEMPLATE_LANGUAGE`, `WHATSAPP_API_VERSION` | Optional | Defaults `en`, `v23.0` |
| `CONSULTANT_WHATSAPP_NUMBER`, `WHATSAPP_CONSULTANT_TEMPLATE_NAME` | Optional | Consultant copy of each link |

## Deploy on Vercel

1. Push this repository to GitHub and choose **Import Project** in Vercel. The framework is detected automatically.
2. Add the environment variables in **Project → Settings → Environment Variables**.
3. Deploy, connect your domain, then set `NEXT_PUBLIC_SITE_URL` to it and redeploy.
4. Create the Calendly webhook pointing at `https://YOUR-DOMAIN/api/calendly/webhook`.
5. Make a test booking with your own WhatsApp number, and check **Vercel → Logs** for `[calendly]` entries.
