# Database Schema Documentation

## Supabase Tables

### Core Tables

#### `players`
Table defined in Migration 001. Columns added by later migrations noted inline.
- **id**: UUID (Primary Key, auto-generated via uuid_generate_v4())
- **name**: TEXT (Required)
- **email**: TEXT (Required) 
- **phone**: TEXT (Required)
- **date_of_birth**: DATE (Required)
- **primary_position**: TEXT (Enum: 'Prop','Hooker','Lock','Flanker','Number 8','Scrum-half','Fly-half','Centre','Wing','Fullback','Unspecified')
- **secondary_positions**: JSONB (Default: '[]')
- **player_type**: TEXT (Default check removed in Migration 027 for dynamic types; values defined per club in club_settings.player_types)
- **status**: TEXT (Default: 'Active', Enum: 'Active','Injured','Unavailable','Retired','Archived'). 'Archived' added in Migration 005.
- **subscription_paid**: BOOLEAN (Default: false)
- **notes**: TEXT (Optional)
- **last_played_date**: DATE (Optional)
- **last_played_team**: TEXT (Optional)
- **historical_caps**: INTEGER (Default: 0) — Added in Migration 011. Pre-v2.0 caps count.
- **court_fines**: TEXT (Optional) — Added in Migration 011. Free-form disciplinary fines.
- **is_retired**: BOOLEAN (Default: false) — Added in Migration 011. Flag to filter from active lists.
- **club_id**: UUID (Foreign Key to clubs.id, NOT NULL) — Added in Migration 018/019, locked NOT NULL in Migration 020.
- **created_at**: TIMESTAMPTZ (Default: now())
- **updated_at**: TIMESTAMPTZ (Default: now()) — Auto-updated via trigger `players_updated_at`.

#### `depth_chart_order`
- **id**: UUID (Primary Key, auto-generated via uuid_generate_v4())
- **position**: TEXT (Required, Unique)
- **player_order**: JSONB (Default: '[]')
- **club_id**: UUID (Foreign Key to clubs.id, NOT NULL) — Added in Migration 018/019, locked NOT NULL in Migration 020.
- **updated_at**: TIMESTAMPTZ (Default: now())

#### `weeks`
- **id**: UUID (Primary Key, auto-generated via uuid_generate_v4())
- **start_date**: DATE (Required)
- **end_date**: DATE (Required)
- **label**: TEXT (Required)
- **status**: TEXT (Default: 'Open', Enum: 'Open','Closed')
- **availability_link_token**: TEXT (Required, Unique, auto-generated UUID)
- **club_id**: UUID (Foreign Key to clubs.id, NOT NULL) — Added in Migration 018/019, locked NOT NULL in Migration 020.
- **notes**: TEXT (Optional, max 1000 chars) — Added in Migration 013.
- **created_at**: TIMESTAMPTZ (Default: now())

#### `week_teams`
- **id**: UUID (Primary Key, auto-generated via uuid_generate_v4())
- **week_id**: UUID (Foreign Key to weeks.id, CASCADE delete)
- **team_name**: TEXT (Required)
- **sort_order**: INTEGER (Required)
- **starters_count**: INTEGER (Default: 15)
- **visible**: BOOLEAN (Default: true) — Added in Migration 006. Controls whether team tab shows on Selection Board.
- **is_active**: BOOLEAN (Default: true) — Added in Migration 008. False = bye week.
- **opponent**: TEXT (Optional, max 100 chars) — Added in Migration 013.
- **score_for**: INTEGER (Optional) — Added in Migration 011. Points scored.
- **score_against**: INTEGER (Optional) — Added in Migration 011. Points conceded.
- **match_report**: TEXT (Optional) — Added in Migration 011. Markdown-compatible match report.
- **club_id**: UUID (Foreign Key to clubs.id, NOT NULL) — Added in Migration 018/019, locked NOT NULL in Migration 020.
- **UNIQUE(week_id, team_name)** - No duplicate team names per week

