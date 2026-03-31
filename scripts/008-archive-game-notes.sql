-- CP8: Archive Game Notes table and Close Week function
-- This migration adds support for the Archive tab with game notes per player per team

-- 1. Create archive_game_notes table (stores notes after week is closed)
CREATE TABLE IF NOT EXISTS archive_game_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_team_id UUID NOT NULL REFERENCES week_teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  player_name_snapshot TEXT NOT NULL,
  game_notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by week_team_id
CREATE INDEX IF NOT EXISTS idx_archive_game_notes_week_team_id 
ON archive_game_notes(week_team_id);

-- Index for player history search
CREATE INDEX IF NOT EXISTS idx_archive_game_notes_player_id 
ON archive_game_notes(player_id);

-- 2. Add is_active column to week_teams if not exists (for "bye" toggle)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'week_teams' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE week_teams ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 3. Function to close a week (marks it Closed and snapshots players to archive_game_notes)
CREATE OR REPLACE FUNCTION close_week(p_week_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update week status to Closed
  UPDATE weeks SET status = 'Closed' WHERE id = p_week_id;
  
  -- Snapshot all selected players into archive_game_notes
  INSERT INTO archive_game_notes (week_team_id, player_id, player_name_snapshot, game_notes)
  SELECT 
    ts.week_team_id,
    p.id,
    p.name,
    NULL
  FROM team_selections ts
  CROSS JOIN LATERAL unnest(ts.player_order) WITH ORDINALITY AS u(player_id, ord)
  LEFT JOIN players p ON p.id = u.player_id::uuid
  WHERE ts.week_id = p_week_id
  ON CONFLICT DO NOTHING;
  
  -- Update players' last_played_date and last_played_team
  UPDATE players
  SET 
    last_played_date = w.end_date,
    last_played_team = wt.team_name
  FROM team_selections ts
  CROSS JOIN LATERAL unnest(ts.player_order) AS u(player_id)
  JOIN weeks w ON w.id = ts.week_id
  JOIN week_teams wt ON wt.id = ts.week_team_id
  WHERE ts.week_id = p_week_id
    AND players.id = u.player_id::uuid;
END;
$$ LANGUAGE plpgsql;

-- 4. RLS policies for archive_game_notes
ALTER TABLE archive_game_notes ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users (or anon for now)
DROP POLICY IF EXISTS "Allow read archive_game_notes" ON archive_game_notes;
CREATE POLICY "Allow read archive_game_notes" ON archive_game_notes
  FOR SELECT USING (true);

-- Allow update for game_notes only
DROP POLICY IF EXISTS "Allow update archive_game_notes" ON archive_game_notes;
CREATE POLICY "Allow update archive_game_notes" ON archive_game_notes
  FOR UPDATE USING (true);

-- Allow insert (for close_week function)
DROP POLICY IF EXISTS "Allow insert archive_game_notes" ON archive_game_notes;
CREATE POLICY "Allow insert archive_game_notes" ON archive_game_notes
  FOR INSERT WITH CHECK (true);
