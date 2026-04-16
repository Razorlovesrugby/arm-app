-- Phase 17.x: Allow profiles.club_id to be NULL for RDO users.
-- RDO accounts have no single home club — their access is managed via
-- rdo_club_access. Setting club_id = NULL causes AuthContext to set
-- activeClubId = null, which triggers the RDO Command Center view.

ALTER TABLE profiles ALTER COLUMN club_id DROP NOT NULL;
