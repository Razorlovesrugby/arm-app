-- ============================================================
-- ARM App — Migration 005: Phase 6 Schema Changes
-- Run this in the Supabase SQL Editor BEFORE deploying Phase 6 code
-- ============================================================
-- NOTE: Migration 004 (submitted_primary_position + submitted_secondary_positions)
-- is a no-op — those columns were already present in 001_schema.sql.
-- Running 004 is safe (uses IF NOT EXISTS) but not required.
-- ============================================================


-- ============================================================
-- 1. Rename availability_responses.note → availability_note
--    Separates player-submitted week notes from Coach Notes (players.notes)
-- ============================================================
ALTER TABLE availability_responses
  RENAME COLUMN note TO availability_note;


-- ============================================================
-- 2. Expand players.status CHECK constraint to include 'Archived'
-- ============================================================
DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  -- Find the existing status check constraint (name may vary)
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'players'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE players DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;

ALTER TABLE players
  ADD CONSTRAINT players_status_check
  CHECK (status IN ('Active', 'Injured', 'Unavailable', 'Retired', 'Archived'));


-- ============================================================
-- 3. Create archive_game_notes table
--    One row per player per team on week close.
--    game_notes editable by coaches after close; all else read-only.
-- ============================================================
CREATE TABLE IF NOT EXISTS archive_game_notes (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_team_id         UUID        NOT NULL REFERENCES week_teams(id) ON DELETE CASCADE,
  player_id            UUID        REFERENCES players(id) ON DELETE SET NULL,
  player_name_snapshot TEXT        NOT NULL,
  game_notes           TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique: one note per player per team (NULLs excluded — handles deleted players)
CREATE UNIQUE INDEX IF NOT EXISTS archive_game_notes_unique_player
  ON archive_game_notes(week_team_id, player_id)
  WHERE player_id IS NOT NULL;

-- Auto-update updated_at (reuses the function defined in 001_schema.sql)
CREATE TRIGGER archive_game_notes_updated_at
  BEFORE UPDATE ON archive_game_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 4. RLS for archive_game_notes
--    authenticated (coach): full access
--    anon: no access
-- ============================================================
ALTER TABLE archive_game_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaches_all_archive_game_notes"
  ON archive_game_notes FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);
