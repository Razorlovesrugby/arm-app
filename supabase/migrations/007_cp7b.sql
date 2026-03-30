-- Migration 007: CP7-B — get_player_last_selections RPC
-- Returns the most recent historical team selection for each player,
-- excluding the specified active week.
--
-- Schema notes (deviations from spec notation):
--   • Uses start_date  (not match_date)  — actual column name
--   • Uses team_name   (not name)        — actual column name
--   • Uses week_team_id (not team_id)    — actual FK in team_selections

CREATE OR REPLACE FUNCTION get_player_last_selections(p_week_id UUID)
RETURNS TABLE(player_id TEXT, last_team TEXT, last_played DATE) AS $$
  SELECT DISTINCT ON (unnested.player_id)
    unnested.player_id,
    wt.team_name  AS last_team,
    w.start_date  AS last_played
  FROM (
    SELECT
      jsonb_array_elements_text(ts.player_order) AS player_id,
      ts.week_team_id,
      ts.week_id
    FROM team_selections ts
    WHERE ts.week_id != p_week_id
  ) unnested
  JOIN week_teams wt ON unnested.week_team_id = wt.id
  JOIN weeks     w  ON unnested.week_id       = w.id
  ORDER BY unnested.player_id, w.start_date DESC
$$ LANGUAGE sql STABLE;
