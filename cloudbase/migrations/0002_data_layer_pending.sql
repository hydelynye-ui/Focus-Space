-- Focus Space CloudBase PG data layer proposal.
-- REVIEW ONLY: do not execute until the product owner approves the identity and sync model.
-- CloudBase PG uses auth.uid() as TEXT from the authenticated JWT.

create table if not exists public.user_preferences (
  owner_id text primary key not null default auth.uid(),
  theme text not null default 'light',
  scene_id text not null default 'warm',
  timer_style text not null default 'circular',
  clock_style text not null default 'digital',
  preset integer not null default 25 check (preset > 0 and preset <= 180),
  encouragement boolean not null default true,
  reduce_motion boolean not null default false,
  layout_order jsonb not null default '[]'::jsonb,
  layout_hidden jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  version bigint not null default 1
);

create table if not exists public.tasks (
  id text primary key,
  owner_id text not null default auth.uid(),
  title text not null,
  tag text,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version bigint not null default 1
);

create table if not exists public.schedule_items (
  id text primary key,
  owner_id text not null default auth.uid(),
  title text not null,
  time text not null,
  meta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version bigint not null default 1
);

create table if not exists public.workspace_notes (
  owner_id text not null default auth.uid(),
  note_key text not null check (note_key in ('quick', 'full')),
  body text not null default '',
  updated_at timestamptz not null default now(),
  version bigint not null default 1,
  primary key (owner_id, note_key)
);

create table if not exists public.focus_sessions (
  id text primary key,
  owner_id text not null default auth.uid(),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  date date not null,
  planned_seconds integer not null check (planned_seconds >= 0),
  actual_seconds integer not null check (actual_seconds >= 0),
  intention text,
  outcome text,
  mood text,
  interruptions text,
  next_step text,
  reflection text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1,
  deleted_at timestamptz
);

create table if not exists public.note_versions (
  id text primary key,
  owner_id text not null default auth.uid(),
  note_key text not null check (note_key in ('quick', 'full')),
  body text not null,
  source_device text not null,
  conflict_group_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sync_metadata (
  owner_id text not null default auth.uid(),
  device_id text not null,
  last_synced_at timestamptz,
  sync_cursor text,
  sync_status text not null default 'local' check (sync_status in ('local', 'syncing', 'synced', 'offline', 'failed', 'conflict')),
  updated_at timestamptz not null default now(),
  primary key (owner_id, device_id)
);

create table if not exists public.sync_conflicts (
  id text primary key,
  owner_id text not null default auth.uid(),
  record_type text not null,
  record_id text not null,
  local_version jsonb not null,
  remote_version jsonb not null,
  conflict_group_id text,
  status text not null default 'open' check (status in ('open', 'local_selected', 'remote_selected', 'merged', 'dismissed')),
  conflicted_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists tasks_owner_updated_idx on public.tasks(owner_id, updated_at desc);
create index if not exists schedule_items_owner_updated_idx on public.schedule_items(owner_id, updated_at desc);
create index if not exists workspace_notes_owner_updated_idx on public.workspace_notes(owner_id, updated_at desc);
create index if not exists focus_sessions_owner_date_idx on public.focus_sessions(owner_id, date desc);
create index if not exists note_versions_owner_conflict_idx on public.note_versions(owner_id, conflict_group_id, created_at);
create index if not exists sync_conflicts_owner_status_idx on public.sync_conflicts(owner_id, status, updated_at desc);

-- Two-layer access control: table grants plus row-level policies.
revoke all on table public.user_preferences, public.tasks, public.schedule_items,
  public.workspace_notes, public.focus_sessions, public.note_versions,
  public.sync_metadata, public.sync_conflicts from public, anon;
grant select, insert, update, delete on table public.user_preferences, public.tasks,
  public.schedule_items, public.workspace_notes, public.focus_sessions,
  public.note_versions, public.sync_metadata, public.sync_conflicts to authenticated;

alter table public.user_preferences enable row level security;
alter table public.tasks enable row level security;
alter table public.schedule_items enable row level security;
alter table public.workspace_notes enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.note_versions enable row level security;
alter table public.sync_metadata enable row level security;
alter table public.sync_conflicts enable row level security;

create policy user_preferences_select on public.user_preferences for select to authenticated using (owner_id = auth.uid());
create policy user_preferences_insert on public.user_preferences for insert to authenticated with check (owner_id = auth.uid());
create policy user_preferences_update on public.user_preferences for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy user_preferences_delete on public.user_preferences for delete to authenticated using (owner_id = auth.uid());

create policy tasks_select on public.tasks for select to authenticated using (owner_id = auth.uid());
create policy tasks_insert on public.tasks for insert to authenticated with check (owner_id = auth.uid());
create policy tasks_update on public.tasks for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy tasks_delete on public.tasks for delete to authenticated using (owner_id = auth.uid());

create policy schedule_items_select on public.schedule_items for select to authenticated using (owner_id = auth.uid());
create policy schedule_items_insert on public.schedule_items for insert to authenticated with check (owner_id = auth.uid());
create policy schedule_items_update on public.schedule_items for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy schedule_items_delete on public.schedule_items for delete to authenticated using (owner_id = auth.uid());

create policy workspace_notes_select on public.workspace_notes for select to authenticated using (owner_id = auth.uid());
create policy workspace_notes_insert on public.workspace_notes for insert to authenticated with check (owner_id = auth.uid());
create policy workspace_notes_update on public.workspace_notes for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy workspace_notes_delete on public.workspace_notes for delete to authenticated using (owner_id = auth.uid());

create policy focus_sessions_select on public.focus_sessions for select to authenticated using (owner_id = auth.uid());
create policy focus_sessions_insert on public.focus_sessions for insert to authenticated with check (owner_id = auth.uid());
create policy focus_sessions_update on public.focus_sessions for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy focus_sessions_delete on public.focus_sessions for delete to authenticated using (owner_id = auth.uid());

create policy note_versions_select on public.note_versions for select to authenticated using (owner_id = auth.uid());
create policy note_versions_insert on public.note_versions for insert to authenticated with check (owner_id = auth.uid());
create policy note_versions_update on public.note_versions for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy note_versions_delete on public.note_versions for delete to authenticated using (owner_id = auth.uid());

create policy sync_metadata_select on public.sync_metadata for select to authenticated using (owner_id = auth.uid());
create policy sync_metadata_insert on public.sync_metadata for insert to authenticated with check (owner_id = auth.uid());
create policy sync_metadata_update on public.sync_metadata for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy sync_metadata_delete on public.sync_metadata for delete to authenticated using (owner_id = auth.uid());

create policy sync_conflicts_select on public.sync_conflicts for select to authenticated using (owner_id = auth.uid());
create policy sync_conflicts_insert on public.sync_conflicts for insert to authenticated with check (owner_id = auth.uid());
create policy sync_conflicts_update on public.sync_conflicts for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy sync_conflicts_delete on public.sync_conflicts for delete to authenticated using (owner_id = auth.uid());
