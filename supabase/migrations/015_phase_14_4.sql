-- Migration 015: Phase 14.4 — Club Settings Expansion
-- Add default_squad_size and require_positions_in_form columns

ALTER TABLE club_settings
ADD COLUMN IF NOT EXISTS default_squad_size INTEGER DEFAULT 22,
ADD COLUMN IF NOT EXISTS require_positions_in_form BOOLEAN DEFAULT true;

COMMENT ON COLUMN club_settings.default_squad_size IS 'Default number of players in a full squad (starters + bench)';
COMMENT ON COLUMN club_settings.require_positions_in_form IS 'Whether the public Availability Form asks for primary/secondary positions';
