# COMPLETED SPEC: Phase 17.9.3 - PlayerFormSheet Total Caps Display Fix & Database Synchronization

## Implementation Date: 2026-04-20
## Status: ✅ Complete

## 1. Context & Objective

Phase 17.9.3 addresses a critical user interface bug where the "Total Caps" field in PlayerFormSheet incorrectly edits `historical_caps` instead of displaying the actual calculated `total_caps` from the database column. This caused confusion as users thought they were editing total caps but only affected the historical portion.

**Primary Objective:** Fix the PlayerFormSheet "Total Caps" field to be read-only, displaying the actual `player.total_caps` value from the database, and ensure database triggers properly synchronize `total_caps` when `historical_caps` is manually updated in the database.

## 2. Problem Analysis

### Issues Identified
1. **Misleading UI**: Field labeled "Total Caps" actually edits `historical_caps` only
2. **Incorrect Data Display**: Shows historical caps value, not calculated total caps
3. **Missing Synchronization**: No database trigger updates `total_caps` when `historical_caps` changes
4. **User Confusion**: "Manual override of auto-calculated caps" text suggests editing total caps

### Root Causes
- PlayerFormSheet "Total Caps" field bound to `form.historical_caps` instead of `player.total_caps`
- No read-only display of actual calculated total caps
- Missing database trigger for `players.historical_caps` updates
- Historical caps editing moved to database-only (no frontend interface)

## 3. Solution Architecture

### 3.1 Frontend Fix: Read-Only Total Caps Display
```tsx
// Before (lines 486-498 in PlayerFormSheet.tsx):
{/* Total Caps */}
<Field label="Total Caps">
  <input
    type="number"
    min={0}
    value={form.historical_caps}
    onChange={e => set('historical_caps', parseInt(e.target.value) || 0)}
    style={inputStyle(false)}
  />
  <span style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '3px', display: 'block' }}>
    Manual override of auto-calculated caps
  </span>
</Field>

// After:
{/* Total Caps (read-only from database) */}
<Field label="Total Caps">
  <input
    type="number"
    value={player?.total_caps ?? 0}
    readOnly
    style={{ ...inputStyle(false), background: '#F9FAFB', color: '#6B7280', cursor: 'not-allowed' }}
  />
</Field>
```

### 3.2 Database Fix: Historical Caps Trigger
```sql
-- Migration 030_phase_17_9_3_caps_historical_trigger.sql
-- Trigger to update total_caps when historical_caps changes
CREATE OR REPLACE FUNCTION trg_caps_on_historical_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only refresh if historical_caps actually changed
  IF OLD.historical_caps IS DISTINCT FROM NEW.historical_caps THEN
    PERFORM refresh_player_caps(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_caps_players
AFTER UPDATE OF historical_caps ON players
FOR EACH ROW
EXECUTE FUNCTION trg_caps_on_historical_change();
```

### 3.3 Frontend Cleanup
- Remove `historical_caps` from `FormState` interface
- Remove from `EMPTY` form state initialization
- Remove from form population logic
- Remove from save payload (optional - for backward compatibility)

## 4. Implementation Details

### 4.1 Database Migration
- **File:** `supabase/migrations/030_phase_17_9_3_caps_historical_trigger.sql`
- **Applied:** Yes
- **Content:** Trigger function and trigger on `players` table for `historical_caps` updates

### 4.2 Frontend Changes
- **File:** `src/components/PlayerFormSheet.tsx`
  - Changed "Total Caps" field to read-only displaying `player.total_caps`
  - Removed "Manual override" text
  - Removed historical caps from form state management
  - Updated field styling to indicate read-only state

### 4.3 Workflow
1. **Historical Caps Management**: Done manually in database (not via frontend)
2. **Automatic Synchronization**: Database trigger calls `refresh_player_caps()` when `historical_caps` changes
3. **Total Caps Calculation**: `refresh_player_caps()` recalculates `total_caps = historical_caps + match_caps`
4. **Frontend Display**: PlayerFormSheet shows read-only `player.total_caps`

## 5. Testing & Validation

### 5.1 Test Cases Verified
1. **Open PlayerFormSheet**: "Total Caps" field shows correct value (matches database)
2. **Read-Only Field**: Cannot edit total caps in frontend
3. **Database Update**: Edit `historical_caps` in database → `total_caps` updates automatically
4. **Form Submission**: Saving form doesn't affect caps data
5. **Backward Compatibility**: Existing player data remains intact

### 5.2 Edge Cases Handled
- **NULL `total_caps`**: Field shows 0 as fallback
- **Read-Only Styling**: Visual indication (gray background, not-allowed cursor)
- **Trigger Efficiency**: Only fires when `historical_caps` actually changes
- **Security**: `SECURITY DEFINER` ensures trigger function bypasses RLS

## 6. Migration Dependencies

### 6.1 Prerequisite Migrations
- `011_v2_pivot.sql` - Original caps logic and `historical_caps` column
- `029_phase_17_9_2_caps_materialized.sql` - `total_caps` column and `refresh_player_caps()` function
- All Phase 16 multi-tenant migrations for RLS context

### 6.2 Independent Operation
- Can be applied independently of Phase 17.9.1 (RPC fix)
- Builds upon Phase 17.9.2 (materialized column)
- No breaking changes to existing functionality

## 7. Performance Considerations

### 7.1 Database Performance
- **Trigger Overhead**: Minimal - only fires on `historical_caps` updates (rare operation)
- **Function Efficiency**: `refresh_player_caps()` already optimized in Phase 17.9.2
- **Index Usage**: Leverages existing indexes on `team_selections` and `week_teams`

### 7.2 Frontend Performance
- **No Async Calls**: Direct read of `player.total_caps` (no RPC calls)
- **Simplified State**: Removed `historical_caps` from form state management
- **Reduced Complexity**: Read-only field eliminates change handlers

## 8. Rollback Strategy

### 8.1 Database Rollback
```sql
-- Remove trigger
DROP TRIGGER IF EXISTS trg_caps_players ON players;

-- Remove function
DROP FUNCTION IF EXISTS trg_caps_on_historical_change();
```

### 8.2 Frontend Rollback
- Restore "Total Caps" field to editable `historical_caps`
- Add back "Manual override" text
- Restore `historical_caps` to form state management

## 9. Documentation Updates

### 9.1 Files Updated
- This specification document
- `docs/ACTIVE_SPEC.md` (added Phase 17.9.3 entry)
- `ARM-TRACKER.md` (phase status)
- `SESSION_LOG.md` (implementation summary)

### 9.2 Developer Notes
- `total_caps` is now the authoritative source for total caps display
- Historical caps management moved to database tools only
- Read-only fields should use appropriate styling for user clarity
- Database triggers ensure data consistency across manual updates

## 10. Acceptance Criteria Met

- [x] "Total Caps" field displays `player.total_caps` (read-only)
- [x] Field cannot be edited in frontend
- [x] "Manual override" text removed
- [x] Database trigger updates `total_caps` when `historical_caps` changes
- [x] Historical caps removed from frontend form state
- [x] No console errors on form open/save
- [x] TypeScript build passes (`npm run build`)

---

**Architectural Impact:** This phase completes the caps feature implementation by ensuring consistent data display across all interfaces and proper synchronization between historical caps edits and calculated total caps.