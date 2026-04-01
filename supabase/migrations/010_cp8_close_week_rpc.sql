-- Migration 010: CP8 — close_week RPC
-- Single atomic transaction that finalises a week:
--   1. Sets weeks.status = 'Closed'
--   2. For every player in every ACTIVE team's player_order:
--      a. Updates players.last_played_date and last_played_team
--      b. Upserts archive_game_notes with name/type/position snapshots
--
-- Called from the app as: supabase.rpc('close_week', { p_week_id: '<uuid>' })
-- Returns void. Raises an exception (propagated as a Supabase error) on bad input.
--
-- Security: SECURITY DEFINER so RLS on archive_game_notes does not block the
-- INSERT executed inside the function (the calling coach is authenticated, but
-- DEFINER ensures predictable permissions regardless of RLS edge cases).

CREATE OR REPLACE FUNCTION close_week(p_week_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_week_start   DATE;
  v_ts           RECORD;   -- team_selections row
  v_player_id    UUID;
  v_player       RECORD;   -- players row
BEGIN
  -- ── Guard: week must exist and be Open ──────────────────────────────────────
  SELECT start_date INTO v_week_start
  FROM weeks
  WHERE id = p_week_id AND status = 'Open';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Week % is not open or does not exist', p_week_id;
  END IF;

  -- ── 1. Close the week ────────────────────────────────────────────────────────
  UPDATE weeks SET status = 'Closed' WHERE id = p_week_id;

  -- ── 2. Iterate over all ACTIVE teams' selections for this week ───────────────
  FOR v_ts IN
    SELECT ts.player_order, ts.week_team_id, wt.team_name
    FROM   team_selections ts
    JOIN   week_teams       wt ON wt.id = ts.week_team_id
    WHERE  ts.week_id   = p_week_id
      AND  wt.is_active = true
  LOOP
    -- ── 3. Iterate over each non-null player in the order ──────────────────────
    FOR v_player_id IN
      SELECT elem::uuid
      FROM   jsonb_array_elements_text(v_ts.player_order) AS elem
      WHERE  elem IS NOT NULL
    LOOP
      SELECT * INTO v_player FROM players WHERE id = v_player_id;
      IF NOT FOUND THEN CONTINUE; END IF;   -- player deleted — skip gracefully

      -- ── 4. Update last-played fields ──────────────────────────────────────────
      UPDATE players
      SET
        last_played_date = v_week_start,
        last_played_team = v_ts.team_name
      WHERE id = v_player_id;

      -- ── 5. Upsert archive snapshot ────────────────────────────────────────────
      INSERT INTO archive_game_notes (
        week_team_id,
        player_id,
        player_name_snapshot,
        player_type_snapshot,
        position_snapshot,
        game_notes
      )
      VALUES (
        v_ts.week_team_id,
        v_player.id,
        v_player.name,
        v_player.player_type,
        v_player.primary_position,
        NULL   -- coach fills this in after the match
      )
      ON CONFLICT (week_team_id, player_id) DO UPDATE SET
        player_name_snapshot = EXCLUDED.player_name_snapshot,
        player_type_snapshot = EXCLUDED.player_type_snapshot,
        position_snapshot    = EXCLUDED.position_snapshot;
        -- game_notes intentionally NOT overwritten on conflict

    END LOOP;
  END LOOP;
END;
$$;

-- Grant execute to authenticated role (coaches)
GRANT EXECUTE ON FUNCTION close_week(UUID) TO authenticated;
