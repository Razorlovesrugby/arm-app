-- CP8: Add is_active column to week_teams and create close_week function

-- 1. Add is_active column to week_teams if not exists (for "bye" toggle)
ALTER TABLE week_teams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Function to close a week (marks it Closed and snapshots players to archive_game_notes)
CREATE OR REPLACE FUNCTION close_week(p_week_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update week status to Closed
  UPDATE weeks SET status = 'Closed' WHERE id = p_week_id;
  
  -- Snapshot all selected players into archive_game_notes
  INSERT INTO archive_game_notes (week_team_id, player_id, player_name_snapshot, game_notes)
  SELECT 
    ts.week_team_id,
    u.player_id::uuid,
    p.name,
    NULL
  FROM team_selections ts
  CROSS JOIN LATERAL jsonb_array_elements_text(ts.player_order) AS u(player_id)
  LEFT JOIN players p ON p.id = u.player_id::uuid
  WHERE ts.week_id = p_week_id
    AND u.player_id IS NOT NULL
    AND u.player_id != ''
  ON CONFLICT DO NOTHING;
  
  -- Update players' last_played_date and last_played_team
  UPDATE players
  SET 
    last_played_date = w.end_date,
    last_played_team = wt.team_name
  FROM team_selections ts
  CROSS JOIN LATERAL jsonb_array_elements_text(ts.player_order) AS u(player_id)
  JOIN weeks w ON w.id = ts.week_id
  JOIN week_teams wt ON wt.id = ts.week_team_id
  WHERE ts.week_id = p_week_id
    AND players.id = u.player_id::uuid;
END;
$$ LANGUAGE plpgsql;
