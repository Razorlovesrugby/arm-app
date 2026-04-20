CREATE OR REPLACE FUNCTION get_club_players(p_club_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(json_agg(row_to_json(p) ORDER BY p.name), '[]'::json)
  FROM (
    SELECT * FROM players
    WHERE club_id = p_club_id
    AND status != 'Archived'
  ) p;
$$;
