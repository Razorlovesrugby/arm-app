-- Migration 006: CP7-A — Selection Board Core Rebuild
-- Adds week_teams.visible and team_selections.captain_id
-- Apply in Supabase SQL editor

-- Add visible flag to week_teams
-- Existing rows default to true (all currently visible)
ALTER TABLE week_teams
ADD COLUMN visible BOOLEAN NOT NULL DEFAULT true;

-- Add captain_id to team_selections
-- Nullable UUID — one per row, enforced at application layer only
ALTER TABLE team_selections
ADD COLUMN captain_id UUID REFERENCES players(id) ON DELETE SET NULL;
