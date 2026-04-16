-- Migration 021: Phase 17.1 — RDO Data Layer & RLS Expansion
-- Introduces the "ARM15 MAX" enterprise tier for Rugby Development Officers.
--
-- What this does:
--   1. Ensures profiles.role column exists with a CHECK constraint.
--   2. Creates rdo_club_access bridging table with RLS.
--   3. Expands RLS policies on all 10 core tables to allow RDO access
--      via rdo_club_access mappings (OR logic alongside existing coach logic).
--
-- Design notes:
--   - All schema changes are idempotent (IF NOT EXISTS / DO $$ checks).
--   - Existing coach policies are dropped and recreated with expanded USING/WITH CHECK.
--   - Service role bypass and anon availability policies are UNTOUCHED.
--   - Composite index on rdo_club_access(user_id, club_id) ensures fast EXISTS subqueries.

-- ============================================================
-- STEP 1: Ensure profiles.role column exists with constraint
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'coach';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_check'
  ) THEN
    -- Backfill any rows with non-conforming role values before adding constraint
    UPDATE profiles
      SET role = 'coach'
      WHERE role NOT IN ('coach', 'rdo');
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('coach', 'rdo'));
  END IF;
END $$;

-- ============================================================
-- STEP 2: Create rdo_club_access bridging table
-- ============================================================
CREATE TABLE IF NOT EXISTS rdo_club_access (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id    UUID REFERENCES clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, club_id)
);

-- Enable RLS on the new table
ALTER TABLE rdo_club_access ENABLE ROW LEVEL SECURITY;

-- Performance index for EXISTS subqueries in core-table policies
CREATE INDEX IF NOT EXISTS idx_rdo_club_access_user_club
  ON rdo_club_access(user_id, club_id);

-- ============================================================
-- STEP 3: RLS Policies for rdo_club_access
-- ============================================================
DROP POLICY IF EXISTS rdo_club_access_self_select ON rdo_club_access;
CREATE POLICY rdo_club_access_self_select ON rdo_club_access
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS rdo_club_access_service_role ON rdo_club_access;
CREATE POLICY rdo_club_access_service_role ON rdo_club_access
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- STEP 4: Expand RLS policies on all 10 core tables
-- Each coach policy is dropped and recreated with an added OR branch
-- that allows RDOs mapped via rdo_club_access.
-- Service role and anon policies are left untouched.
-- ============================================================

-- players
DROP POLICY IF EXISTS players_coach_all ON players;
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

-- depth_chart_order
DROP POLICY IF EXISTS depth_chart_order_coach_all ON depth_chart_order;
CREATE POLICY depth_chart_order_coach_all ON depth_chart_order
  FOR ALL TO authenticated
  USING (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = depth_chart_order.club_id
    )
  )
  WITH CHECK (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = depth_chart_order.club_id
    )
  );

-- weeks
DROP POLICY IF EXISTS weeks_coach_all ON weeks;
CREATE POLICY weeks_coach_all ON weeks
  FOR ALL TO authenticated
  USING (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = weeks.club_id
    )
  )
  WITH CHECK (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = weeks.club_id
    )
  );

-- week_teams
DROP POLICY IF EXISTS week_teams_coach_all ON week_teams;
CREATE POLICY week_teams_coach_all ON week_teams
  FOR ALL TO authenticated
  USING (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = week_teams.club_id
    )
  )
  WITH CHECK (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = week_teams.club_id
    )
  );

-- availability_responses
DROP POLICY IF EXISTS availability_responses_coach_all ON availability_responses;
CREATE POLICY availability_responses_coach_all ON availability_responses
  FOR ALL TO authenticated
  USING (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = availability_responses.club_id
    )
  )
  WITH CHECK (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = availability_responses.club_id
    )
  );

-- team_selections
DROP POLICY IF EXISTS team_selections_coach_all ON team_selections;
CREATE POLICY team_selections_coach_all ON team_selections
  FOR ALL TO authenticated
  USING (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = team_selections.club_id
    )
  )
  WITH CHECK (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = team_selections.club_id
    )
  );

-- club_settings
DROP POLICY IF EXISTS club_settings_coach_all ON club_settings;
CREATE POLICY club_settings_coach_all ON club_settings
  FOR ALL TO authenticated
  USING (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = club_settings.club_id
    )
  )
  WITH CHECK (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = club_settings.club_id
    )
  );

-- match_events
DROP POLICY IF EXISTS match_events_coach_all ON match_events;
CREATE POLICY match_events_coach_all ON match_events
  FOR ALL TO authenticated
  USING (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = match_events.club_id
    )
  )
  WITH CHECK (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = match_events.club_id
    )
  );

-- training_attendance
DROP POLICY IF EXISTS training_attendance_coach_all ON training_attendance;
CREATE POLICY training_attendance_coach_all ON training_attendance
  FOR ALL TO authenticated
  USING (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = training_attendance.club_id
    )
  )
  WITH CHECK (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = training_attendance.club_id
    )
  );

-- archive_game_notes
DROP POLICY IF EXISTS archive_game_notes_coach_all ON archive_game_notes;
CREATE POLICY archive_game_notes_coach_all ON archive_game_notes
  FOR ALL TO authenticated
  USING (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = archive_game_notes.club_id
    )
  )
  WITH CHECK (
    club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM rdo_club_access
      WHERE user_id = auth.uid() AND club_id = archive_game_notes.club_id
    )
  );

-- ============================================================
-- ROLLBACK SQL (copy and run manually if needed)
-- ============================================================
-- DO $$
-- DECLARE
--   tbl TEXT;
--   core_tables TEXT[] := ARRAY[
--     'players', 'depth_chart_order', 'weeks', 'week_teams',
--     'availability_responses', 'team_selections', 'club_settings',
--     'match_events', 'training_attendance', 'archive_game_notes'
--   ];
-- BEGIN
--   FOREACH tbl IN ARRAY core_tables
--   LOOP
--     EXECUTE format('DROP POLICY IF EXISTS %I_coach_all ON %I', tbl, tbl);
--     EXECUTE format('
--       CREATE POLICY %I_coach_all ON %I
--         FOR ALL TO authenticated
--         USING (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()))
--         WITH CHECK (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()))
--     ', tbl, tbl);
--   END LOOP;
-- END $$;
-- DROP TABLE IF EXISTS rdo_club_access CASCADE;
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
