-- Migration: mark 22 players as Available for week ee946f57-5d3b-4726-9e2c-ed9fe30c6073
-- Idempotent: safe to re-run.

BEGIN;

DO $$
DECLARE
    v_week_id           uuid := 'ee946f57-5d3b-4726-9e2c-ed9fe30c6073';
    v_expected_token    uuid := '64d132d3-4fc7-4e39-9532-0d89d0b78b5c';
    v_actual_token      uuid;
    v_club_id           uuid;
    v_default_ptype     text;
    v_name              text;
    v_norm              text;
    v_player_id         uuid;
    v_existing_resp_id  uuid;
    v_miguel_created    boolean := false;
    v_action            text;

    v_names text[] := ARRAY[
        'Oliver Redman',
        'Jamie Wall',
        'Jack Alston',
        'Max Dallow',
        'Kyle Reid',
        'River Alderton',
        'Andrew Sterrit',
        'Miguel',
        'Taylen Patterson',
        'Cam Lister',
        'Luke Buckingham',
        'George Murray',
        'James Alley',
        'Rogan Hand',
        'Myles Soa',
        'Justin Abrau',
        'Eli Lesoa',
        'Adrian Sua',
        'Zac Ross',
        'Jude Farrel',
        'Jayden Davidson',
        'Harry Allen'
    ];
BEGIN
    -- 1) Sanity check: verify the week's availability_link_token matches.
    SELECT availability_link_token, club_id
      INTO v_actual_token, v_club_id
      FROM weeks
     WHERE id = v_week_id;

    IF v_actual_token IS NULL THEN
        RAISE EXCEPTION 'Week % not found', v_week_id;
    END IF;

    IF v_actual_token <> v_expected_token THEN
        RAISE EXCEPTION
          'Availability token mismatch for week %: expected %, got %',
          v_week_id, v_expected_token, v_actual_token;
    END IF;

    IF v_club_id IS NULL THEN
        RAISE EXCEPTION 'Week % has NULL club_id', v_week_id;
    END IF;

    RAISE NOTICE 'Sanity check passed. Derived club_id = %', v_club_id;

    -- Determine a safe default player_type: most common value already present for this club, else 'Senior'.
    SELECT player_type
      INTO v_default_ptype
      FROM players
     WHERE club_id = v_club_id
       AND player_type IS NOT NULL
     GROUP BY player_type
     ORDER BY COUNT(*) DESC
     LIMIT 1;

    IF v_default_ptype IS NULL THEN
        v_default_ptype := 'OPEN';
    END IF;

    -- 2) Loop over each name, resolve / insert the player, then upsert availability.
    FOREACH v_name IN ARRAY v_names LOOP
        v_norm           := LOWER(TRIM(v_name));
        v_player_id      := NULL;
        v_miguel_created := false;
        v_action         := NULL;

        -- Try to find an existing player (case-insensitive, trimmed) within this club.
        SELECT id
          INTO v_player_id
          FROM players
         WHERE club_id = v_club_id
           AND LOWER(TRIM(name)) = v_norm
         LIMIT 1;

        -- Special handling for Miguel: insert if not found.
        IF v_player_id IS NULL AND v_norm = 'miguel' THEN
            INSERT INTO players (
                id, name, email, phone, date_of_birth,
                primary_position, secondary_positions,
                player_type, status, subscription_paid,
                historical_caps, total_caps, is_retired,
                club_id, created_at, updated_at
            )
            VALUES (
                gen_random_uuid(), 'Miguel', 'miguel@email.com', '', DATE '2000-01-01',
                NULL, '[]'::jsonb,
                v_default_ptype, 'Active', false,
                0, 0, false,
                v_club_id, now(), now()
            )
            RETURNING id INTO v_player_id;

            v_miguel_created := true;
            RAISE NOTICE 'Inserted new player Miguel with id %', v_player_id;
        END IF;

        -- If still not found, log and skip.
        IF v_player_id IS NULL THEN
            RAISE NOTICE 'SKIPPED: no player match for "%"', v_name;
            CONTINUE;
        END IF;

        -- 3) Upsert availability row for (week_id, player_id).
        SELECT id
          INTO v_existing_resp_id
          FROM availability_responses
         WHERE week_id = v_week_id
           AND player_id = v_player_id
         LIMIT 1;

        IF v_existing_resp_id IS NOT NULL THEN
            UPDATE availability_responses
               SET availability = 'Available'
             WHERE id = v_existing_resp_id;
            v_action := 'UPDATED';
        ELSE
            INSERT INTO availability_responses (
                id, week_id, player_id, availability,
                submitted_primary_position, submitted_secondary_positions,
                availability_note, created_at, club_id
            )
            VALUES (
                gen_random_uuid(), v_week_id, v_player_id, 'Available',
                NULL, '[]'::jsonb,
                NULL, now(), v_club_id
            );
            v_action := 'INSERTED';
        END IF;

        RAISE NOTICE 'player="%", id=%, new_player=%, availability=%',
            v_name, v_player_id, v_miguel_created, v_action;
    END LOOP;

    RAISE NOTICE 'Migration complete for week %.', v_week_id;
END $$;

COMMIT;
