-- NAZAAKAT: storage for the questionnaire and photos clients send after booking.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.consultation_intake (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  invitee_uri text,          -- the Calendly booking this belongs to
  name text,
  whatsapp text,
  email text,
  answers jsonb not null default '{}'::jsonb,
  photos text[] not null default '{}'   -- paths inside the private "client-photos" bucket
);

create index if not exists consultation_intake_invitee on public.consultation_intake (invitee_uri);

-- Row level security on with no policies: only the website's server (secret key) can read or write.
alter table public.consultation_intake enable row level security;

-- Private bucket for client photos (never public; the admin page uses 1-hour signed links).
insert into storage.buckets (id, name, public)
values ('client-photos', 'client-photos', false)
on conflict (id) do nothing;