#### `availability_responses`
- **id**: UUID (Primary Key, auto-generated via uuid_generate_v4())
- **week_id**: UUID (Foreign Key to weeks.id, CASCADE delete)
- **player_id**: UUID (Foreign Key to players.id, CASCADE delete)
- **availability**: TEXT (Enum: 'Available','TBC','Unavailable')
- **submitted_primary_position**: TEXT (Optional)
- **submitted_secondary_positions**: JSONB (Default: '[]')
- **availability_note**: TEXT (Optional) — Renamed from `note` in Migration 005.
- **club_id**: UUID (Foreign Key to clubs.id, NOT NULL) — Added in Migration 018/019, locked NOT NULL in Migration 020.
- **created_at**: TIMESTAMPTZ (Default: now())
- **Note**: No UNIQUE constraint — full history retained. Latest per player per week retrieved via ORDER BY created_at DESC LIMIT 1.
- **Trigger**: `on_unavailable_remove_from_selections` — On INSERT with availability='Unavailable', removes player from all team_selections for that week (Migration 009).

#### `team_selections`
- **id**: UUID (Primary Key, auto-generated via uuid_generate_v4())
- **week_id**: UUID (Foreign Key to weeks.id, CASCADE delete)
- **week_team_id**: UUID (Foreign Key to week_teams.id, CASCADE delete)
- **player_order**: JSONB (Default: '[]') — Ordered array of player UUIDs (order = shirt number). Sparse array where null = empty slot.
- **captain_id**: UUID (Foreign Key to players.id, ON DELETE SET NULL) — Added in Migration 006.
- **club_id**: UUID (Foreign Key to clubs.id, NOT NULL) — Added in Migration 018/019, locked NOT NULL in Migration 020.
- **saved_at**: TIMESTAMPTZ (Default: now())
- **UNIQUE(week_id, week_team_id)** — ON CONFLICT DO UPDATE in application.

### ARM 2.0 Pivot Tables (Phase 11+)

#### `club_settings` (Added in Migration 011)
- **id**: UUID (Primary Key, auto-generated)
- **club_name**: TEXT (Default: 'Belsize Park RFC')
- **primary_color**: TEXT (Default: '#1e40af' - blue)
- **secondary_color**: TEXT (Default: '#dc2626' - red)
- **logo_url**: TEXT (Optional)
- **default_teams**: TEXT[] (Optional, for pre-filling new weeks) — Added in Migration 013.
- **default_squad_size**: INTEGER (Default: 22, total players in squad) — Added in Migration 015.
- **require_positions_in_form**: BOOLEAN (Default: true, whether availability form asks for positions) — Added in Migration 015.
- **require_contact_info**: BOOLEAN (Default: false, whether availability form asks for email and phone) — Added in Migration 017.
- **require_birthday**: BOOLEAN (Default: false, whether availability form asks for birthday) — Added in Migration 017.
- **training_days**: JSONB (Default: '[{"id": "1", "label": "Wednesday"}]'::jsonb, array of {id, label} objects) — Added in Migration 016.
- **player_types**: TEXT[] (Default: ARRAY['Performance', 'Open', 'Women''s']) — Added in Migration 022 (Phase 16.8). Customizable per club.
- **club_id**: UUID (Foreign Key to clubs.id, NOT NULL) — Added in Migration 018/019, locked NOT NULL in Migration 020.
- **created_at**: TIMESTAMPTZ (Default: now())
- **updated_at**: TIMESTAMPTZ (Default: now())

