-- Migration 028: Phase 17.9.1 — Patch calculate_player_caps for Multi-Tenant RLS
--
-- Root cause: calculate_player_caps was created in migration 011 (pre-Phase 16 RLS)
-- as SECURITY INVOKER (the default). When called via supabase.rpc() it runs as the
-- authenticated role, causing the internal table scans on team_selections and
-- week_teams to be filtered by RLS policies that subquery profiles.club_id.
-- This subquery can fail to resolve in the function's execution context, returning
-- null/0 silently because the frontend error path was not logged.
--
-- Fix: Recreate the function with SECURITY DEFINER so it runs as its owner
-- (postgres) and bypasses RLS entirely. The function is read-only (STABLE) and
-- scoped to a single player_id, so bypassing RLS here is safe — the caller's
-- auth context already validated access to that player before the overlay opened.

CREATE OR REPLACE FUNCTION calculate_player_caps(p_player_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_historical_caps INTEGER;
  v_match_caps INTEGER;
BEGIN
  -- Get historical caps
  SELECT COALESCE(historical_caps, 0) INTO v_historical_caps
  FROM players WHERE id = p_player_id;

  -- Count match caps: unique weeks where player was in slots 1-23 AND week_team has a recorded score
  SELECT COUNT(DISTINCT ts.week_id) INTO v_match_caps
  FROM team_selections ts
  JOIN week_teams wt ON ts.week_team_id = wt.id
  WHERE (
    EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(ts.player_order) WITH ORDINALITY AS elem(player_id, idx)
      WHERE elem.player_id::UUID = p_player_id
        AND elem.idx BETWEEN 1 AND 23
    )
    AND (wt.score_for IS NOT NULL OR wt.score_against IS NOT NULL)
  );

  RETURN v_historical_caps + v_match_caps;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
