create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'light',
  timer_style text not null default 'minimal',
  scene_id text not null default 'warm',
  timer_preset integer not null default 25,
  environment text not null default 'none',
  updated_at timestamptz not null default now()
);
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, tag text, completed boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1
);
create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, starts_at timestamptz not null, ends_at timestamptz, completed boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1
);
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled note', body text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1
);
create table if not exists public.note_versions (
  id uuid primary key default gen_random_uuid(), note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, body text not null, source text not null default 'local', created_at timestamptz not null default now()
);
create table if not exists public.focus_sessions (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null, ended_at timestamptz not null, date date not null,
  planned_seconds integer not null, actual_seconds integer not null,
  intention text, outcome text, mood text, interruptions text, next_step text, reflection text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1
);
create index if not exists tasks_user_updated_idx on public.tasks(user_id, updated_at desc);
create index if not exists schedule_user_start_idx on public.schedule_items(user_id, starts_at);
create index if not exists notes_user_updated_idx on public.notes(user_id, updated_at desc);
create index if not exists sessions_user_date_idx on public.focus_sessions(user_id, date desc);

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.tasks enable row level security;
alter table public.schedule_items enable row level security;
alter table public.notes enable row level security;
alter table public.note_versions enable row level security;
alter table public.focus_sessions enable row level security;

create policy profiles_owner on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy user_preferences_owner on public.user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tasks_owner on public.tasks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy schedule_items_owner on public.schedule_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notes_owner on public.notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy note_versions_owner on public.note_versions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy focus_sessions_owner on public.focus_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