#### `match_events` (Added in Migration 011)
- **id**: UUID (Primary Key, auto-generated)
- **week_id**: UUID (Foreign Key to weeks.id, CASCADE delete)
- **player_id**: UUID (Foreign Key to players.id, CASCADE delete)
- **week_team_id**: UUID (Foreign Key to week_teams.id, CASCADE delete)
- **event_type**: TEXT (Enum after Migration 014: 'try', 'conversion', 'penalty', 'drop_goal', 'mvp_3', 'mvp_2', 'mvp_1', 'dotd', 'yellow_card', 'red_card', 'Conversion Miss', 'Penalty Miss')
- **points**: INTEGER (Default: 0, no range CHECK constraint)
- **created_by**: UUID (Foreign Key to auth.users, Optional) — Added in Migration 011.
- **club_id**: UUID (Foreign Key to clubs.id, NOT NULL) — Added in Migration 018/019, locked NOT NULL in Migration 020.
- **created_at**: TIMESTAMPTZ (Default: now())
- **Index**: `idx_match_events_unique_mvp_dotd` — Partial unique index on (week_id, player_id, event_type) WHERE event_type IN ('mvp_3', 'mvp_2', 'mvp_1', 'dotd').

### Migration 012 Tables

#### `match_cards` (Added in Migration 012 — NOTE: Migration 012 only changes match_events CHECK constraint; no match_cards table was created)
- **Note**: The `match_cards` table mentioned in prior docs does not exist in the codebase. Migration 012 only modifies the `match_events` event_type CHECK constraint to add `yellow_card` and `red_card`.

### Migration 016 Tables (Phase 15.1 — Training Attendance)

#### `training_attendance` (Added in Migration 016)
- **id**: UUID (Primary Key, auto-generated)
- **player_id**: UUID (Foreign Key to players.id, CASCADE delete)
- **week_id**: UUID (Foreign Key to weeks.id, CASCADE delete)
- **session_id**: TEXT (Required, references training day ID from club_settings.training_days)
- **attended**: BOOLEAN (Default: false)
- **club_id**: UUID (Foreign Key to clubs.id, NOT NULL) — Added in Migration 018/019, locked NOT NULL in Migration 020.
- **created_at**: TIMESTAMPTZ (Default: now())
- **UNIQUE(player_id, week_id, session_id)** - One attendance record per player per session per week

### Migration 018 Tables (Phase 16.0 — Multi-Tenant Architecture)

#### `clubs` (Added in Migration 018/019)
- **id**: UUID (Primary Key, auto-generated)
- **name**: TEXT (Required)
- **created_at**: TIMESTAMPTZ (Default: now())

#### `profiles` (Added in Migration 018/019)
- **id**: UUID (References auth.users(id) PRIMARY KEY)
- **club_id**: UUID (Foreign Key to clubs.id, NULLABLE) — Made nullable in Migration 025 for RDO users with no home club.
- **role**: TEXT (Default: 'coach', CHECK constraint: role IN ('coach', 'rdo')) — CHECK constraint added in Migration 021.
- **created_at**: TIMESTAMPTZ (Default: now())

#### `rdo_club_access` (Added in Migration 021)
- **user_id**: UUID (References auth.users(id) ON DELETE CASCADE)
- **club_id**: UUID (References clubs(id) ON DELETE CASCADE)
- **created_at**: TIMESTAMPTZ (Default: now())
- **PRIMARY KEY**: (user_id, club_id) - Composite primary key ensures unique mappings
- **Index**: idx_rdo_club_access_user_club for EXISTS subquery performance in RLS policies

### Migration 023 Tables (Phase 17.6 — RDO Settings)

#### `rdo_facilities` (Added in Migration 023 — Phase 17.6)
- **id**: UUID (Primary Key, auto-generated via gen_random_uuid())
- **rdo_user_id**: UUID (Foreign Key to auth.users(id), ON DELETE CASCADE, NOT NULL)
- **name**: TEXT (NOT NULL)
- **facility_type**: TEXT (CHECK: 'Pitch', 'Training Grid', 'Gym', 'Clubhouse', 'Off-Site')
- **is_active**: BOOLEAN (Default: true)
- **created_at**: TIMESTAMPTZ (Default: now())

### RPC Functions

#### `close_week(p_week_id UUID)` (Migration 010)
- SECURITY DEFINER. Sets week status to 'Closed', updates player last-played fields, upserts archive_game_notes.

