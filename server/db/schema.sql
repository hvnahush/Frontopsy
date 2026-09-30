-- Frontopsy schema. Safe to re-run.

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

-- One row per checkup. The job runner fills in stage/report/screenshots as it goes.
create table if not exists public.checkups (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid        not null references public.users (id) on delete cascade,
  url               text        not null,
  status            text        not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  stage             text,
  error             text,
  report            jsonb,
  phone_screenshot  bytea,
  laptop_screenshot bytea,
  created_at        timestamptz not null default now(),
  finished_at       timestamptz
);

create index if not exists checkups_user_created_idx on public.checkups (user_id, created_at desc);

alter table public.checkups enable row level security;

-- Code checkups: the user pastes HTML/CSS/JS instead of a link.
alter table public.checkups add column if not exists source text not null default 'url';
alter table public.checkups add column if not exists code text;
alter table public.checkups add column if not exists symptoms text[] not null default '{}';
do $$ begin
  alter table public.checkups add constraint checkups_source_check check (source in ('url', 'code'));
exception when duplicate_object then null;
end $$;

-- Screenshot checkups: the user uploads an image, stored in the matching *_screenshot column.
alter table public.checkups drop constraint if exists checkups_source_check;
alter table public.checkups add constraint checkups_source_check check (source in ('url', 'code', 'screenshot'));
