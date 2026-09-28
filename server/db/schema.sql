-- Frontopsy auth schema. Safe to re-run.

create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  name          text        not null,
  email         text        not null unique check (email = lower(email)),
  password_hash text,
  provider      text        not null check (provider in ('email', 'google')),
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Supabase exposes the public schema through its REST API. Enabling RLS with no
-- policies locks that path down; the server connects as the postgres role and
-- bypasses RLS.
alter table public.users enable row level security;
