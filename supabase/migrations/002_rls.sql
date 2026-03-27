-- ============================================================
-- ARM App — Migration 002: Row Level Security
-- Run this second in the Supabase SQL Editor
-- ============================================================
-- Access model:
--   authenticated = coach (single shared Supabase Auth account)
--   anon          = public availability form (no login)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE players              ENABLE ROW LEVEL SECURITY;
ALTER TABLE depth_chart_order    ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_teams           ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_selections      ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- players
--   authenticated : full access (create, edit, delete, view roster)
--   anon          : SELECT + INSERT + UPDATE
--                   SELECT  — form needs to match player by name + phone
--                   INSERT  — auto-create unmatched players
--                   UPDATE  — position sync on Available submission
-- ============================================================
CREATE POLICY "coaches_all_players"
  ON players FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_select_players"
  ON players FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_insert_players"
  ON players FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_update_players"
  ON players FOR UPDATE
  TO anon
  USING (true) WITH CHECK (true);


-- ============================================================
-- depth_chart_order
--   authenticated : full access
--   anon          : no access
-- ============================================================
CREATE POLICY "coaches_all_depth_chart"
  ON depth_chart_order FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);


-- ============================================================
-- weeks
--   authenticated : full access
--   anon          : SELECT only
--                   Needed to resolve availability_link_token → week_id
-- ============================================================
CREATE POLICY "coaches_all_weeks"
  ON weeks FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_select_weeks"
  ON weeks FOR SELECT
  TO anon
  USING (true);


-- ============================================================
-- week_teams
--   authenticated : full access (rename teams, read team lists)
--   anon          : no access
-- ============================================================
CREATE POLICY "coaches_all_week_teams"
  ON week_teams FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);


-- ============================================================
-- availability_responses
--   authenticated : full access (read all responses for a week)
--   anon          : INSERT only (submit availability)
-- ============================================================
CREATE POLICY "coaches_all_availability"
  ON availability_responses FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_insert_availability"
  ON availability_responses FOR INSERT
  TO anon
  WITH CHECK (true);


-- ============================================================
-- team_selections
--   authenticated : full access
--   anon          : no access
-- ============================================================
CREATE POLICY "coaches_all_selections"
  ON team_selections FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);
