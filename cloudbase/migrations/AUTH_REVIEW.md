# CloudBase Auth foundation SQL review

This phase does not execute or alter `0001_focus_space.sql`.

Findings:

- `current_setting('app.user_id', true)` is an application-defined session variable; the browser SDK does not guarantee that it is populated for PostgreSQL requests.
- RLS policies are present, but table-level `GRANT` statements and an explicit CloudBase JWT-to-database identity bridge are not defined.
- The migration uses UUID primary keys while the current local data uses IDs such as `task-...` and `session-...`. Uploading those values directly would fail or silently require an unsafe ID rewrite.
- `schedule_items.starts_at` is a timestamp while the current local schedule model stores a display time string.

Next-stage recommendation:

1. Confirm the CloudBase PG JWT identity function/expression for the selected environment and use that same expression in RLS policies.
2. Add explicit least-privilege grants for the authenticated database role before applying policies.
3. Preserve client IDs as text columns (or add a deterministic `client_id text unique` alongside server UUIDs) so offline records remain idempotent.
4. Store schedule `date`, `start_time`, and optional `end_time` separately, then derive timestamps in the repository layer.
5. Add `sync_metadata` and `note_versions` only in the sync phase after the authenticated identity path is verified.
