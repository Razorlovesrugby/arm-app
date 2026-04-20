-- Phase 17.9.3 — Historical Caps Trigger
-- Keeps players.total_caps in sync when historical_caps is edited directly in the database.

CREATE OR REPLACE FUNCTION trg_caps_on_historical_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.historical_caps IS DISTINCT FROM NEW.historical_caps THEN
    PERFORM refresh_player_caps(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_caps_players ON players;

CREATE TRIGGER trg_caps_players
AFTER UPDATE OF historical_caps ON players
FOR EACH ROW
EXECUTE FUNCTION trg_caps_on_historical_change();
