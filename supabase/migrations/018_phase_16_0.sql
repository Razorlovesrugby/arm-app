-- Phase 16.0: Multi-Tenant Database Architecture & Data Backfill
-- Idempotent — safe to re-run after a partial execution.
-- Uses IF NOT EXISTS / IF EXISTS / ON CONFLICT guards throughout.

-- ============================================================
-- Step 1: Create clubs table (IF NOT EXISTS — may already exist)
-- ============================================================
CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Step 2: Insert master club (ON CONFLICT — skip if already inserted)
-- ============================================================
INSERT INTO clubs (name) VALUES ('ARM15 Lite Master')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Step 3: Create profiles table (IF NOT EXISTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID REFERENCES auth.users(id) PRIMARY KEY,
  club_id    UUID REFERENCES clubs(id) NOT NULL,
  role       TEXT DEFAULT 'coach',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Step 4: Add club_id to all core tables (IF NOT EXISTS, nullable for backfill)
-- ============================================================
ALTER TABLE players                ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE depth_chart_order      ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE weeks                  ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE week_teams             ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE availability_responses ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE team_selections        ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE club_settings          ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE match_events           ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE training_attendance    ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE archive_game_notes     ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);

-- ============================================================
-- Step 5: Backfill all existing rows with the master club ID
--         WHERE clause skips rows already backfilled
-- ============================================================
UPDATE players                SET club_id = (SELECT id FROM clubs WHERE name = 'ARM15 Lite Master') WHERE club_id IS NULL;
UPDATE depth_chart_order      SET club_id = (SELECT id FROM clubs WHERE name = 'ARM15 Lite Master') WHERE club_id IS NULL;
UPDATE weeks                  SET club_id = (SELECT id FROM clubs WHERE name = 'ARM15 Lite Master') WHERE club_id IS NULL;
UPDATE week_teams             SET club_id = (SELECT id FROM clubs WHERE name = 'ARM15 Lite Master') WHERE club_id IS NULL;
UPDATE availability_responses SET club_id = (SELECT id FROM clubs WHERE name = 'ARM15 Lite Master') WHERE club_id IS NULL;
UPDATE team_selections        SET club_id = (SELECT id FROM clubs WHERE name = 'ARM15 Lite Master') WHERE club_id IS NULL;
UPDATE club_settings          SET club_id = (SELECT id FROM clubs WHERE name = 'ARM15 Lite Master') WHERE club_id IS NULL;
UPDATE match_events           SET club_id = (SELECT id FROM clubs WHERE name = 'ARM15 Lite Master') WHERE club_id IS NULL;
UPDATE training_attendance    SET club_id = (SELECT id FROM clubs WHERE name = 'ARM15 Lite Master') WHERE club_id IS NULL;
UPDATE archive_game_notes     SET club_id = (SELECT id FROM clubs WHERE name = 'ARM15 Lite Master') WHERE club_id IS NULL;

-- ============================================================
-- Step 6: Enforce NOT NULL — safe now that all rows are backfilled
-- ============================================================
ALTER TABLE players                ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE depth_chart_order      ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE weeks                  ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE week_teams             ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE availability_responses ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE team_selections        ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE club_settings          ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE match_events           ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE training_attendance    ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE archive_game_notes     ALTER COLUMN club_id SET NOT NULL;

-- ============================================================
-- Step 7: Performance indexes on club_id columns (IF NOT EXISTS)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_players_club_id                ON players(club_id);
CREATE INDEX IF NOT EXISTS idx_depth_chart_order_club_id      ON depth_chart_order(club_id);
CREATE INDEX IF NOT EXISTS idx_weeks_club_id                  ON weeks(club_id);
CREATE INDEX IF NOT EXISTS idx_week_teams_club_id             ON week_teams(club_id);
CREATE INDEX IF NOT EXISTS idx_availability_responses_club_id ON availability_responses(club_id);
CREATE INDEX IF NOT EXISTS idx_team_selections_club_id        ON team_selections(club_id);
CREATE INDEX IF NOT EXISTS idx_club_settings_club_id          ON club_settings(club_id);
CREATE INDEX IF NOT EXISTS idx_match_events_club_id           ON match_events(club_id);
CREATE INDEX IF NOT EXISTS idx_training_attendance_club_id    ON training_attendance(club_id);
CREATE INDEX IF NOT EXISTS idx_archive_game_notes_club_id     ON archive_game_notes(club_id);

