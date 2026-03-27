-- Migration 004: Add submitted position columns to availability_responses
-- Required for Phase 6 (availability form): stores a snapshot of positions
-- submitted by the player for that week.
-- PRD v1.7 §7.5

ALTER TABLE availability_responses
  ADD COLUMN IF NOT EXISTS submitted_primary_position TEXT,
  ADD COLUMN IF NOT EXISTS submitted_secondary_positions JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN availability_responses.submitted_primary_position
  IS 'Primary position submitted on the availability form for this week. Nullable (pre-v1.5 responses have no position data).';

COMMENT ON COLUMN availability_responses.submitted_secondary_positions
  IS 'Secondary positions submitted on the availability form for this week. Nullable.';
