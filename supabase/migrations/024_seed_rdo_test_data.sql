-- Seed: RDO Test Data — College Rifles (4 clubs)
-- RDO User: 51b7790c-1372-4624-a44c-603b889214e9
-- Run once against a dev/staging database only.

DO $$
DECLARE
    rdo_uuid UUID := '51b7790c-1372-4624-a44c-603b889214e9';

    -- Club UUIDs
    c_prems  UUID := gen_random_uuid();
    c_womens UUID := gen_random_uuid();
    c_u85    UUID := gen_random_uuid();
    c_colts  UUID := gen_random_uuid();

    -- Current Week UUIDs
    w_curr_prems  UUID := gen_random_uuid();
    w_curr_womens UUID := gen_random_uuid();
    w_curr_u85    UUID := gen_random_uuid();
    w_curr_colts  UUID := gen_random_uuid();

    -- Past Week UUID
    w_past_prems UUID := gen_random_uuid();

    -- Week Team UUIDs
    wt_curr_prems  UUID := gen_random_uuid();
    wt_curr_womens UUID := gen_random_uuid();
    wt_curr_u85    UUID := gen_random_uuid();
    wt_curr_colts  UUID := gen_random_uuid();
    wt_past_prems  UUID := gen_random_uuid();

    p_id     UUID;
    v_event  text;
    v_points int;
BEGIN

-- ─────────────────────────────────────────
-- 1. Clubs
-- ─────────────────────────────────────────
INSERT INTO clubs (id, name, created_at) VALUES
    (c_prems,  'College Rifles Prems',         now()),
    (c_womens, 'College Rifles Women''s',       now()),
    (c_u85,    'College Rifles Raiders U85kg',  now()),
    (c_colts,  'College Rifles Colts',          now());

-- ─────────────────────────────────────────
-- 2. Club Settings (required by UI)
-- ─────────────────────────────────────────
INSERT INTO club_settings (club_id, club_name, primary_color, secondary_color, default_squad_size, player_types) VALUES
    (c_prems,  'College Rifles Prems',       '#1e3a5f', '#c8102e', 22, ARRAY['Performance']),
    (c_womens, 'College Rifles Women''s',    '#1e3a5f', '#c8102e', 22, ARRAY['Women''s']),
    (c_u85,    'College Rifles Raiders U85', '#1e3a5f', '#c8102e', 22, ARRAY['Open']),
    (c_colts,  'College Rifles Colts',       '#1e3a5f', '#c8102e', 22, ARRAY['Performance']);

-- ─────────────────────────────────────────
-- 3. RDO Profile + Club Access
-- ─────────────────────────────────────────
-- RDO profile: club_id must be NULL so AuthContext sets activeClubId = null,
-- which triggers the Command Center view (role='rdo' AND activeClubId=null).
INSERT INTO profiles (id, club_id, role) VALUES
    (rdo_uuid, NULL, 'rdo')
ON CONFLICT (id) DO UPDATE SET role = 'rdo', club_id = NULL;

INSERT INTO rdo_club_access (user_id, club_id) VALUES
    (rdo_uuid, c_prems),
    (rdo_uuid, c_womens),
    (rdo_uuid, c_u85),
    (rdo_uuid, c_colts)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 4. Weeks — Current
-- ─────────────────────────────────────────
INSERT INTO weeks (id, club_id, start_date, end_date, label, status) VALUES
    (w_curr_prems,  c_prems,  date_trunc('week', now()::date)::date,     date_trunc('week', now()::date)::date + 6,     'Round 5', 'Open'),
    (w_curr_womens, c_womens, date_trunc('week', now()::date)::date,     date_trunc('week', now()::date)::date + 6,     'Round 5', 'Open'),
    (w_curr_u85,    c_u85,    date_trunc('week', now()::date)::date,     date_trunc('week', now()::date)::date + 6,     'Round 5', 'Open'),
    (w_curr_colts,  c_colts,  date_trunc('week', now()::date)::date,     date_trunc('week', now()::date)::date + 6,     'Round 5', 'Open');

-- Week — Past (for match events)
INSERT INTO weeks (id, club_id, start_date, end_date, label, status) VALUES
    (w_past_prems, c_prems, date_trunc('week', now()::date)::date - 7, date_trunc('week', now()::date)::date - 1, 'Round 4', 'Closed');

-- ─────────────────────────────────────────
-- 5. Week Teams
-- ─────────────────────────────────────────
INSERT INTO week_teams (id, week_id, club_id, team_name, sort_order, opponent) VALUES
    (wt_curr_prems,  w_curr_prems,  c_prems,  '1st XV',       1, 'Ponsonby'),
    (wt_curr_womens, w_curr_womens, c_womens, 'Women''s 1st',  1, 'Eden'),
    (wt_curr_u85,    w_curr_u85,    c_u85,    'Raiders',       1, 'University'),
    (wt_curr_colts,  w_curr_colts,  c_colts,  'Colts',         1, 'Grammar TEC');

INSERT INTO week_teams (id, week_id, club_id, team_name, sort_order, opponent, score_for, score_against) VALUES
    (wt_past_prems, w_past_prems, c_prems, '1st XV', 1, 'Waitemata', 35, 12);

-- ─────────────────────────────────────────
-- 6. Players
-- ─────────────────────────────────────────

