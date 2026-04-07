-- Migration 012: Add yellow_card and red_card to match_events event_type constraint

-- Drop existing constraint
ALTER TABLE match_events DROP CONSTRAINT IF EXISTS match_events_event_type_check;

-- Add new constraint with card types
ALTER TABLE match_events ADD CONSTRAINT match_events_event_type_check
  CHECK (event_type IN (
    'try', 'conversion', 'penalty', 'drop_goal',
    'mvp_3', 'mvp_2', 'mvp_1', 'dotd',
    'yellow_card', 'red_card'
  ));
