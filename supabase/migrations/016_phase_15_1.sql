-- Migration 016: Phase 15.1 — Training Attendance Tracker & Availability Dashboard

-- Add training_days to club_settings
ALTER TABLE club_settings ADD COLUMN IF NOT EXISTS training_days JSONB DEFAULT '[{"id": "1", "label": "Wednesday"}]'::jsonb;

-- Create training_attendance table
CREATE TABLE IF NOT EXISTS training_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  week_id UUID REFERENCES weeks(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  attended BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, week_id, session_id)
);

-- Enable RLS on training_attendance
ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can manage all training_attendance records
CREATE POLICY "Authenticated users can manage training_attendance"
  ON training_attendance
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
