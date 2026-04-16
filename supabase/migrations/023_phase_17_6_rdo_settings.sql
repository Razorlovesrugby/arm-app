-- Migration 023: Phase 17.6 — RDO Settings & Data Governance
-- Creates rdo_facilities table for master location management

-- Create Table: rdo_facilities
CREATE TABLE IF NOT EXISTS rdo_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rdo_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  facility_type TEXT NOT NULL CHECK (facility_type IN ('Pitch', 'Training Grid', 'Gym', 'Clubhouse', 'Off-Site')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE rdo_facilities ENABLE ROW LEVEL SECURITY;

-- RLS Policy: RDO ALL Access
CREATE POLICY rdo_facilities_rdo_all ON rdo_facilities
  FOR ALL TO authenticated
  USING (rdo_user_id = auth.uid())
  WITH CHECK (rdo_user_id = auth.uid());

-- RLS Policy: Coach READ Access (via rdo_club_access mapping)
CREATE POLICY rdo_facilities_coach_read ON rdo_facilities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rdo_club_access rca
      WHERE rca.user_id = rdo_facilities.rdo_user_id
        AND rca.club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Performance Index
CREATE INDEX idx_rdo_facilities_rdo_user_id ON rdo_facilities(rdo_user_id);
CREATE INDEX idx_rdo_facilities_is_active ON rdo_facilities(is_active);
