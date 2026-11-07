# NAZAAKAT — Personal Fashion Consulting

A website with its own date-and-time booking (no Calendly), a questionnaire and photo upload right
after booking, a private admin area to manage availability and send meeting links, and in-browser
Jitsi (8x8 JaaS) video consultations with a per-booking catalogue.

**Stack:** Next.js 16 (App Router) · React · TypeScript · Tailwind CSS 4 · Framer Motion (subtle fades
only) · Lucide icons · Supabase (booking data, questionnaire photos, catalogues) · fflate (reads
catalogue .zip uploads).

```
app/
  page.tsx                            Home page (Hero, Services, Statement, How It Works, About, Booking CTA, Contact)
  about/                              Standalone About page (navbar links here)
  book/                               Date/time booking flow -> questionnaire -> confirmation
  consultation/[room]/                Video consultation page (Jitsi IFrame API)
  admin/                              Private area (one password): bookings, availability, a single booking's info
  admin/booking/[id]/                 One booking's details + catalogue upload; this is what you send your consultant
  api/book, api/slots                 Create a booking, read open slots (public)
  api/intake                          Receives the post-booking questionnaire and photos
  api/jitsi/session                   Signs video tokens; returns the right catalogue for that room
  api/admin/slots, api/admin/booking  Manage availability and upload a booking's catalogue (password-gated)
components/                           One file per section, plus Logo, Photo, Reveal, Intake
lib/                                  site settings, Supabase data access, signed meeting rooms, time formatting
public/logo.*, public/images/         Brand logo and photographs (add these, see below)
supabase/schema.sql                   Run in Supabase's SQL Editor; safe to run again any time
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
| `public/images/hero-wide.webp`, `hero-narrow.webp` | Classic hero portrait (see "Home page hero" below). The desktop detail cards are positioned over this exact composition; if you replace it with a different photo, adjust the card positions in `components/Hero.tsx`. |
| `public/images/look-1.jpg` … `look-3.jpg` | Outfit thumbnails in the classic hero's stylebook card. |
| `public/images/services.webp` | Services section (4:5, desktop only). |
| `public/images/about.webp` | About section (4:5). |

Use licensed photography. Images are optimised and lazy-loaded automatically by `next/image`; the hero is preloaded.

## Home page hero

The home page opens with the **body-shape wheel** (`components/ShapeHero.tsx`): five glowing cards
(hourglass, pear, apple, rectangle, inverted triangle) circle a silhouette. **Spin** lands on a random
shape, the silhouette reshapes itself to match, and a panel shows what flatters that shape. Below it,
"Do you know your body shape?" lets a visitor lock in a guess, ahead of the photo analyser.

The shapes, their descriptions, outfit tips, colours and silhouette proportions all live in
`lib/shapes.ts`. Edit the text there; add or remove a shape and the ring re-spaces itself.

To go back to the original photo hero (`components/Hero.tsx`, kept unchanged), set
`NEXT_PUBLIC_HERO=classic` in Vercel and redeploy. Remove it (or leave it blank) to return to the wheel.

## Supabase setup (required)

Everything — availability, bookings, the questionnaire, client photos and catalogues — lives in
Supabase. Nothing works until this is done.

1. Create a free project at supabase.com (region: Mumbai is closest for India).
2. **SQL Editor -> New query**, paste the contents of `supabase/schema.sql`, **Run**. This creates the
   `booking_slots`, `bookings` and `consultation_intake` tables and the two private storage buckets
   (`client-photos`, `booking-catalogues`). It is safe to run again later, e.g. after an update to this
   project adds a column.
3. **Project Settings -> API Keys**: copy the **Project URL** and a **secret** key (`sb_secret_...`; an
   older `service_role` key also works).
4. In Vercel, set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (mark the key as sensitive), then redeploy.
5. Open `https://YOUR-SITE/api/intake/status` to confirm it says `"status": "ready"`.

Only the server ever holds the secret key. Nothing here is reachable by a visitor's browser.

