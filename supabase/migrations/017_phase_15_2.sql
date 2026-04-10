-- Phase 15.2: Availability Form Data Collection Mode
-- Adds require_contact_info and require_birthday toggles to club_settings

ALTER TABLE club_settings
  ADD COLUMN IF NOT EXISTS require_contact_info BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_birthday BOOLEAN DEFAULT false;