#### `calculate_player_caps(p_player_id UUID)` → INTEGER (Migration 011, patched in Migration 028)
- Returns total caps = historical_caps + count of unique weeks where player was in lineup slots 1-23 and week_team has a recorded score.
- **Migration 028**: Converted from SECURITY INVOKER to SECURITY DEFINER to bypass RLS when scanning team_selections/week_teams.

#### `get_player_last_selections(p_week_id UUID)` → TABLE (Migration 007)
- Returns each player's most recent historical team selection, excluding the specified active week.

#### `get_rfc_player_pool(user_uuid UUID)` → TABLE (Migration 023 — Phase 17.5)
- SECURITY DEFINER. Returns all players across every club mapped to the calling RDO user, with current-week availability status.

#### `rename_custom_player_type(club_uuid UUID, old_type TEXT, new_type TEXT)` → JSONB (Migration 027 — Phase 17.8)
- SECURITY DEFINER. Batch-renames player_type values in batches of 50 with SKIP LOCKED.

#### `merge_players(primary_id UUID, duplicate_id UUID)` → void (Migration 033, patched in Migration 034)
- SECURITY DEFINER. Merges a duplicate player into a primary player, transferring availability responses, training attendance, match events, archive game notes, and captain pointers. Replaces duplicate UUID references in jsonb player_order arrays. Deletes the duplicate player on completion.
- **Migration 034**: Fixed jsonb array manipulation — replaced native pg array functions (array_replace/ANY) with jsonb operators (jsonb_agg/jsonb_array_elements) for compatibility with jsonb player_order columns.

### Multi-Tenant Columns (Added in Migration 018/019, locked NOT NULL in Migration 020)

- **players.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **depth_chart_order.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **weeks.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **week_teams.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **availability_responses.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **team_selections.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **club_settings.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **match_events.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **training_attendance.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)
- **archive_game_notes.club_id**: UUID (Foreign Key to clubs.id, NOT NULL)

## Migrations Tracker

### Migration Files (Chronological Order)

