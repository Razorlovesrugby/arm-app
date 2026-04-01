-- Migration 009: CP8 — "Global Unavailable" trigger
-- When a player submits Unavailable, atomically remove them from all
-- team_selections rows for that week.
--
-- Design notes:
--   • player_order is a sparse JSONB array where JSON null = empty slot.
--     We REPLACE the player's UUID with JSON null rather than splicing out
--     the element — this preserves every other player's shirt number.
--   • WITH ORDINALITY guarantees the rebuild order matches the original.
--   • captain_id is cleared on the same UPDATE if the removed player held it.
--   • The WHERE clause uses @> to short-circuit rows that don't contain the player.
--   • Trigger fires AFTER INSERT so the availability row is already committed
--     before we mutate team_selections (safe for concurrency).

CREATE OR REPLACE FUNCTION remove_player_on_unavailable()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.availability = 'Unavailable' THEN
    UPDATE team_selections
    SET
      player_order = (
        SELECT COALESCE(
          jsonb_agg(
            CASE
              WHEN elem = to_jsonb(NEW.player_id::text) THEN 'null'::jsonb
              ELSE elem
            END
            ORDER BY ordinality
          ),
          '[]'::jsonb
        )
        FROM jsonb_array_elements(player_order)
             WITH ORDINALITY AS t(elem, ordinality)
      ),
      captain_id = CASE
        WHEN captain_id = NEW.player_id THEN NULL
        ELSE captain_id
      END
    WHERE week_id     = NEW.week_id
      AND player_order @> to_jsonb(ARRAY[NEW.player_id::text]);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop first to allow safe re-runs
DROP TRIGGER IF EXISTS on_unavailable_remove_from_selections ON availability_responses;

CREATE TRIGGER on_unavailable_remove_from_selections
  AFTER INSERT ON availability_responses
  FOR EACH ROW
  EXECUTE FUNCTION remove_player_on_unavailable();
