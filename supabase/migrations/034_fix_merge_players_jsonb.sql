-- Migration 034: Fix merge_players RPC — use jsonb operators for player_order
-- player_order on team_selections and depth_chart_order is JSONB, not text[].
-- Migration 033 used array_replace() and ANY() which require native pg arrays.
-- This replaces those two UPDATE statements with jsonb-correct equivalents.

CREATE OR REPLACE FUNCTION public.merge_players(primary_id UUID, duplicate_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_primary_club   UUID;
  v_duplicate_club UUID;
BEGIN
  IF primary_id = duplicate_id THEN
    RAISE EXCEPTION 'Cannot merge a player into themselves';
  END IF;

  SELECT club_id INTO v_primary_club FROM players WHERE id = primary_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Primary player not found';
  END IF;

  SELECT club_id INTO v_duplicate_club FROM players WHERE id = duplicate_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Duplicate player not found';
  END IF;

  IF v_primary_club IS DISTINCT FROM v_duplicate_club THEN
    RAISE EXCEPTION 'Players must belong to the same club';
  END IF;

  -- 1. Availability responses
  UPDATE availability_responses ar
  SET    player_id = primary_id
  WHERE  ar.player_id = duplicate_id
  AND    NOT EXISTS (
           SELECT 1 FROM availability_responses ar2
           WHERE  ar2.player_id = primary_id
           AND    ar2.week_id   = ar.week_id
         );
  DELETE FROM availability_responses WHERE player_id = duplicate_id;

  -- 2. Training attendance
  UPDATE training_attendance ta
  SET    player_id = primary_id
  WHERE  ta.player_id = duplicate_id
  AND    NOT EXISTS (
           SELECT 1 FROM training_attendance ta2
           WHERE  ta2.player_id  = primary_id
           AND    ta2.week_id    = ta.week_id
           AND    ta2.session_id = ta.session_id
         );
  DELETE FROM training_attendance WHERE player_id = duplicate_id;

  -- 3. Match events
  UPDATE match_events SET player_id = primary_id WHERE player_id = duplicate_id;

  -- 4. Archive game notes
  UPDATE archive_game_notes SET player_id = primary_id WHERE player_id = duplicate_id;

  -- 5. Team selection captain pointer
  UPDATE team_selections SET captain_id = primary_id WHERE captain_id = duplicate_id;

  -- 6. Replace duplicate UUID inside jsonb player_order arrays (team_selections).
  --    @> checks containment; jsonb_agg rebuilds the array with the value swapped.
  UPDATE team_selections
  SET    player_order = (
           SELECT jsonb_agg(
                    CASE WHEN elem = to_jsonb(duplicate_id::text)
                         THEN to_jsonb(primary_id::text)
                         ELSE elem
                    END
                  )
           FROM   jsonb_array_elements(player_order) AS elem
         )
  WHERE  player_order IS NOT NULL
  AND    player_order @> to_jsonb(duplicate_id::text);

  -- 7. Replace duplicate UUID inside jsonb player_order arrays (depth_chart_order).
  UPDATE depth_chart_order
  SET    player_order = (
           SELECT jsonb_agg(
                    CASE WHEN elem = to_jsonb(duplicate_id::text)
                         THEN to_jsonb(primary_id::text)
                         ELSE elem
                    END
                  )
           FROM   jsonb_array_elements(player_order) AS elem
         )
  WHERE  player_order IS NOT NULL
  AND    player_order @> to_jsonb(duplicate_id::text);

  -- 8. Delete the duplicate
  DELETE FROM players WHERE id = duplicate_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_players(UUID, UUID) TO authenticated;