1. **001_schema.sql** - Initial schema: players, depth_chart_order, weeks, week_teams, availability_responses, team_selections
2. **002_rls.sql** - Row Level Security policies for all tables (original permissive policies, later replaced)
3. **003_seed.sql** - Initial seed data
4. **004_availability_positions.sql** - No-op (columns already present in 001). Safe to run.
5. **005_phase6.sql** - Phase 6: rename availability_responses.note → availability_note; add 'Archived' to players.status; create archive_game_notes table with RLS
6. **006_cp7a.sql** - CP7-A: Add week_teams.visible, team_selections.captain_id
7. **007_cp7b.sql** - CP7-B: get_player_last_selections RPC function
8. **008_cp8_schema.sql** - CP8 Schema: add week_teams.is_active, archive_game_notes.player_type_snapshot, archive_game_notes.position_snapshot
9. **009_cp8_trigger.sql** - CP8 Trigger: "Global Unavailable" — remove player from team_selections on Unavailable submission
10. **010_cp8_close_week_rpc.sql** - CP8: close_week RPC function (SECURITY DEFINER)
11. **011_v2_pivot.sql** - ARM 2.0 Pivot: club_settings table, match_events table, players.historical_caps, players.court_fines, players.is_retired, week_teams.score_for/score_against/match_report, calculate_player_caps RPC
12. **012_match_cards.sql** - Extend match_events event_type CHECK to include 'yellow_card', 'red_card'
13. **013_phase_12_6.sql** - Phase 12.6: club_settings.default_teams, weeks.notes, week_teams.opponent
14. **014_phase_14.sql** - Phase 14.3: Extend match_events event_type CHECK to include 'Conversion Miss', 'Penalty Miss'
15. **015_phase_14_4.sql** - Phase 14.4: Club Settings Expansion (default_squad_size, require_positions_in_form)
16. **016_phase_15_1.sql** - Phase 15.1: Training Attendance (training_attendance table, club_settings.training_days column)
17. **017_phase_15_2.sql** - Phase 15.2: Availability Form Data Collection Mode (require_contact_info, require_birthday)
18. **018_phase_16_0.sql** - Phase 16.0: Multi-Tenant Architecture (clubs, profiles tables, club_id columns, backfill, NOT NULL, indexes, RLS policies — club-scoped)
19. **019_phase_16_1_expand.sql** - Phase 16.1: Database Expansion & Safe Backfill (clubs, profiles, club_id columns DDL + DML backfill, no NOT NULL or RLS)
20. **020_phase_16_3_lockdown.sql** - Phase 16.3: Database Lockdown (pre-flight orphan check, NOT NULL, indexes, RLS on all tenant tables, club-scoped coach policies, anon policies for public form, service_role bypass)
21. **021_phase_17_1_rdo_layer.sql** - Phase 17.1: RDO Data Layer & RLS Expansion (profiles.role column + CHECK, rdo_club_access table, expanded RLS with OR logic for RDOs)
22. **022_phase_16_8_player_types.sql** - Phase 16.8: Custom Player Types (club_settings.player_types array, no new column on players)
23. **023_phase_17_5_rfc_pool.sql** - Phase 17.5: get_rfc_player_pool RPC, performance indexes for cross-club player scan and open-week lookup
24. **023_phase_17_6_rdo_settings.sql** - Phase 17.6: rdo_facilities table, RLS policies (same file number as 023 — coexists as separate file)
25. **024_seed_rdo_test_data.sql** - Seed: College Rifles RDO test data (4 clubs, players, availability, match events)
26. **025_profiles_club_id_nullable.sql** - Phase 17.x: Make profiles.club_id nullable for RDO users with no home club
27. **026_fix_rdo_seed.sql** - Fix: Re-run RDO seed with idempotency guard and auth.users existence check
28. **027_phase_17_8_player_type_cascade.sql** - Phase 17.8: Drop players.player_type CHECK constraint, add performance index, create rename_custom_player_type RPC
30. **029_phase_17_9_2_caps_materialized.sql** - Phase 17.9.2: Add total_caps column to players, refresh_player_caps function, caps synchronization triggers on team_selections and week_teams
31. **030_phase_17_9_2_caps_fix.sql** - Phase 17.9.2 fix: Additional caps synchronization fixes
32. **031_phase_17_9_2_get_club_players_rpc.sql** - Phase 17.9.2: get_club_players RPC for optimized player fetching
33. **032_phase_17_9_3_caps_historical_trigger.sql** - Phase 17.9.3: Trigger to sync total_caps when historical_caps changes
34. **033_merge_players_rpc.sql** - Phase 19.0: Player Merge RPC — SECURITY DEFINER function to merge duplicate players into primary, transferring availability, training, match events, archive notes, and captain pointers, then deleting the duplicate. Uses native pg array functions (array_replace/ANY).
35. **034_fix_merge_players_jsonb.sql** - Phase 19.0.1: Fix merge_players RPC — replace native pg array functions with jsonb operators (jsonb_agg/jsonb_array_elements) for jsonb player_order columns on team_selections and depth_chart_order

### Migration Notes
- All migrations are idempotent (safe to run multiple times)
- Use `CREATE TABLE IF NOT EXISTS` for forward compatibility
- Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for schema evolution
- Triggers are created with `CREATE OR REPLACE FUNCTION`
- `006_cp7a.sql copy` is a duplicate of 006; the intended file is `006_cp7a.sql` (without "copy")

## RLS (Row Level Security) Rules

### General Principles (Phase 16+)
1. **Authenticated Users Only**: Most tables require authentication
2. **Club-Scoped Access**: All tenant tables use `club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())`
3. **RDO Expansion**: RDOs additionally have access via `EXISTS (SELECT 1 FROM rdo_club_access WHERE user_id = auth.uid() AND club_id = table.club_id)`
4. **Service Role Bypass**: All tenant tables have a `*_service_role` policy with USING (true) for admin operations
5. **Anonymous Policies**: Public availability form has surgical anon access (week lookup by token, club_settings read, player select/insert/update, availability_response insert)

