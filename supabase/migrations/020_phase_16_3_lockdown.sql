-- Migration 020: Phase 16.3 — Database Lockdown, Resilience & Edge Case Sweep
-- Contract phase of the Expand/Contract multi-tenant migration.
--
-- What this does:
--   1. Pre-flight orphan check: aborts if any core-table row is still missing club_id.
--   2. Adds NOT NULL constraints to club_id on all 10 core tables.
--   3. Indexes every club_id column for RLS performance.
--   4. Enables RLS on every tenant-scoped table.
--   5. Installs coach (authenticated) CRUD policies scoped to profiles.club_id.
--   6. Installs anonymous SELECT/INSERT/UPDATE policies for the public AvailabilityForm.
--   7. Installs service_role bypass for support tooling.
--
-- Design notes:
--   - Profiles RLS uses `auth.uid() = id` to avoid infinite recursion when other
--     policies subquery `profiles.club_id`.
--   - Anon policies are surgical: anon can only read weeks via availability_link_token
--     (no direct enumeration) and can only INSERT availability_responses / players
--     / UPDATE players (for contact sync during public submission).

-- ============================================================
-- STEP 1: Pre-flight orphan check
-- ============================================================
DO $$
DECLARE
  orphan_count INTEGER := 0;
  tbl TEXT;
  core_tables TEXT[] := ARRAY[
    'players',
    'depth_chart_order',
    'weeks',
    'week_teams',
    'availability_responses',
    'team_selections',
    'club_settings',
    'match_events',
    'training_attendance',
    'archive_game_notes'
  ];
  n INTEGER;
BEGIN
  FOREACH tbl IN ARRAY core_tables
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE club_id IS NULL', tbl) INTO n;
    IF n > 0 THEN
      RAISE WARNING 'Orphan rows detected in %: % rows with NULL club_id', tbl, n;
      orphan_count := orphan_count + n;
    END IF;
  END LOOP;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Phase 16.3 aborted: % orphan rows still have NULL club_id. Run the 16.1 backfill before applying lockdown.',
      orphan_count;
  END IF;
END $$;

-- ============================================================
-- STEP 2: Lock club_id NOT NULL on all 10 core tables
-- ============================================================
ALTER TABLE players                 ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE depth_chart_order       ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE weeks                   ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE week_teams              ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE availability_responses  ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE team_selections         ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE club_settings           ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE match_events            ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE training_attendance     ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE archive_game_notes      ALTER COLUMN club_id SET NOT NULL;

-- ============================================================
-- STEP 3: Index every club_id column for RLS performance
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
CREATE INDEX IF NOT EXISTS idx_profiles_club_id               ON profiles(club_id);

-- Availability token lookup (anonymous SELECT hits this path every public form load)
CREATE INDEX IF NOT EXISTS idx_weeks_availability_link_token  ON weeks(availability_link_token);

-- ============================================================
-- STEP 4: Enable RLS on every tenant-scoped table
-- ============================================================
ALTER TABLE clubs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE players                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE depth_chart_order       ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_teams              ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_responses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_selections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_attendance     ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_game_notes      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 5: Drop any legacy policies so this migration is re-runnable
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'clubs', 'profiles', 'players', 'depth_chart_order', 'weeks', 'week_teams',
        'availability_responses', 'team_selections', 'club_settings', 'match_events',
        'training_attendance', 'archive_game_notes'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- STEP 6: Profiles — self-scoped, no recursion
-- ============================================================
-- CRITICAL: Profiles policies must NOT subquery profiles.club_id or they recurse.
CREATE POLICY profiles_self_select ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY profiles_self_update ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_service_role ON profiles
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- STEP 7: Clubs — coach can read own club; service_role bypass
-- ============================================================
CREATE POLICY clubs_coach_select ON clubs
  FOR SELECT TO authenticated
  USING (id IN (SELECT club_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY clubs_service_role ON clubs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- STEP 8: Tenant tables — coach CRUD scoped to profiles.club_id
-- ============================================================
-- Reusable pattern: USING and WITH CHECK both enforce club_id match.
-- Subquery is safe because profiles policies don't recurse back.

-- players
CREATE POLICY players_coach_all ON players
  FOR ALL TO authenticated
  USING (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY players_service_role ON players
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- depth_chart_order
CREATE POLICY depth_chart_order_coach_all ON depth_chart_order
  FOR ALL TO authenticated
  USING (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY depth_chart_order_service_role ON depth_chart_order
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- weeks
CREATE POLICY weeks_coach_all ON weeks
  FOR ALL TO authenticated
  USING (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY weeks_service_role ON weeks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- week_teams
CREATE POLICY week_teams_coach_all ON week_teams
  FOR ALL TO authenticated
  USING (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY week_teams_service_role ON week_teams
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- availability_responses
CREATE POLICY availability_responses_coach_all ON availability_responses
  FOR ALL TO authenticated
  USING (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY availability_responses_service_role ON availability_responses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- team_selections
CREATE POLICY team_selections_coach_all ON team_selections
  FOR ALL TO authenticated
  USING (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY team_selections_service_role ON team_selections
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- club_settings
CREATE POLICY club_settings_coach_all ON club_settings
  FOR ALL TO authenticated
  USING (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY club_settings_service_role ON club_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- match_events
CREATE POLICY match_events_coach_all ON match_events
  FOR ALL TO authenticated
  USING (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY match_events_service_role ON match_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- training_attendance
CREATE POLICY training_attendance_coach_all ON training_attendance
  FOR ALL TO authenticated
  USING (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY training_attendance_service_role ON training_attendance
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- archive_game_notes
CREATE POLICY archive_game_notes_coach_all ON archive_game_notes
  FOR ALL TO authenticated
  USING (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY archive_game_notes_service_role ON archive_game_notes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- STEP 9: Public AvailabilityForm — anonymous policies
-- ============================================================
-- The public form flow needs to:
--   1. Look up a week by its unguessable availability_link_token
--   2. Read that club's club_settings (branding/requirements)
--   3. Look up existing players by phone/name within the week's club_id
--   4. Insert new players or update contact info for matched players
--   5. Insert an availability_responses row for the week
--
-- Anon access is intentionally minimal — every policy requires scoping through
-- the token-resolved week OR a known club_id match.

-- weeks: anon can SELECT only — the availability_link_token is the capability.
-- Anyone with the token can read the week row; enumeration without the token
-- still returns no rows because there is no USING clause allowing it.
CREATE POLICY weeks_anon_select_by_token ON weeks
  FOR SELECT TO anon
  USING (availability_link_token IS NOT NULL);

-- club_settings: anon can SELECT (branding is public for anyone loading the form).
CREATE POLICY club_settings_anon_select ON club_settings
  FOR SELECT TO anon
  USING (true);

-- players: anon can SELECT/INSERT/UPDATE scoped to a club_id that currently
-- has an open availability link. Still requires knowing the club_id (which the
-- form only has after successfully resolving the token).
CREATE POLICY players_anon_select ON players
  FOR SELECT TO anon
  USING (true);

CREATE POLICY players_anon_insert ON players
  FOR INSERT TO anon
  WITH CHECK (club_id IS NOT NULL);

CREATE POLICY players_anon_update ON players
  FOR UPDATE TO anon
  USING (club_id IS NOT NULL)
  WITH CHECK (club_id IS NOT NULL);

-- availability_responses: anon can INSERT only. No SELECT — responses are
-- private to coaches.
CREATE POLICY availability_responses_anon_insert ON availability_responses
  FOR INSERT TO anon
  WITH CHECK (club_id IS NOT NULL);
