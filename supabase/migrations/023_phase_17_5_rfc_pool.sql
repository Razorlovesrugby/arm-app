-- Migration 023: Phase 17.5 — RFC Player Pool RPC Function
--
-- Creates an optimised SECURITY DEFINER function that returns all players
-- across every club mapped to the calling RDO user, with their current-week
-- availability status in a single round-trip.
--
-- The function bypasses per-row RLS overhead while still enforcing access
-- control via the rdo_club_access bridge table.

-- ============================================================
-- RPC: get_rfc_player_pool
-- ============================================================
CREATE OR REPLACE FUNCTION get_rfc_player_pool(user_uuid UUID)
RETURNS TABLE (
  player_id    UUID,
  first_name   TEXT,
  last_name    TEXT,
  position_primary     TEXT,
  player_type  TEXT,
  status       TEXT,
  team_name    TEXT,
  club_id      UUID,
  current_availability TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id                                                          AS player_id,
    split_part(p.name, ' ', 1)                                   AS first_name,
    TRIM(SUBSTRING(p.name FROM POSITION(' ' IN p.name)))         AS last_name,
    COALESCE(p.primary_position::TEXT, 'Unspecified')            AS position_primary,
    p.player_type                                                 AS player_type,
    p.status::TEXT                                               AS status,
    c.name                                                        AS team_name,
    p.club_id                                                     AS club_id,
    COALESCE(
      CASE ar.availability
        WHEN 'Available'   THEN 'Available'
        WHEN 'Unavailable' THEN 'Unavailable'
        WHEN 'TBC'         THEN 'Pending'
      END,
      'No Response'
    )                                                             AS current_availability
  FROM players p
  JOIN clubs c
    ON p.club_id = c.id
  JOIN rdo_club_access rca
    ON c.id = rca.club_id
   AND rca.user_id = user_uuid
  LEFT JOIN weeks w
    ON c.id = w.club_id
   AND w.status = 'Open'
  LEFT JOIN availability_responses ar
    ON p.id = ar.player_id
   AND w.id = ar.week_id
  WHERE p.status != 'Archived'
  ORDER BY c.name, p.name;
END;
$$;

-- ============================================================
-- Performance indexes
-- ============================================================
-- Fast RDO lookup (composite already exists from 021, this is extra insurance)
CREATE INDEX IF NOT EXISTS idx_rdo_club_access_user_id
  ON rdo_club_access(user_id);

-- Fast cross-club player scan
CREATE INDEX IF NOT EXISTS idx_players_club_id_status
  ON players(club_id, status)
  WHERE status != 'Archived';

-- Open-week lookup
CREATE INDEX IF NOT EXISTS idx_weeks_club_id_open
  ON weeks(club_id)
  WHERE status = 'Open';
