-- NAZAAKAT: booking, questionnaire and catalogue storage.
-- Safe to run again at any time (every statement is idempotent).
-- Run in Supabase: SQL Editor -> New query -> paste -> Run.

-- Availability: individual bookable slots. The admin page adds and removes these.
create table if not exists public.booking_slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  duration_minutes int not null default 45,
  is_booked boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists booking_slots_starts_at on public.booking_slots (starts_at);
alter table public.booking_slots enable row level security;

-- Bookings: a client's confirmed consultation. Replaces Calendly as the source of truth.
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references public.booking_slots (id),
  starts_at timestamptz not null,
  duration_minutes int not null default 45,
  name text not null,
  whatsapp text not null,
  status text not null default 'confirmed', -- confirmed | cancelled
  room text, -- the signed video-call room name for this booking, set once at creation
  catalogue jsonb, -- null, {"type":"images","pages":[{"path":...,"width":...,"height":...}, ...]}, or {"type":"pdf","path":...}
  created_at timestamptz not null default now()
);
alter table public.bookings add column if not exists room text;
create index if not exists bookings_starts_at on public.bookings (starts_at);
create unique index if not exists bookings_room on public.bookings (room);
alter table public.bookings enable row level security;

-- Questionnaire answers and photo paths, tied to one of our own bookings.
create table if not exists public.consultation_intake (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  booking_id uuid references public.bookings (id),
  name text,
  whatsapp text,
  answers jsonb not null default '{}'::jsonb,
  photos text[] not null default '{}' -- paths inside the private "client-photos" bucket
);
create index if not exists consultation_intake_booking on public.consultation_intake (booking_id);
alter table public.consultation_intake enable row level security;

-- Migrating from an earlier version of this schema that stored a Calendly invitee_uri: harmless if
-- those columns never existed.
alter table public.consultation_intake add column if not exists booking_id uuid references public.bookings (id);
alter table public.consultation_intake drop column if exists invitee_uri;
alter table public.consultation_intake drop column if exists email;

-- Row level security is on with no policies anywhere above: only the website's server (secret key)
-- can read or write any of this. Visitors and the publishable key see nothing.

-- Private buckets (never public). The admin page and the call use short-lived signed links.
insert into storage.buckets (id, name, public)
values ('client-photos', 'client-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('booking-catalogues', 'booking-catalogues', false)
on conflict (id) do nothing;
