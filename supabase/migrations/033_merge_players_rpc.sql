-- Migration 033: Player Merge RPC (Phase 19.0)
-- Merges a duplicate player (typically created via public availability form)
-- into a primary player, transferring availability + training + match events
-- then deleting the duplicate.
--
-- Safety model:
--  * SECURITY DEFINER so it can bypass RLS across the related tables.
--  * search_path pinned to public to prevent schema hijacking.
--  * Function runs in an implicit transaction — any RAISE rolls back all changes.
--  * Primary player's data wins on week/session conflicts.

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
  -- Prevent self-merge
  IF primary_id = duplicate_id THEN
    RAISE EXCEPTION 'Cannot merge a player into themselves';
  END IF;

  -- Load both clubs in one pass; also verifies both rows exist
  SELECT club_id INTO v_primary_club   FROM players WHERE id = primary_id;
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

  -- 1. Availability responses: move non-conflicting weeks, drop conflicts.
  --    Using NOT EXISTS (not NOT IN) to stay NULL-safe.
  UPDATE availability_responses ar
  SET    player_id = primary_id
  WHERE  ar.player_id = duplicate_id
  AND    NOT EXISTS (
           SELECT 1 FROM availability_responses ar2
           WHERE  ar2.player_id = primary_id
           AND    ar2.week_id   = ar.week_id
         );
  DELETE FROM availability_responses WHERE player_id = duplicate_id;

  -- 2. Training attendance: same pattern on (week_id, session_id).
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

  -- 3. Match events — simple transfer (duplicates rarely have any).
  UPDATE match_events SET player_id = primary_id WHERE player_id = duplicate_id;

  -- 4. Archive game notes — simple transfer.
  UPDATE archive_game_notes SET player_id = primary_id WHERE player_id = duplicate_id;

  -- 5. Team selection captain pointer.
  UPDATE team_selections SET captain_id = primary_id WHERE captain_id = duplicate_id;

  -- 6. Replace duplicate id inside UUID-array columns that reference players.
  --    player_order is uuid[] / text[]; a naive DELETE would orphan array slots.
  UPDATE team_selections
  SET    player_order = array_replace(player_order, duplicate_id::text, primary_id::text)
  WHERE  duplicate_id::text = ANY(player_order);

  UPDATE depth_chart_order
  SET    player_order = array_replace(player_order, duplicate_id::text, primary_id::text)
  WHERE  duplicate_id::text = ANY(player_order);

  -- 7. Finally, delete the duplicate. Any remaining FKs with ON DELETE CASCADE/SET NULL
  --    will resolve; any unexpected restrictive FK will RAISE and roll the whole txn back.
  DELETE FROM players WHERE id = duplicate_id;
END;
$$;

-- Allow authenticated coaches to call it
GRANT EXECUTE ON FUNCTION public.merge_players(UUID, UUID) TO authenticated;
