-- 1. Add column
ALTER TABLE players ADD COLUMN IF NOT EXISTS total_caps INT NOT NULL DEFAULT 0;

-- 2. Refresh function (reuses existing cap logic)
CREATE OR REPLACE FUNCTION refresh_player_caps(p_player_id UUID)
RETURNS VOID AS $$
DECLARE
  v_historical INT;
  v_match      INT;
BEGIN
  SELECT COALESCE(historical_caps, 0) INTO v_historical
  FROM players WHERE id = p_player_id;

  SELECT COUNT(DISTINCT ts.week_id)::INT INTO v_match
  FROM team_selections ts
  JOIN week_teams wt ON ts.week_team_id = wt.id
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(ts.player_order) WITH ORDINALITY AS elem(player_id, idx)
    WHERE elem.player_id::UUID = p_player_id
      AND elem.idx BETWEEN 1 AND 23
  )
  AND (wt.score_for IS NOT NULL OR wt.score_against IS NOT NULL);

  UPDATE players
  SET total_caps = COALESCE(v_historical, 0) + COALESCE(v_match, 0)
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger function: fires when team_selections player_order changes
CREATE OR REPLACE FUNCTION trg_caps_on_selection_change()
RETURNS TRIGGER AS $$
DECLARE pid TEXT;
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    FOR pid IN SELECT jsonb_array_elements_text(OLD.player_order) LOOP
      IF pid IS NOT NULL THEN PERFORM refresh_player_caps(pid::UUID); END IF;
    END LOOP;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    FOR pid IN SELECT jsonb_array_elements_text(NEW.player_order) LOOP
      IF pid IS NOT NULL THEN PERFORM refresh_player_caps(pid::UUID); END IF;
    END LOOP;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_caps_selections ON team_selections;
CREATE TRIGGER trg_caps_selections
AFTER INSERT OR UPDATE OR DELETE ON team_selections
FOR EACH ROW EXECUTE FUNCTION trg_caps_on_selection_change();

-- 4. Trigger function: fires when week_teams score is updated
CREATE OR REPLACE FUNCTION trg_caps_on_score_change()
RETURNS TRIGGER AS $$
DECLARE pid TEXT;
BEGIN
  IF (OLD.score_for IS DISTINCT FROM NEW.score_for) OR
     (OLD.score_against IS DISTINCT FROM NEW.score_against) THEN
    FOR pid IN
      SELECT DISTINCT jsonb_array_elements_text(ts.player_order)
      FROM team_selections ts
      WHERE ts.week_team_id = NEW.id
    LOOP
      IF pid IS NOT NULL THEN PERFORM refresh_player_caps(pid::UUID); END IF;
    END LOOP;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_caps_scores ON week_teams;
CREATE TRIGGER trg_caps_scores
AFTER UPDATE ON week_teams
FOR EACH ROW EXECUTE FUNCTION trg_caps_on_score_change();

-- 5. Backfill all existing players
DO $$
DECLARE pid UUID;
BEGIN
  FOR pid IN SELECT id FROM players LOOP
    PERFORM refresh_player_caps(pid);
  END LOOP;
END $$;
