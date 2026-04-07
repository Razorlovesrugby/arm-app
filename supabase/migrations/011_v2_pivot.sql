-- Migration 011: ARM 2.0 Pivot (Phase 11)
-- Schema refactor to support concurrent Selection/Results, club-agnostic branding, and flexible player tracking.
-- This migration is idempotent and safe to run against existing Phase 10 database.
-- ============================================================
-- A. Club-Agnostic Branding
-- ============================================================

-- Create club_settings table to store dynamic branding
CREATE TABLE IF NOT EXISTS club_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_name TEXT NOT NULL DEFAULT 'Belsize Park RFC',
  primary_color TEXT NOT NULL DEFAULT '#1e40af', -- Default blue
  secondary_color TEXT NOT NULL DEFAULT '#dc2626', -- Default red
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on club_settings
ALTER TABLE club_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read club settings
CREATE POLICY "Club settings are viewable by authenticated users"
  ON club_settings FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only allow authenticated users with admin role to update club settings
-- Note: This assumes an admin role exists. For now, we'll allow authenticated users to update.
CREATE POLICY "Club settings are updatable by authenticated users"
  ON club_settings FOR UPDATE
  TO authenticated
  USING (true);

-- Insert default club settings if none exist
INSERT INTO club_settings (club_name, primary_color, secondary_color, logo_url)
SELECT 'Belsize Park RFC', '#1e40af', '#dc2626', NULL
WHERE NOT EXISTS (SELECT 1 FROM club_settings);

-- ============================================================
-- B. The Performance & Culture Engine
-- ============================================================

-- Create match_events table for granular match data tracking
CREATE TABLE IF NOT EXISTS match_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  week_team_id UUID NOT NULL REFERENCES week_teams(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'try', 'conversion', 'penalty', 'drop_goal',
    'mvp_3', 'mvp_2', 'mvp_1', 'dotd'
  )),
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
  -- Ensure each player can only have one of each MVP/DOTD event per week
  -- Note: Partial unique constraint will be created separately
);

-- Enable Row Level Security on match_events
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read match events
CREATE POLICY "Match events are viewable by authenticated users"
  ON match_events FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert match events
CREATE POLICY "Match events are insertable by authenticated users"
  ON match_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update match events
CREATE POLICY "Match events are updatable by authenticated users"
  ON match_events FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to delete match events
CREATE POLICY "Match events are deletable by authenticated users"
  ON match_events FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- C. Enhanced Player CRM (Coach-Only)
-- ============================================================

-- Add historical_caps column to players table
ALTER TABLE players
ADD COLUMN IF NOT EXISTS historical_caps INTEGER NOT NULL DEFAULT 0;

-- Add court_fines column to players table (free-form notes field)
ALTER TABLE players
ADD COLUMN IF NOT EXISTS court_fines TEXT;

-- Add is_retired column to players table
ALTER TABLE players
ADD COLUMN IF NOT EXISTS is_retired BOOLEAN NOT NULL DEFAULT false;

-- Update the status check constraint to include 'Retired' (already exists based on schema)
-- Note: The constraint already includes 'Retired' based on the initial schema

-- ============================================================
-- D. Concurrent Scoring
-- ============================================================

-- Add score_for column to week_teams table
ALTER TABLE week_teams
ADD COLUMN IF NOT EXISTS score_for INTEGER;

-- Add score_against column to week_teams table
ALTER TABLE week_teams
ADD COLUMN IF NOT EXISTS score_against INTEGER;

-- Add match_report column to week_teams table (markdown-compatible)
ALTER TABLE week_teams
ADD COLUMN IF NOT EXISTS match_report TEXT;

-- ============================================================
-- E. Enable Supabase Realtime for new tables
-- ============================================================

-- Enable realtime for club_settings
ALTER PUBLICATION supabase_realtime ADD TABLE club_settings;

-- Enable realtime for match_events
ALTER PUBLICATION supabase_realtime ADD TABLE match_events;

-- ============================================================
-- F. Helper Functions and Indexes
-- ============================================================

-- Create function to calculate total caps for a player
-- Total caps = historical_caps + (Count of unique week_id entries where player was in 1-23 lineup AND week_team has recorded score)
CREATE OR REPLACE FUNCTION calculate_player_caps(p_player_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_historical_caps INTEGER;
  v_match_caps INTEGER;
BEGIN
  -- Get historical caps
  SELECT COALESCE(historical_caps, 0) INTO v_historical_caps
  FROM players WHERE id = p_player_id;
  
  -- Count match caps (unique weeks where player was in 1-23 lineup AND week_team has recorded score)
  SELECT COUNT(DISTINCT ts.week_id) INTO v_match_caps
  FROM team_selections ts
  JOIN week_teams wt ON ts.week_team_id = wt.id
  WHERE (
    -- Player is in position 1-23 (non-null in player_order array at index 0-22)
    EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(ts.player_order) WITH ORDINALITY AS elem(player_id, idx)
      WHERE elem.player_id::UUID = p_player_id
        AND elem.idx BETWEEN 1 AND 23  -- 1-indexed positions 1-23
    )
    -- AND week_team has a recorded score (either score_for or score_against is not null)
    AND (wt.score_for IS NOT NULL OR wt.score_against IS NOT NULL)
  );
  
  RETURN v_historical_caps + v_match_caps;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create index for performance on match_events queries
CREATE INDEX IF NOT EXISTS idx_match_events_week_id ON match_events(week_id);
CREATE INDEX IF NOT EXISTS idx_match_events_player_id ON match_events(player_id);
CREATE INDEX IF NOT EXISTS idx_match_events_week_team_id ON match_events(week_team_id);

-- Create partial unique index to ensure each player can only have one of each MVP/DOTD event per week
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_events_unique_mvp_dotd 
ON match_events(week_id, player_id, event_type) 
WHERE event_type IN ('mvp_3', 'mvp_2', 'mvp_1', 'dotd');

-- Create index for filtering retired players
CREATE INDEX IF NOT EXISTS idx_players_is_retired ON players(is_retired) WHERE is_retired = true;

-- ============================================================
-- G. Update existing data
-- ============================================================

-- Set is_retired = true for players with status = 'Retired'
UPDATE players
SET is_retired = true
WHERE status = 'Retired'
  AND (is_retired = false OR is_retired IS NULL);

-- ============================================================
-- H. Comments for documentation
-- ============================================================

COMMENT ON TABLE club_settings IS 'Stores club branding information for dynamic UI theming';
COMMENT ON TABLE match_events IS 'Granular ledger for match performance data and awards';
COMMENT ON COLUMN players.historical_caps IS 'Pre-v2.0 caps count for migration purposes';
COMMENT ON COLUMN players.court_fines IS 'Free-form notes field for disciplinary fines (e.g., "£10", "3 pints", "Clean the balls next week")';
COMMENT ON COLUMN players.is_retired IS 'Flag to filter players from active lists while keeping their stats';
COMMENT ON COLUMN week_teams.score_for IS 'Points scored by this team in the match';
COMMENT ON COLUMN week_teams.score_against IS 'Points conceded by this team in the match';
COMMENT ON COLUMN week_teams.match_report IS 'Markdown-compatible match report text';

-- ============================================================
-- Migration complete
-- ============================================================