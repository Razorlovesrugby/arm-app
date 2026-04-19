-- Phase 17.8: Dynamic Player Type Cascading
-- Drop hardcoded CHECK constraint, create cascade RPC, add performance index

-- 1. Drop the hardcoded player_type CHECK constraint
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_player_type_check;

-- 2. Add performance index for efficient player type lookups
CREATE INDEX IF NOT EXISTS idx_players_club_id_player_type
  ON players(club_id, player_type);

-- 3. Create safe batch-processing RPC for player type renames
CREATE OR REPLACE FUNCTION rename_custom_player_type(
  club_uuid  UUID,
  old_type   TEXT,
  new_type   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_size    INT  := 50;
  v_updated_total INT  := 0;
  v_batches       INT  := 0;
  v_batch_ids     UUID[];
BEGIN
  -- Verify caller has access to this club
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND club_id = club_uuid
    UNION
    SELECT 1 FROM rdo_club_access WHERE user_id = auth.uid() AND club_id = club_uuid
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Validate inputs
  IF old_type IS NULL OR trim(old_type) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'old_type cannot be empty');
  END IF;
  IF new_type IS NULL OR trim(new_type) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'new_type cannot be empty');
  END IF;
  IF old_type = new_type THEN
    RETURN jsonb_build_object('success', true, 'updated_count', 0, 'batches_processed', 0);
  END IF;

  -- Process in batches of 50 to avoid lock contention
  LOOP
    SELECT ARRAY(
      SELECT id FROM players
      WHERE club_id    = club_uuid
        AND player_type = old_type
      ORDER BY id
      LIMIT v_batch_size
      FOR UPDATE SKIP LOCKED
    ) INTO v_batch_ids;

    EXIT WHEN array_length(v_batch_ids, 1) IS NULL
           OR array_length(v_batch_ids, 1) = 0;

    UPDATE players
       SET player_type = new_type,
           updated_at  = NOW()
     WHERE id = ANY(v_batch_ids);

    v_updated_total := v_updated_total + array_length(v_batch_ids, 1);
    v_batches       := v_batches + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success',           true,
    'updated_count',     v_updated_total,
    'batches_processed', v_batches
  );
END;
$$;