### Table-Specific RLS Policies (Current State — Post Phase 17.1)

All 10 core tables follow the same pattern (using `players` as example):
```sql
-- Authenticated (coach + RDO) access with OR logic
CREATE POLICY players_coach_all ON players
  FOR ALL TO authenticated
  USING (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = players.club_id
    )
  )
  WITH CHECK (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = players.club_id
    )
  );

-- Service role bypass
CREATE POLICY players_service_role ON players
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

#### Core Tables with this pattern:
- **players** → `players_coach_all`, `players_service_role`
- **depth_chart_order** → `depth_chart_order_coach_all`, `depth_chart_order_service_role`
- **weeks** → `weeks_coach_all`, `weeks_service_role`
- **week_teams** → `week_teams_coach_all`, `week_teams_service_role`
- **availability_responses** → `availability_responses_coach_all`, `availability_responses_service_role`
- **team_selections** → `team_selections_coach_all`, `team_selections_service_role`
- **club_settings** → `club_settings_coach_all`, `club_settings_service_role`
- **match_events** → `match_events_coach_all`, `match_events_service_role`
- **training_attendance** → `training_attendance_coach_all`, `training_attendance_service_role`
- **archive_game_notes** → `archive_game_notes_coach_all`, `archive_game_notes_service_role`

#### Profiles (self-scoped — no recursion):
- `profiles_self_select`: FOR SELECT TO authenticated USING (auth.uid() = id)
- `profiles_self_update`: FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id)
- `profiles_service_role`: FOR ALL TO service_role USING (true)

#### Clubs:
- `clubs_coach_select`: FOR SELECT TO authenticated USING (id IN (SELECT club_id FROM profiles WHERE id = auth.uid()))
- `clubs_service_role`: FOR ALL TO service_role USING (true)

#### rdo_club_access:
- `rdo_club_access_self_select`: FOR SELECT TO authenticated USING (auth.uid() = user_id)
- `rdo_club_access_service_role`: FOR ALL TO service_role USING (true)

#### rdo_facilities:
- `rdo_facilities_rdo_all`: FOR ALL TO authenticated USING (rdo_user_id = auth.uid())
- `rdo_facilities_coach_read`: FOR SELECT TO authenticated USING (EXISTS via rdo_club_access mapping)

#### Anonymous Policies (Public Availability Form — Migration 020):
- **weeks**: `weeks_anon_select_by_token` — FOR SELECT TO anon USING (availability_link_token IS NOT NULL)
- **club_settings**: `club_settings_anon_select` — FOR SELECT TO anon USING (true)
- **players**: `players_anon_select` / `players_anon_insert` / `players_anon_update` — scoped by club_id IS NOT NULL
- **availability_responses**: `availability_responses_anon_insert` — FOR INSERT TO anon WITH CHECK (club_id IS NOT NULL)

### RLS Implementation Pattern
```sql
-- Enable RLS on table
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated coach/RDO access (club-scoped)
CREATE POLICY "table_name_coach_all"
  ON table_name FOR ALL
  TO authenticated
  USING (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = table_name.club_id
    )
  );
```

### Security Notes
- **Auth Integration**: Uses Supabase Auth `auth.uid()` for user identification
- **Cascading Deletes**: Carefully implemented to maintain referential integrity
- **Audit Trails**: `created_at` and `updated_at` timestamps on all tables
- **Soft Deletes**: Preferred over hard deletes (use status fields). `players.status` includes 'Archived' for soft-delete.
- **Data Validation**: CHECK constraints enforce data integrity at DB level
- **Profiles Recursion Protection**: Profiles RLS uses `auth.uid() = id` to avoid infinite recursion when other policies subquery `profiles.club_id`
- **RDO Profiles**: RDO users have `profiles.club_id = NULL` with access managed via `rdo_club_access`
