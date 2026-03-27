-- ============================================================
-- ARM App — Migration 003: Seed Data
-- Run this third in the Supabase SQL Editor
-- ============================================================
-- Seeds one row per position in depth_chart_order.
-- All start with an empty player_order array.
-- Position sequence follows the standard rugby union shirt order.
-- ============================================================

INSERT INTO depth_chart_order (position, player_order) VALUES
  ('Prop',        '[]'::jsonb),
  ('Hooker',      '[]'::jsonb),
  ('Lock',        '[]'::jsonb),
  ('Flanker',     '[]'::jsonb),
  ('Number 8',    '[]'::jsonb),
  ('Scrum-half',  '[]'::jsonb),
  ('Fly-half',    '[]'::jsonb),
  ('Centre',      '[]'::jsonb),
  ('Wing',        '[]'::jsonb),
  ('Fullback',    '[]'::jsonb),
  ('Unspecified', '[]'::jsonb);
