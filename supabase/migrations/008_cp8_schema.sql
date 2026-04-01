-- Migration 008: CP8 — Schema additions for Finalization & Post-Match Workflow
-- Apply in Supabase SQL Editor before deploying CP8 code.

-- ============================================================
-- 1. week_teams.is_active
--    False = team has a "Bye" this week.
--    Close Week validation skips empty-player warning for inactive teams.
--    Archive view hides inactive teams by default.
-- ============================================================
ALTER TABLE week_teams
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- 2. archive_game_notes — expand snapshot columns
--    player_type_snapshot: badge stays accurate if player type changes later
--    position_snapshot:    badge stays accurate if player position changes later
--    Both are nullable — older rows (pre-008) will have NULL here (safe fallback)
-- ============================================================
ALTER TABLE archive_game_notes
  ADD COLUMN player_type_snapshot TEXT,
  ADD COLUMN position_snapshot    TEXT;
