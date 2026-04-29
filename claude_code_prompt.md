# Prompt for Claude Code — Availability Migration SQL

Copy everything below the line into Claude Code.

---

I need you to generate a single idempotent SQL migration file (Postgres / Supabase) that marks a specific list of 22 players as `Available` for a given week in the `availability_responses` table.

## Target week
- `week_id` = `ee946f57-5d3b-4726-9e2c-ed9fe30c6073`
- This week's `availability_link_token` in the `weeks` table = `64d132d3-4fc7-4e39-9532-0d89d0b78b5c` (already verified — use this as a sanity check inside the migration: the `weeks` row with the above id MUST have this token, else `RAISE EXCEPTION`).

## Relevant tables

### `players`
Columns: `id uuid PK`, `name text`, `email text`, `phone text`, `date_of_birth date`, `primary_position text null`, `secondary_positions jsonb`, `player_type text`, `status text`, `subscription_paid bool`, `notes text null`, `last_played_date date null`, `last_played_team text null`, `created_at timestamptz`, `updated_at timestamptz`, `historical_caps int4`, `court_fines text null`, `is_retired bool`, `club_id uuid`, `total_caps int4`.

### `availability_responses`
Columns: `id uuid PK`, `week_id uuid`, `player_id uuid`, `availability text`, `submitted_primary_position text null`, `submitted_secondary_positions jsonb`, `availability_note text null`, `created_at timestamptz`, `club_id uuid`.

### `weeks`
Contains `id`, `availability_link_token`, `club_id` — use this to derive the club_id dynamically.

## Player list (mark each as `Available`)
Ignore the jersey numbers next to each name. All of these players **already exist in the `players` table** except for Miguel (the only new one).

1. Oliver Redman
2. Jamie Wall
3. Jack Alston
4. Max Dallow
5. Kyle Reid
6. River Alderton
7. Andrew Sterrit
8. Miguel ← **does not exist yet, must be inserted**
9. Taylen Patterson
10. Cam Lister
11. Luke Buckingham
12. George Murray
13. James Alley
14. Rogan Hand
15. Myles Soa
16. Justin Abrau
17. Eli Lesoa
18. Adrian Sua
19. Zac Ross
20. Jude Farrel
21. Jayden Davidson
22. Harry Allen

## Requirements

1. **Derive `club_id` dynamically** from `weeks.club_id` where `weeks.id = 'ee946f57-5d3b-4726-9e2c-ed9fe30c6073'`. Do NOT hardcode it.

2. **Sanity check up front** — the migration must verify that the `weeks` row with id `ee946f57-5d3b-4726-9e2c-ed9fe30c6073` has `availability_link_token = '64d132d3-4fc7-4e39-9532-0d89d0b78b5c'`. Raise an exception and roll back if it doesn't match.

3. **For the 21 existing players** (everyone except Miguel):
   - Look up each player by a **case-insensitive, trimmed match** on `players.name`, scoped to the derived `club_id`.
   - If any of them cannot be matched, `RAISE NOTICE` with the name and continue (do not abort the whole migration — just skip and flag in the summary at the end).

4. **For Miguel** (new player), INSERT into `players` with these defaults:
   - `id` = `gen_random_uuid()`
   - `name` = `'Miguel'`
   - `email` = `'miguel@email.com'`
   - `phone` = `''`
   - `date_of_birth` = `'2000-01-01'`
   - `primary_position` = `NULL`
   - `secondary_positions` = `'[]'::jsonb`
   - `player_type` = leave as whatever default the column has, or copy the most common value already present in `players` for that `club_id` — pick whichever is safest; if neither is possible, use `'Senior'`
   - `status` = `'Active'`
   - `subscription_paid` = `false`
   - `historical_caps` = `0`
   - `total_caps` = `0`
   - `is_retired` = `false`
   - `club_id` = the derived club_id
   - `created_at` / `updated_at` = `now()`
   - Only insert Miguel if a player with `LOWER(TRIM(name)) = 'miguel'` for this club_id does not already exist (idempotent re-runs).

5. **For every player in the list** (existing + newly inserted Miguel), INSERT into `availability_responses`:
   - `id` = `gen_random_uuid()`
   - `week_id` = `'ee946f57-5d3b-4726-9e2c-ed9fe30c6073'`
   - `player_id` = the resolved player id
   - `availability` = `'Available'`
   - `submitted_primary_position` = `NULL`
   - `submitted_secondary_positions` = `'[]'::jsonb`
   - `availability_note` = `NULL`
   - `created_at` = `now()`
   - `club_id` = derived club_id
   - **Do NOT create duplicates.** If a row already exists for `(week_id, player_id)`, UPDATE that existing row's `availability` to `'Available'` instead of inserting a new one. Use `ON CONFLICT` if a unique constraint exists; otherwise implement this with an explicit `IF EXISTS` / `UPDATE` / `ELSE INSERT` pattern.

6. Wrap the entire script in a single `BEGIN; ... COMMIT;` transaction so it's all-or-nothing.

7. Use a `DO $$ ... $$` block with a loop over an array of the names so the script is readable and not 22 copy-pasted blocks.

8. At the end, `SELECT` (or `RAISE NOTICE`) a summary showing, for each of the 22 names: player name, resolved player_id, whether they were newly created (Miguel), whether the availability row was inserted or updated, and any players that couldn't be matched.

## Deliverable
One `.sql` file named `migrate_availability_week_ee946f57.sql`. Do NOT execute it — just produce the file so I can review it first.