## Getting emailed when a booking comes in (optional)

By default, nothing tells you a client booked besides checking `/admin` yourself. To get an email
each time instead, this project uses [Resend](https://resend.com), a transactional email API — no
account on the client's side, no SDK, just one server-to-server call.

1. Create a free Resend account (3,000 emails/month, 100/day) and copy an **API key**.
2. In Vercel, set `RESEND_API_KEY` (mark it sensitive) and `NOTIFY_EMAIL` (the address you want the
   emails sent to), then redeploy.
3. Open `https://YOUR-SITE/api/notify/status` to confirm it says `"status": "ready"`.

That's it — without a verified domain, Resend's shared sandbox sender (`onboarding@resend.dev`) can
only deliver to the email address your Resend account itself was created with, so use that address
as `NOTIFY_EMAIL` for now. To send to a different address, verify your own domain in Resend
(**Domains** -> **Add Domain**, following their DNS instructions) and set `NOTIFY_FROM_EMAIL` to an
address at that domain, e.g. `NAZAAKAT <bookings@yourdomain.com>`.

This is entirely best-effort: if Resend is not configured, or the email fails to send for any reason,
the booking still goes through — the client is never shown an error over something only you would
want to know about.

## Booking (`/book`)

A client picks an open date and time, enters their name and WhatsApp number, then is shown the
questionnaire. The booking is only confirmed, and the slot only removed from what others can book,
once they pick a time — this is done as an atomic database update, so two people can never be given
the same slot.

No Calendly, no email address, no registration.

## Managing availability (`/admin/availability`)

Open `/admin`, then **Manage availability**. Add a date range, the days of the week and hours you are
free, and how long each consultation lasts; it generates the individual open slots and adds them.
You can also remove any slot that is not yet booked. A slot that is booked cannot be removed from
here (cancel it with the client directly, then delete it, if that is ever needed).

## Questionnaire and photos after booking

Right after booking a time, the client sees a short form: 1 to 5 photos and a few tap-to-choose
questions (`lib/intake.ts`). Only after they send it does the "your meeting link arrives on WhatsApp"
confirmation appear. Photos are shrunk in the browser (about 1600 px) before upload.

Answers go in the `consultation_intake` table, photos in the private `client-photos` bucket. The admin
page shows both through short-lived (1 hour) signed links.

## The admin area (`/admin`)

One password (`ADMIN_PASSWORD`) protects everything under `/admin`. Each upcoming booking shows:

- **Send on WhatsApp** / **Copy message** — a ready-written message to the client with their video link.
- **Copy client link** — the plain video link, if you want to send it yourself.
- **Join as consultant** / **Copy consultant link** — the host link. Gives video host controls. Keep it
  to yourself.
- **Copy consultant info link** — a link to that one booking's page (`/admin/booking/[id]`). Send this
  to your consultant (if that is a different person from you) on WhatsApp. They open it and enter the
  **same admin password**, and see only that booking: its time, the questionnaire and photos, the
  consultant (host) link, and the catalogue upload below.

### A booking's own catalogue

Each booking can have its own catalogue, shown beside the video during that call. On that booking's
page (`/admin/booking/[id]`), upload either:

- **A `.zip` of page images** — name the files so they sort in the right order (`01.jpg`, `02.jpg`, …).
  Up to 80 pages, each under 6 MB, read directly from the zip (via `fflate`, no server-side image
  processing) and stored in the private `booking-catalogues` bucket.
- **A single `.pdf`** — shown to both people as an embedded PDF during the call, with an "open in new
  tab" fallback. It does not get page-by-page flipping synced between the two screens the way an
  image catalogue does, since that needs a PDF renderer this project deliberately avoids (see
  "Technical notes" below).

If a booking has no catalogue uploaded, the call falls back to the one bundled with the project in
`public/c/` (listed in `lib/catalogue.ts`).

## Catalogue in the call

During a call the consultant can tap **Catalogue**: both screens switch to the two videos stacked on
the left and the catalogue on the right, with Prev / Next (and arrow keys, for image catalogues) turning
the page for everyone. **Close catalogue** returns both to the normal video. Tapping a page opens it
full screen.

## Video consultations (Jitsi)

Clients open the link from WhatsApp, enter their name and tap **Join Consultation** — the call runs
inside the page with the [Jitsi IFrame API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe).
No account or app.

Each booking's two links are both signed with `MEETING_ROOM_SECRET`, and the room name is generated
once at booking time and stored on the booking:

- **Customer link** `…/consultation/nazaakat-…` — send it to the client.
- **Consultant link** — the same plus `?host=…`, which gives host (moderator) controls. Never send it
  to clients.

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

It prints a customer link and a consultant link for a fresh test room (not tied to a real booking, so
it always shows the default catalogue in `public/c/`). Open one on each device.

## Technical notes

- **Zip catalogues, not PDF, get the page-flipping experience.** Reading a `.zip` of images needs no
  image decoding — `fflate` just extracts the files, and width/height are read straight from each
  file's header (`lib/image-size.ts`), so nothing here depends on a native image library. Rendering a
  PDF page-by-page into images would need a PDF renderer, which on a serverless host either means a
  native dependency (risk of failing specifically on Vercel's build, which cannot be verified from a
  dev sandbox) or a much larger undertaking. A PDF catalogue is instead stored as-is and shown in an
  embedded viewer: simpler and more honest than attempting page sync that might not survive production.
- **No recurring weekly schedule.** Availability is a flat list of individual slots. The "add open
  times" form in `/admin/availability` is a convenience that computes concrete slot times from a
  weekly pattern and adds them as ordinary rows — there is no recurrence rule stored anywhere, so
  there is nothing to get out of sync with manually added or removed slots.
- **Booking collision:** `createBooking` in `lib/supabase.ts` claims a slot with a conditional update
  (`is_booked=eq.false` in the request), which Postgres (via Supabase's REST layer) applies atomically.
  If two people submit the same slot at the same instant, only one update matches and succeeds; the
  other gets `slot_taken` and is sent back to pick another time.

## Environment variables

See `.env.example`. `NEXT_PUBLIC_*` values are public. Everything else is a server-only secret: set those in Vercel and never commit them.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Yes (prod) | Canonical URL, OG metadata, meeting links |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Recommended | "Chat on WhatsApp" buttons |
| `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_CONTACT_EMAIL` | Optional | Contact section (placeholders shown when empty) |
| `NEXT_PUBLIC_HERO` | Optional | `classic` shows the original photo hero instead of the body-shape wheel |
| `JAAS_APP_ID`, `JAAS_KEY_ID`, `JAAS_PRIVATE_KEY` | For launch | 8x8 JaaS video (no time limit, no host sign-in) |
| `JITSI_DOMAIN` | Optional | Jitsi server when JaaS isn't set (default `meet.jit.si`, testing only) |
| `MEETING_ROOM_SECRET` | Yes | Signs meeting and consultant links |
| `ADMIN_PASSWORD` | Yes | The one password for everything under `/admin` |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Yes | Availability, bookings, questionnaire, photos, catalogues |
| `RESEND_API_KEY`, `NOTIFY_EMAIL` | Optional | Email yourself when a booking comes in |
| `NOTIFY_FROM_EMAIL` | Optional | Send that email from a verified domain instead of Resend's sandbox sender |

## Deploy on Vercel

1. Push this repository to GitHub and choose **Import Project** in Vercel. The framework is detected automatically.
2. Add the environment variables in **Project → Settings → Environment Variables**.
3. Deploy, connect your domain, then set `NEXT_PUBLIC_SITE_URL` to it and redeploy.
4. Open `/admin/availability` and add some open times.
5. Make a test booking on `/book`, then open `/admin`, enter the password and tap **Send on WhatsApp**
   to send yourself the link.
