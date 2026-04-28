# ACTIVE_SPEC: Phase 19.0 — Player Merge Feature (Public Form Duplicate Cleanup)

## 📋 Metadata
- **Status**: ACTIVE  
- **Priority**: High (Data Integrity / Coach Workflow)
- **Phase**: 19.0
- **Estimated Effort**: 2-3 hours
- **Dependencies**: None
- **Related Specs**: 15.2 (Availability Form Data Collection)
- **Target Users**: Coaches managing rosters
- **Implementation Date**: Pending

## 🎯 Why This Matters
Players frequently submit the public availability form using slight name variations (e.g., "Jonny Smith" vs "Jonathan Smith"). This creates duplicate "failed match" player records with no real history. Coaches need a simple, safe way to merge these duplicates into the correct real player profile, transferring availability responses while preserving data integrity.

## 🧠 Current State Analysis

### 1. Database Schema
- **players table**: Has `historical_caps`, `total_caps`, `club_id` fields
- **availability_responses table**: `player_id`, `week_id`, `availability` (no unique constraint found)
- **training_attendance table**: `player_id`, `week_id`, `session_id`
- **match_events table**: `player_id` foreign key
- **team_selections table**: `captain_id` foreign key to players

### 2. Frontend Components
- **Roster Page** (`src/pages/Roster.tsx`): Displays player list with search/filter
- **PlayerCard** (`src/components/PlayerCard.tsx`): Clickable card, no action menu currently
- **DeletePlayerDialog**: Existing pattern for destructive operations

### 3. User Pain Point
Coaches see duplicate players like "J Smith" (created via public form) alongside real player "Jonathan Smith". They need to:
1. Identify which is the duplicate (usually newer, minimal data)
2. Merge duplicate's availability responses into real player
3. Delete the duplicate cleanly

## 🏗️ Architecture Decisions

### 1. **Database RPC Approach**
Create `merge_players(primary_id UUID, duplicate_id UUID)` function with:
- **SECURITY DEFINER**: Run as postgres to bypass RLS safely
- **Transaction Wrapped**: `BEGIN/COMMIT/ROLLBACK` for atomicity
- **Conflict Resolution**: Primary player's data wins on conflicts
- **Safety Checks**: Prevent self-merge, cross-club merges

