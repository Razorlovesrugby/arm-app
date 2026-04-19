17.9.1 BUG FIX

```text
# Context
You are an expert React, TypeScript, and Supabase developer. You are working on "ARM Tracker," a rugby team management PWA. 

## Architecture & Current State
- **Stack:** React 18, Vite, Tailwind CSS, Supabase (PostgreSQL).
- **Current Phase:** Phase 16.3.1 Complete (Multi-Tenant Architecture).
- **Multi-Tenant Rules:** The database is strictly locked down with Row Level Security (RLS). Every table has a `club_id`. Every frontend query MUST explicitly filter by `club_id` using an `activeClubId` from `AuthContext`, or operations will fail/return empty.
- **The Feature:** We are trying to display a player's "Total Caps" in the `PlayerOverlay.tsx` component.
- **The Calculation Pattern:** We use a "Compute-on-Read" pattern. Caps are NOT a static column. They are dynamically calculated via a Postgres RPC function (`calculate_player_caps`) defined in migration `011_v2_pivot.sql`.

## The Bug
We recently updated `src/components/PlayerOverlay.tsx` to fetch and display the Total Caps using the RPC, but the caps are **not updating or appearing correctly on the frontend**. It seems to be failing silently or returning null/0.

## What we recently added to `PlayerOverlay.tsx`
We added this state and effect:
```tsx
  const [totalCaps, setTotalCaps] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setTotalCaps(null)

    async function fetchCaps() {
      // Calling the RPC
      const { data, error } = await supabase.rpc('calculate_player_caps', { 
        p_player_id: player.id 
      })
      
      if (!cancelled && !error) {
        setTotalCaps(data)
      }
    }

    fetchCaps()
    return () => { cancelled = true }
  }, [player.id])
```

## The Database RPC (from `011_v2_pivot.sql`)
```sql
CREATE OR REPLACE FUNCTION calculate_player_caps(p_player_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_historical_caps INTEGER;
  v_match_caps INTEGER;
BEGIN
  SELECT COALESCE(historical_caps, 0) INTO v_historical_caps
  FROM players WHERE id = p_player_id;
  
  SELECT COUNT(DISTINCT ts.week_id) INTO v_match_caps
  FROM team_selections ts
  JOIN week_teams wt ON ts.week_team_id = wt.id
  WHERE (
    EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(ts.player_order) WITH ORDINALITY AS elem(player_id, idx)
      WHERE elem.player_id::UUID = p_player_id
        AND elem.idx BETWEEN 1 AND 23
    )
    AND (wt.score_for IS NOT NULL OR wt.score_against IS NOT NULL)
  );
  
  RETURN v_historical_caps + v_match_caps;
END;
$$ LANGUAGE plpgsql STABLE;
```

## Suspected Issues to Investigate
1. **Phase 16 Multi-Tenant RLS Block:** Since Phase 16 enforced strict RLS, does the `calculate_player_caps` RPC need to be updated to accept a `p_club_id` parameter, or does it need `SECURITY DEFINER` to bypass read restrictions on `team_selections` and `week_teams`?
2. **Missing Frontend Context:** Is the `useEffect` in `PlayerOverlay.tsx` failing because it isn't passing or checking `activeClubId` like all other Phase 16 hooks do?
3. **Array Indexing:** In Postgres `WITH ORDINALITY`, is `idx` 1-indexed? Does that align perfectly with our frontend JSONB array (slots 1-23)?

## Your Task
1. Diagnose exactly why the caps are not calculating/returning to the frontend.
2. If the RPC needs updating to handle Phase 16 Multi-Tenancy (RLS/club_id), provide the exact SQL migration to patch `calculate_player_caps`.
3. If the frontend `PlayerOverlay.tsx` fetch needs fixing (e.g., passing club context or handling errors better), provide the exact React code fix.
4. Output your solution as a clear, step-by-step fix.
```