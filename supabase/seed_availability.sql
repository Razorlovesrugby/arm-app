-- ============================================================
-- Seed: availability_responses for the most recent open week
-- Uses player IDs from players_rows.sql seed data
-- Run in Supabase SQL editor after confirming an open week exists
-- ============================================================

DO $$
DECLARE
  v_week_id UUID;
BEGIN
  -- Get the most recent open week
  SELECT id INTO v_week_id
  FROM weeks
  WHERE status = 'Open'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_week_id IS NULL THEN
    RAISE EXCEPTION 'No open week found. Create a week first in the app, then run this script.';
  END IF;

  RAISE NOTICE 'Seeding availability for week_id: %', v_week_id;

  INSERT INTO availability_responses
    (id, week_id, player_id, availability, submitted_primary_position, submitted_secondary_positions, availability_note, created_at)
  VALUES

  -- ── AVAILABLE (20 players) ──────────────────────────────────────────────────

  -- Props
  (gen_random_uuid(), v_week_id, '7b620166-50e9-4add-84df-6c5ad7b5c3b2', 'Available', 'Prop', '["Hooker"]', null, now() - interval '2 hours'),
  -- Jamie Okafor

  (gen_random_uuid(), v_week_id, '060bb8a7-ebc6-4c86-b119-45a883727dcf', 'Available', 'Prop', '[]', null, now() - interval '1 hour 55 min'),
  -- Marcus Webb

  (gen_random_uuid(), v_week_id, '0a6d3531-6e26-45b5-9622-7e4b784b1bce', 'Available', 'Prop', '["Lock"]', 'Can only make first half, leaving early', now() - interval '1 hour 50 min'),
  -- Dan Kowalski

  -- Hookers
  (gen_random_uuid(), v_week_id, '14c0eed1-858f-47d4-aa0a-dc2790b4d68b', 'Available', 'Hooker', '["Prop"]', null, now() - interval '1 hour 45 min'),
  -- Tom Brennan

  (gen_random_uuid(), v_week_id, 'b5d1559e-34a7-4b5f-bc17-ce63dd95deae', 'Available', 'Hooker', '[]', null, now() - interval '1 hour 40 min'),
  -- Elliot Patel

  -- Locks
  (gen_random_uuid(), v_week_id, '9334ffc6-15ff-4ca2-8569-a859c95e1a88', 'Available', 'Lock', '[]', null, now() - interval '1 hour 35 min'),
  -- Ben Adeyemi

  (gen_random_uuid(), v_week_id, 'ffee9dc5-4ebe-4734-aa7a-5082736b4009', 'Available', 'Lock', '["Flanker"]', null, now() - interval '1 hour 30 min'),
  -- Alex Thornton

  (gen_random_uuid(), v_week_id, '0fefb026-52a0-4b65-a26d-d47c682f0d10', 'Available', 'Lock', '["Flanker"]', null, now() - interval '1 hour 25 min'),
  -- Patrick Lowe

  -- Flankers
  (gen_random_uuid(), v_week_id, '7156914b-845f-4dd3-a730-112fc25542c8', 'Available', 'Flanker', '[]', null, now() - interval '1 hour 20 min'),
  -- Rory McAllister

  (gen_random_uuid(), v_week_id, '80d3e18d-e9ee-4b48-b950-e923380d2039', 'Available', 'Flanker', '["Number 8"]', null, now() - interval '1 hour 15 min'),
  -- Kai Mensah

  (gen_random_uuid(), v_week_id, '82e4632b-38b4-46d2-8ecb-8ccc4084b2d6', 'Available', 'Flanker', '["Number 8","Lock"]', null, now() - interval '1 hour 10 min'),
  -- Josh Freeman

  (gen_random_uuid(), v_week_id, 'c2c7a2c0-60ad-4099-b0cf-6f5d4d41f9f3', 'Available', 'Flanker', '["Hooker"]', 'Running late — will be there by 14:15', now() - interval '1 hour 5 min'),
  -- Ray McKenzie

  -- Number 8s
  (gen_random_uuid(), v_week_id, 'c01e27b1-0894-4e69-b5c6-0009e7a9df65', 'Available', 'Number 8', '["Flanker"]', null, now() - interval '60 min'),
  -- Leon Baptiste

  (gen_random_uuid(), v_week_id, '5e91ffdc-db38-4dbd-b9d9-10bda97a27ec', 'Available', 'Number 8', '["Flanker","Lock"]', null, now() - interval '55 min'),
  -- Harry Singh

  -- Scrum-halves
  (gen_random_uuid(), v_week_id, 'fcc35ec6-357d-42f8-8221-b8b00cf93097', 'Available', 'Scrum-half', '[]', null, now() - interval '50 min'),
  -- Finn Gallagher

  -- Fly-halves
  (gen_random_uuid(), v_week_id, '250fb738-1183-4839-a241-51709f2cf1ff', 'Available', 'Fly-half', '["Centre"]', null, now() - interval '45 min'),
  -- Nathan Cross

  -- Centres
  (gen_random_uuid(), v_week_id, '92214deb-7a9d-4c2c-aec5-c5f62110efa5', 'Available', 'Centre', '["Wing"]', null, now() - interval '40 min'),
  -- Darius Eze

  (gen_random_uuid(), v_week_id, '87f79c4e-0520-4eed-811d-403ca47f5f72', 'Available', 'Centre', '["Fly-half"]', null, now() - interval '35 min'),
  -- Michael Reeves

  -- Wings
  (gen_random_uuid(), v_week_id, '50a5a10b-bd3e-4916-bb33-5ccc7e3d2781', 'Available', 'Wing', '["Fullback"]', null, now() - interval '30 min'),
  -- Theo Lambert

  (gen_random_uuid(), v_week_id, 'e5eed370-88a6-4c0f-8c09-4c517462ba4a', 'Available', 'Wing', '[]', null, now() - interval '25 min'),
  -- Isaac Osei

  -- Fullback
  (gen_random_uuid(), v_week_id, '70ae1183-5b30-4a6d-befe-dec8f4cf840d', 'Available', 'Fullback', '["Wing"]', null, now() - interval '20 min'),
  -- Owen Davies

  -- ── TBC (4 players) ─────────────────────────────────────────────────────────

  (gen_random_uuid(), v_week_id, '9ffc9094-53db-43ef-9e6e-74c3f6f278a2', 'TBC', 'Prop', '["Hooker"]', 'Knees are playing up — should be fine but not 100% sure yet', now() - interval '15 min'),
  -- Ewan Milnes

  (gen_random_uuid(), v_week_id, '3ae5d866-dd9c-4d5a-9376-2f12a3c9f3ff', 'TBC', 'Fly-half', '["Scrum-half"]', null, now() - interval '12 min'),
  -- Will Ashby

  (gen_random_uuid(), v_week_id, '0d26c1db-f0f3-4870-9cf9-9f74ba3c7be1', 'TBC', 'Centre', '[]', 'Might have to work — will confirm Thursday', now() - interval '10 min'),
  -- Connor Hayes

  (gen_random_uuid(), v_week_id, '282314ac-3f58-4264-a396-ccfd521c56fb', 'TBC', 'Fullback', '["Wing","Centre"]', null, now() - interval '8 min'),
  -- Ryan Fletcher

  -- ── UNAVAILABLE (2 active players — useful for testing Phase 8 auto-remove) ─

  (gen_random_uuid(), v_week_id, '8d2f2db4-2277-4e5d-8639-50c3a82e3eaf', 'Unavailable', 'Scrum-half', '["Fly-half"]', 'Away this weekend, sorry lads', now() - interval '5 min'),
  -- Ollie Turner

  (gen_random_uuid(), v_week_id, '366e239e-7799-4f92-9377-934b5358fb4e', 'Unavailable', 'Wing', '["Fullback","Centre"]', null, now() - interval '3 min');
  -- Luca Moretti

  RAISE NOTICE 'Done — inserted 26 availability responses for week %', v_week_id;

END $$;