### 2. **Simplified Data Transfer Logic**
Since duplicates are "failed matches" with minimal history:
- **Transfer**: Availability responses, training attendance
- **Ignore**: Match events, caps, court_fines (duplicate shouldn't have these)
- **Update**: Team selection captain references if duplicate is captain
- **Delete**: Duplicate player after successful transfer

### 3. **Frontend UX Pattern**
- **Trigger**: Three-dot menu (⋮) on PlayerCard → "Merge into existing player"
- **Modal**: Simple two-part interface:
  - Left: Duplicate player info (read-only)
  - Right: Searchable dropdown to select real player
- **Confirmation**: Clear warning about irreversible action
- **Feedback**: Success toast, automatic list refresh

### 4. **Safety First Design**
- **Cannot merge same player**: UI validation
- **Same club requirement**: Database validation
- **Preview**: Show what will be transferred (counts)
- **Undo protection**: Clear "cannot be undone" warning

## 📁 Files to Create/Modify

### 1. New Files
- `supabase/migrations/033_merge_players_rpc.sql` - RPC function with transaction safety
- `src/components/MergePlayerModal.tsx` - Merge interface modal

### 2. Modified Files
- `src/components/PlayerCard.tsx` - Add three-dot menu with merge option
- `src/pages/Roster.tsx` - Add merge state management
- `src/lib/supabase.ts` - Add RPC function type signature

## 🎨 Logic Implementation

### 1. The SQL RPC Migration
```sql
-- Migration 033: Player Merge RPC for Public Form Duplicate Cleanup
CREATE OR REPLACE FUNCTION merge_players(primary_id UUID, duplicate_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_same_club BOOLEAN;
BEGIN
  -- Safety: prevent self-merge
  IF primary_id = duplicate_id THEN
    RAISE EXCEPTION 'Cannot merge a player into themselves';
  END IF;

  -- Safety: ensure both players belong to same club
  SELECT COUNT(DISTINCT club_id) = 1 INTO v_same_club
  FROM players 
  WHERE id IN (primary_id, duplicate_id);
  
  IF NOT v_same_club THEN
    RAISE EXCEPTION 'Players must belong to the same club';
  END IF;

  BEGIN
    -- 1. Move Availability Responses (handle week conflicts: primary wins)
    UPDATE availability_responses
    SET player_id = primary_id
    WHERE player_id = duplicate_id
    AND week_id NOT IN (
      SELECT week_id FROM availability_responses WHERE player_id = primary_id
    );

    -- Delete any conflicting availability from duplicate
    DELETE FROM availability_responses WHERE player_id = duplicate_id;

    -- 2. Move Training Attendance (similar conflict handling)
    UPDATE training_attendance
    SET player_id = primary_id
    WHERE player_id = duplicate_id
    AND (week_id, session_id) NOT IN (
      SELECT week_id, session_id FROM training_attendance WHERE player_id = primary_id
    );
    DELETE FROM training_attendance WHERE player_id = duplicate_id;

    -- 3. Update Match Events (simple transfer - duplicate shouldn't have any)
    UPDATE match_events SET player_id = primary_id WHERE player_id = duplicate_id;

    -- 4. Update Team Selection captain references
    UPDATE team_selections SET captain_id = primary_id WHERE captain_id = duplicate_id;

    -- 5. Update Archive Game Notes player references
    UPDATE archive_game_notes SET player_id = primary_id WHERE player_id = duplicate_id;

    -- 6. Finally, delete the duplicate player
    DELETE FROM players WHERE id = duplicate_id;

    COMMIT;
  EXCEPTION WHEN OTHERS THEN
    ROLLBACK;
    RAISE;
  END;
END;
$$;
```

### 2. The React Frontend
**MergePlayerModal Component Structure:**
```tsx
interface MergePlayerModalProps {
  duplicatePlayer: Player;
  onClose: () => void;
  onSuccess: () => void;
}

// Key features:
// - Searchable player dropdown (excluding the duplicate)
// - Preview of what will transfer (e.g., "3 availability responses")
// - Red warning confirmation button
// - Loading state during RPC call
```

**PlayerCard Enhancement:**
```tsx
// Add three-dot menu with:
// - Edit (existing via onClick)
// - Merge Duplicate (new)
// - Delete (existing)
```

**Roster Page Integration:**
```tsx
// Add state for:
const [mergingPlayer, setMergingPlayer] = useState<Player | null>(null);
```

### 3. Type Definitions Update
Add to `src/lib/supabase.ts`:
```typescript
// RPC function signature
export interface MergePlayersParams {
  primary_id: string;
  duplicate_id: string;
}
```

## ✅ Acceptance Criteria

### Database Layer
- [ ] `merge_players` RPC function exists and is callable via `supabase.rpc()`
- [ ] Function uses transaction for atomic all-or-nothing operation
- [ ] Week conflicts are handled (primary player's data wins)
- [ ] Same-club validation prevents cross-club merges
- [ ] Self-merge is prevented with clear error

### Frontend Layer  
- [ ] Three-dot menu appears on PlayerCard in Roster view
- [ ] "Merge into existing player" option opens modal
- [ ] Modal shows duplicate player info (name, created date)
- [ ] Searchable dropdown filters out duplicate player
- [ ] Clear warning message about irreversible action
- [ ] Success toast appears after merge
- [ ] Player list refreshes automatically (duplicate disappears)

### User Experience
- [ ] Coach can identify duplicate and merge it in < 30 seconds
- [ ] No data loss - availability responses transfer correctly
- [ ] No database corruption from partial merges
- [ ] Clear feedback at every step (loading, success, error)

## 🚨 Edge Cases & Error Handling

1. **Network Failure During Merge**: Transaction rolls back, no partial data
2. **Duplicate Has Match Events**: Log warning but proceed (shouldn't happen)
3. **Primary Player Not Found**: Show error in dropdown validation
4. **Concurrent Modification**: Database transaction isolation prevents issues
5. **RLS Policy Conflicts**: SECURITY DEFINER bypasses safely for this operation

## 📊 Success Metrics
- **Reduction in duplicate player records** (tracked via admin dashboard)
- **Coach satisfaction** with duplicate cleanup workflow
- **Zero data corruption incidents** from merge operations

## 🔄 Rollback Plan
If issues arise:
1. **Disable feature**: Remove three-dot menu via feature flag
2. **Database restore**: Use Supabase point-in-time recovery if data corruption
3. **Hotfix**: Patch RPC function if logic errors found

---

**Ready for Implementation**: This spec provides complete technical and UX requirements for the Player Merge feature. The approach is simplified to match the real use case: cleaning up public form duplicates, not merging two established player histories.

**Next Step**: Toggle to Act mode to begin implementation.