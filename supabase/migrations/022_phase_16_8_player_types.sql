-- Migration 022: Phase 16.8 — Custom Player Types & Positional Sorting
-- Adds customizable player types to club_settings WITHOUT duplicating existing data

-- Add player_types array to club_settings (stores custom order & names)
ALTER TABLE club_settings
  ADD COLUMN IF NOT EXISTS player_types TEXT[]
  DEFAULT ARRAY['Performance', 'Open', 'Women''s'];

-- Ensure all existing clubs have the default array
UPDATE club_settings
  SET player_types = ARRAY['Performance', 'Open', 'Women''s']
  WHERE player_types IS NULL;

-- Note: We are NOT creating a new player_type field.
-- The existing players.player_type column continues to store the values.
-- This migration only adds customization options to club_settings.
