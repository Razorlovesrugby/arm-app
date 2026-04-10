-- Migration 019: Phase 16.1 — Database Expansion & Safe Backfill
-- Expand phase of "Expand and Contract" zero-downtime pattern
-- CRITICAL: Do NOT add NOT NULL constraints or enable RLS in this phase
-- DEFENSIVE: Separates DDL (CREATE/ALTER) from DML (INSERT/UPDATE) to avoid PostgreSQL DO block compilation errors

-- ============================================================
-- STEP 1-3: DDL - Create tables and add columns (outside DO block)
-- ============================================================

-- Step 1: Create clubs table
CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  club_id UUID REFERENCES clubs(id),
  role TEXT DEFAULT 'coach',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 3: Add nullable club_id to all core tables (DDL must be outside DO block)
ALTER TABLE players ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE depth_chart_order ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE week_teams ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE availability_responses ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE team_selections ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE club_settings ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE match_events ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE training_attendance ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);
ALTER TABLE archive_game_notes ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id);

-- ============================================================
-- STEP 4-6: DML - Insert data and backfill (inside DO block)
-- ============================================================

DO $$
DECLARE
  master_club_id UUID;
BEGIN
  -- Step 4: Insert master club and store its ID (with idempotency)
  -- First, try to get existing master club ID
  SELECT id INTO master_club_id FROM clubs WHERE name = 'ARM15 Lite Master';

  -- If not found, insert it
  IF master_club_id IS NULL THEN
    INSERT INTO clubs (name) VALUES ('ARM15 Lite Master')
    RETURNING id INTO master_club_id;
  END IF;

  -- Step 5: Backfill existing users into profiles
  INSERT INTO profiles (id, club_id)
  SELECT id, master_club_id FROM auth.users
  ON CONFLICT (id) DO NOTHING;

  -- Step 6: Backfill existing data with master club ID
  -- IMPORTANT: These UPDATE statements reference columns created in Step 3
  -- Since DDL is outside the DO block, PostgreSQL won't fail during compilation
  UPDATE players SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE depth_chart_order SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE weeks SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE week_teams SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE availability_responses SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE team_selections SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE club_settings SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE match_events SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE training_attendance SET club_id = master_club_id WHERE club_id IS NULL;
  UPDATE archive_game_notes SET club_id = master_club_id WHERE club_id IS NULL;

  -- Step 7: DO NOT add NOT NULL constraints
  -- Step 8: DO NOT enable RLS
END $$;