-- Prems — 45 players, Performance
INSERT INTO players (club_id, name, email, phone, date_of_birth, primary_position, player_type, status, notes, court_fines)
SELECT
    c_prems,
    'PremPlayer ' || gs,
    'prem' || gs || '@test.com',
    '555-01' || gs,
    '1998-05-15',
    (ARRAY['Prop','Hooker','Lock','Flanker','Number 8','Scrum-half','Fly-half','Centre','Wing','Fullback'])[floor(random()*10+1)],
    'Performance',
    CASE WHEN random() < 0.05 THEN 'Injured' ELSE 'Active' END,
    CASE WHEN random() > 0.8  THEN 'Great breakdown work.' ELSE NULL END,
    CASE WHEN random() > 0.8  THEN '1 Jug: Late to warmup' ELSE NULL END
FROM generate_series(1,45) gs;

-- Women's — 35 players
INSERT INTO players (club_id, name, email, phone, date_of_birth, primary_position, player_type, status)
SELECT
    c_womens,
    'WomensPlayer ' || gs,
    'w' || gs || '@test.com',
    '555-02' || gs,
    '1999-08-22',
    (ARRAY['Prop','Hooker','Lock','Flanker','Number 8','Scrum-half','Fly-half','Centre','Wing','Fullback'])[floor(random()*10+1)],
    'Women''s',
    CASE WHEN random() < 0.10 THEN 'Injured' ELSE 'Active' END
FROM generate_series(1,35) gs;

-- Raiders U85 — 30 players, Open
INSERT INTO players (club_id, name, email, phone, date_of_birth, primary_position, player_type, status)
SELECT
    c_u85,
    'RaiderPlayer ' || gs,
    'u85' || gs || '@test.com',
    '555-03' || gs,
    '1995-02-10',
    (ARRAY['Prop','Hooker','Lock','Flanker','Number 8','Scrum-half','Fly-half','Centre','Wing','Fullback'])[floor(random()*10+1)],
    'Open',
    CASE WHEN random() < 0.25 THEN 'Injured' ELSE 'Active' END
FROM generate_series(1,30) gs;

-- Colts — 60 players, Performance
INSERT INTO players (club_id, name, email, phone, date_of_birth, primary_position, player_type, status)
SELECT
    c_colts,
    'ColtPlayer ' || gs,
    'colt' || gs || '@test.com',
    '555-04' || gs,
    '2004-11-05',
    (ARRAY['Prop','Hooker','Lock','Flanker','Number 8','Scrum-half','Fly-half','Centre','Wing','Fullback'])[floor(random()*10+1)],
    'Performance',
    CASE WHEN random() < 0.05 THEN 'Injured' ELSE 'Active' END
FROM generate_series(1,60) gs;

-- ─────────────────────────────────────────
-- 7. Availability
-- ─────────────────────────────────────────

-- Prems 90%
INSERT INTO availability_responses (week_id, club_id, player_id, availability)
SELECT w_curr_prems, c_prems, p.id,
    CASE WHEN random() < 0.90 THEN 'Available' ELSE 'Unavailable' END
FROM players p WHERE p.club_id = c_prems AND p.status = 'Active';

-- Women's 75%
INSERT INTO availability_responses (week_id, club_id, player_id, availability)
SELECT w_curr_womens, c_womens, p.id,
    CASE WHEN random() < 0.75 THEN 'Available' ELSE 'Unavailable' END
FROM players p WHERE p.club_id = c_womens AND p.status = 'Active';

-- U85 — 40% Available, 20% TBC, 40% Unavailable
INSERT INTO availability_responses (week_id, club_id, player_id, availability)
SELECT w_curr_u85, c_u85, p.id,
    CASE
        WHEN random() < 0.40 THEN 'Available'
        WHEN random() < 0.60 THEN 'TBC'
        ELSE 'Unavailable'
    END
FROM players p WHERE p.club_id = c_u85 AND p.status = 'Active';

-- Colts 85%
INSERT INTO availability_responses (week_id, club_id, player_id, availability)
SELECT w_curr_colts, c_colts, p.id,
    CASE WHEN random() < 0.85 THEN 'Available' ELSE 'Unavailable' END
FROM players p WHERE p.club_id = c_colts AND p.status = 'Active';

-- ─────────────────────────────────────────
-- 8. Team Selections
-- ─────────────────────────────────────────
INSERT INTO team_selections (week_id, week_team_id, club_id) VALUES
    (w_curr_prems,  wt_curr_prems,  c_prems),
    (w_curr_womens, wt_curr_womens, c_womens),
    (w_curr_u85,    wt_curr_u85,    c_u85),
    (w_curr_colts,  wt_curr_colts,  c_colts);

-- ─────────────────────────────────────────
-- 9. Match Events — past prems week
-- ─────────────────────────────────────────
FOR i IN 1..8 LOOP
    SELECT id INTO p_id FROM players WHERE club_id = c_prems ORDER BY random() LIMIT 1;

    v_event := (ARRAY['try','conversion','penalty','dotd','yellow_card','mvp_3','mvp_1'])[floor(random()*7+1)];

    v_points := CASE v_event
        WHEN 'try'        THEN 5
        WHEN 'conversion' THEN 2
        WHEN 'penalty'    THEN 3
        WHEN 'mvp_3'      THEN 3
        WHEN 'mvp_2'      THEN 2
        WHEN 'mvp_1'      THEN 1
        ELSE 0
    END;

    INSERT INTO match_events (week_id, week_team_id, club_id, player_id, event_type, points)
    VALUES (w_past_prems, wt_past_prems, c_prems, p_id, v_event, v_points);
END LOOP;

END $$;