-- ============================================================
-- Step 8: Enable RLS on new tables
-- ============================================================
ALTER TABLE clubs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 9: Drop old permissive authenticated policies (IF EXISTS)
--
-- PostgreSQL ORs permissive policies — any existing USING(true)
-- policy would allow unrestricted access and negate the new
-- club-scoped policies below. All old coach policies are dropped
-- and replaced. Existing anon policies are intentionally kept.
--
-- Sources:
--   002_rls.sql        → players, depth_chart_order, weeks,
--                        week_teams, availability_responses,
--                        team_selections
--   005_phase6.sql     → archive_game_notes
--   011_v2_pivot.sql   → club_settings, match_events
--   016_phase_15_1.sql → training_attendance
-- ============================================================
DROP POLICY IF EXISTS "coaches_all_players"                            ON players;
DROP POLICY IF EXISTS "coaches_all_depth_chart"                        ON depth_chart_order;
DROP POLICY IF EXISTS "coaches_all_weeks"                              ON weeks;
DROP POLICY IF EXISTS "coaches_all_week_teams"                         ON week_teams;
DROP POLICY IF EXISTS "coaches_all_availability"                       ON availability_responses;
DROP POLICY IF EXISTS "coaches_all_selections"                         ON team_selections;
DROP POLICY IF EXISTS "coaches_all_archive_game_notes"                 ON archive_game_notes;
DROP POLICY IF EXISTS "Club settings are viewable by authenticated users" ON club_settings;
DROP POLICY IF EXISTS "Club settings are updatable by authenticated users" ON club_settings;
DROP POLICY IF EXISTS "Match events are viewable by authenticated users"   ON match_events;
DROP POLICY IF EXISTS "Match events are insertable by authenticated users" ON match_events;
DROP POLICY IF EXISTS "Match events are updatable by authenticated users"  ON match_events;
DROP POLICY IF EXISTS "Match events are deletable by authenticated users"  ON match_events;
DROP POLICY IF EXISTS "Authenticated users can manage training_attendance" ON training_attendance;

-- ============================================================
-- Step 10: RLS policies — new tables
--          DROP IF EXISTS before each CREATE so re-runs are safe
--          (PostgreSQL has no CREATE POLICY IF NOT EXISTS)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read clubs" ON clubs;
CREATE POLICY "Authenticated users can read clubs"
  ON clubs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- ============================================================
-- Step 11: Club-scoped policies for authenticated users
--          Replaces every dropped policy from Step 9.
--          WITH CHECK ensures inserts/updates can't escape
--          the authenticated user's club.
-- ============================================================

-- Also drop any partial policy names the original DO block may have created
DROP POLICY IF EXISTS "Club-based access for players"               ON players;
DROP POLICY IF EXISTS "Club-based access for depth_chart_order"     ON depth_chart_order;
DROP POLICY IF EXISTS "Club-based access for weeks"                 ON weeks;
DROP POLICY IF EXISTS "Club-based access for week_teams"            ON week_teams;
DROP POLICY IF EXISTS "Club-based access for availability_responses" ON availability_responses;
DROP POLICY IF EXISTS "Club-based access for team_selections"       ON team_selections;
DROP POLICY IF EXISTS "Club-based access for club_settings"         ON club_settings;
DROP POLICY IF EXISTS "Club-based access for match_events"          ON match_events;
DROP POLICY IF EXISTS "Club-based access for training_attendance"   ON training_attendance;
DROP POLICY IF EXISTS "Club-based access for archive_game_notes"    ON archive_game_notes;
DROP POLICY IF EXISTS "Anonymous can insert players"                ON players;
DROP POLICY IF EXISTS "Anonymous can insert availability responses" ON availability_responses;
DROP POLICY IF EXISTS "Anonymous can read weeks for token lookup"   ON weeks;

DROP POLICY IF EXISTS "coaches_all_players"              ON players;
CREATE POLICY "coaches_all_players"
  ON players FOR ALL TO authenticated
  USING     (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "coaches_all_depth_chart"          ON depth_chart_order;
CREATE POLICY "coaches_all_depth_chart"
  ON depth_chart_order FOR ALL TO authenticated
  USING     (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "coaches_all_weeks"                ON weeks;
CREATE POLICY "coaches_all_weeks"
  ON weeks FOR ALL TO authenticated
  USING     (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "coaches_all_week_teams"           ON week_teams;
CREATE POLICY "coaches_all_week_teams"
  ON week_teams FOR ALL TO authenticated
  USING     (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "coaches_all_availability"         ON availability_responses;
CREATE POLICY "coaches_all_availability"
  ON availability_responses FOR ALL TO authenticated
  USING     (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "coaches_all_selections"           ON team_selections;
CREATE POLICY "coaches_all_selections"
  ON team_selections FOR ALL TO authenticated
  USING     (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "coaches_all_club_settings"        ON club_settings;
CREATE POLICY "coaches_all_club_settings"
  ON club_settings FOR ALL TO authenticated
  USING     (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "coaches_all_match_events"         ON match_events;
CREATE POLICY "coaches_all_match_events"
  ON match_events FOR ALL TO authenticated
  USING     (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "coaches_all_training_attendance"  ON training_attendance;
CREATE POLICY "coaches_all_training_attendance"
  ON training_attendance FOR ALL TO authenticated
  USING     (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "coaches_all_archive_game_notes"   ON archive_game_notes;
CREATE POLICY "coaches_all_archive_game_notes"
  ON archive_game_notes FOR ALL TO authenticated
  USING     (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id = (SELECT club_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- Anon policies — intentionally preserved from prior migrations
-- (002_rls.sql): anon_select_players, anon_insert_players,
--                anon_update_players, anon_select_weeks,
--                anon_insert_availability
-- NOTE: After Phase 16.2, anon inserts must supply a valid
-- club_id derived from the week's availability_link_token.
-- The NOT NULL constraint on club_id will reject any anon
-- insert that omits club_id until that logic is in place.
-- ============================================================
