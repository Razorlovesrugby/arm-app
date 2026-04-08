-- Migration 013: Phase 12.6 — Branding, Defaults & Game Notes
-- Safe, idempotent migration

-- Add default_teams to club_settings
ALTER TABLE club_settings
ADD COLUMN IF NOT EXISTS default_teams TEXT[];

-- Add notes to weeks
ALTER TABLE weeks
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add opponent to week_teams
ALTER TABLE week_teams
ADD COLUMN IF NOT EXISTS opponent TEXT;

-- Add check constraints (idempotent via exception handling)
DO $$ BEGIN
  ALTER TABLE weeks ADD CONSTRAINT weeks_notes_length CHECK (length(notes) <= 1000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE week_teams ADD CONSTRAINT week_teams_opponent_length CHECK (length(opponent) <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CRITICAL FIX: Add array length constraint for default_teams
DO $$ BEGIN
  ALTER TABLE club_settings ADD CONSTRAINT club_settings_default_teams_length
    CHECK (array_length(default_teams, 1) <= 10 OR default_teams IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
