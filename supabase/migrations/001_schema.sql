-- ============================================================
-- ARM App — Migration 001: Schema
-- Run this first in the Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- TABLE: players
-- ============================================================
CREATE TABLE players (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT        NOT NULL,
  email                 TEXT        NOT NULL,
  phone                 TEXT        NOT NULL,
  date_of_birth         DATE        NOT NULL,
  primary_position      TEXT        CHECK (primary_position IN (
                          'Prop','Hooker','Lock','Flanker','Number 8',
                          'Scrum-half','Fly-half','Centre','Wing','Fullback','Unspecified'
                        )),
  secondary_positions   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  player_type           TEXT        NOT NULL CHECK (player_type IN ('Performance','Open','Women''s')),
  status                TEXT        NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Injured','Unavailable','Retired')),
  subscription_paid     BOOLEAN     NOT NULL DEFAULT false,
  notes                 TEXT,
  last_played_date      DATE,
  last_played_team      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on every players row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- TABLE: depth_chart_order
-- One row per position. player_order is an ordered array of player UUIDs.
-- ============================================================
CREATE TABLE depth_chart_order (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  position      TEXT        NOT NULL UNIQUE,
  player_order  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- TABLE: weeks
-- ============================================================
CREATE TABLE weeks (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_date              DATE        NOT NULL,
  end_date                DATE        NOT NULL,
  label                   TEXT        NOT NULL,
  status                  TEXT        NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Closed')),
  availability_link_token TEXT        NOT NULL UNIQUE DEFAULT uuid_generate_v4()::text,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- TABLE: week_teams
-- 5 rows auto-inserted by application when a week is created.
-- UNIQUE(week_id, team_name) enforces no duplicate team names per week.
-- ============================================================
CREATE TABLE week_teams (
  id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_id         UUID    NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  team_name       TEXT    NOT NULL,
  sort_order      INTEGER NOT NULL,
  starters_count  INTEGER NOT NULL DEFAULT 15,
  UNIQUE(week_id, team_name)
);


-- ============================================================
-- TABLE: availability_responses
-- No UNIQUE constraint — full history retained.
-- Latest per player per week retrieved via ORDER BY created_at DESC LIMIT 1.
-- player_id is always non-null: unmatched submissions trigger auto-create.
-- ============================================================
CREATE TABLE availability_responses (
  id                            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_id                       UUID        NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  player_id                     UUID        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  availability                  TEXT        NOT NULL CHECK (availability IN ('Available','TBC','Unavailable')),
  submitted_primary_position    TEXT,
  submitted_secondary_positions JSONB       NOT NULL DEFAULT '[]'::jsonb,
  note                          TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- TABLE: team_selections
-- UNIQUE(week_id, week_team_id) — ON CONFLICT DO UPDATE in application.
-- player_order is an ordered array of player UUIDs (order = shirt number).
-- ============================================================
CREATE TABLE team_selections (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_id       UUID        NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  week_team_id  UUID        NOT NULL REFERENCES week_teams(id) ON DELETE CASCADE,
  player_order  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  saved_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(week_id, week_team_id)
);
