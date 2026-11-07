# Focus Space CloudBase PG data-layer design (Phase 2A)

This document and `0002_data_layer_pending.sql` are review artifacts only. No migration in this phase has been executed against CloudBase.

## Current client data model

`public/app.js` currently persists one aggregate state object under `STORAGE_KEY = focus-space-state-v2`, mirrored into IndexedDB database `focus-space-local-v1`, object store `workspace`, key `current`.

- Preferences: `theme`, `scene`, `timerStyle`, `clockStyle`, `preset`, `encouragement`, `reduceMotion`, `layoutOrder`, `layoutHidden`.
- Task: `{ id, title, tag, done }`; IDs are client strings such as `task-...`.
- Schedule: `{ id, title, time, meta }`; IDs are client strings such as `schedule-...`.
- Notes: `notes` (quick capture) and `fullNote` (full editor).
- Focus session: `{ id, startedAt, endedAt, date, plannedSeconds, actualSeconds, intention, outcome, mood, interruptions, nextStep, reflection, createdAt, updatedAt }`; IDs are client strings such as `session-...`.
- Timer runtime: `mode`, `phase`, `duration`, `startedAt`, `elapsedBeforeStart`, `sessionId`; it must never be uploaded as a replacement for completed session records.

## Proposed ER relationships

```text
Authenticated user (auth.uid() : text)
  ├── user_preferences (1:1)
  ├── tasks (1:N)
  ├── schedule_items (1:N)
  ├── workspace_notes (1:N by note_key)
  ├── focus_sessions (1:N)
  ├── note_versions (1:N)
  ├── sync_metadata (1:N by device_id)
  └── sync_conflicts (1:N)
```

All owner fields are `text` to match CloudBase PG `auth.uid()`. Client IDs remain text so offline IDs remain idempotent and do not require a destructive UUID rewrite.

## First-login migration

1. Keep the Guest IndexedDB/localStorage state unchanged.
2. Read the authenticated session and fetch only that user's cloud records.
3. Display local/cloud counts for tasks, schedule items, notes, sessions, and preferences.
4. If cloud is empty, ask for explicit migration approval; upload records with original client IDs and `version = 1`.
5. If cloud is non-empty, merge by `(table, id)` or `(owner_id, note_key)` and compare `version` plus `updated_at`.
6. Keep local records that have no cloud match; keep cloud records that have no local match.
7. Create `sync_conflicts` and `note_versions` rows when both sides changed the same logical record.
8. Mark migration complete only after counts and IDs are re-read and verified. Never clear Guest storage automatically.

## Incremental sync

- Local IndexedDB remains the write path.
- Each local mutation gets an idempotent record ID, incremented `version`, `updated_at`, and a tombstone (`deleted_at`) for deletes.
- A future `sync_outbox` object store should be added through an IndexedDB version upgrade without deleting `workspace`.
- Upload batches are conditional on `(id, version)` and are retried with exponential backoff.
- Download uses a server cursor from `sync_metadata`; records are applied only when the incoming version is newer or when a conflict is recorded.
- `sync_metadata.sync_status` is `local`, `syncing`, `synced`, `offline`, `failed`, or `conflict`. The UI must not show `synced` until a real CloudBase write/read round trip succeeds.

## Note conflicts

For the same owner and note key, if local and remote versions both advanced from the last known base, write both bodies into `note_versions` under one `conflict_group_id` and create a `sync_conflicts` row. The UI presents local and remote bodies, then records an explicit `local_selected`, `remote_selected`, or `merged` resolution. No last-write-wins fallback is allowed.

## CDC follow-up

Do not enable or assume PostgreSQL CDC in this phase. First validate CloudBase's supported CDC/Realtime surface for PG mode and its interaction with PostgREST/RLS. The initial sync protocol uses explicit cursors and versions so it remains correct without realtime subscriptions.
