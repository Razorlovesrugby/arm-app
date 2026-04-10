# ACTIVE SPEC: Phase 14.4 — Club Settings Expansion & Critical Bug Fixes

## Overview
**Phase:** 14.4 — Polish & Performance  
**Priority:** High  
**Target:** Reduce friction for players by adding position toggle in Availability Form and fix critical scroll lock bug. Give coaches control over default squad size. Debug and stabilize PlayerOverlay Kicking % metric.  
**Status:** Ready for Implementation  
**Previous Phase:** 14.3 (Match Event UX, Kicking Stats & Career Percentage)

## 🎯 Why (1‑2 sentences)
To reduce friction for players, the Availability Form needs an option to hide position fields, and its critical scroll‑lock bug must be fixed immediately. For coaches, the default squad size (currently hardcoded to 23) must be customizable in Club Settings. Finally, the PlayerOverlay Kicking % metric must be debugged and stabilized.

## 🏗️ Architecture Decisions (Locked)
1. **Database Schema:** Migration `015_phase_14_4.sql` adds two columns to `club_settings`:
   - `default_squad_size` (integer, default 22)
   - `require_positions_in_form` (boolean, default true)
2. **Selection Board Math:** `SelectionBoard.tsx` currently hardcodes `benchCount = 8`. Refactor to read `default_squad_size` from settings, dynamically calculating `benchCount = Math.max(0, squadSize - startersCount)`.
3. **Form Layout Fix:** The root container of `AvailabilityForm.tsx` (Shell component) must be strictly forced to `minHeight: '100dvh'`, `overflowY: 'auto'`, and `WebkitOverflowScrolling: 'touch'` to restore mobile touch scrolling.
4. **Kicking % Debug:** The `PlayerOverlay` fetch query will be hardened: fetch ALL events for the player and filter them in JavaScript to bypass any Supabase case‑sensitivity or enum mismatch errors.
5. **UI Consistency:** New fields in ClubSettings.tsx must follow existing Tailwind/design token patterns (light mode surfaces, proper spacing, clear labels).

## 📁 Files to Touch (Exact paths + what to do)

### 1. `supabase/migrations/015_phase_14_4.sql` (Create new)
- Add `default_squad_size` and `require_positions_in_form` columns to `club_settings` table.
- Set default values (22, true) and ensure column‑level comments.
- Migration must be idempotent (`IF NOT EXISTS`).

### 2. `src/lib/supabase.ts` (Update types)
- Extend `ClubSettings` interface to include `default_squad_size?: number` and `require_positions_in_form?: boolean`.

### 3. `src/pages/ClubSettings.tsx`
- Add a number input for "Default Squad Size" (label it clearly, placeholder "22").
- Add a toggle/checkbox for "Ask for Player Positions on Availability Form".
- Update validation to accept the new fields.
- Update the `updateClubSettings` call to include both new fields.

### 4. `src/pages/AvailabilityForm.tsx` (Scroll Bug & Position Toggle)
- **Scroll Fix:** Locate the outermost Shell `<div>`. Ensure its styles include:
  - `minHeight: '100dvh'`
  - `display: 'flex'`
  - `flexDirection: 'column'`
  - `overflowY: 'auto'`
  - `WebkitOverflowScrolling: 'touch'`
  - `position: 'relative'`
- **Toggle Logic:** Fetch `club_settings`. If `require_positions_in_form` is false, completely hide the Primary and Secondary position select dropdowns.

### 5. `src/components/SelectionBoard.tsx` (Dynamic Squad Size)
- Locate the `benchCount` variable (line 598).
- Refactor to read `clubSettings?.default_squad_size ?? 22`.

### 6. `src/components/PlayerOverlay.tsx` (Kicking % Debug)
- Replace the current `useEffect` that fetches kicking stats with a hardened version that:
  - Fetches ALL `match_events` for the player (no filtering by event_type in the query)
  - Filters in JavaScript for `'Conversion'`, `'Penalty'`, `'Conversion Miss'`, `'Penalty Miss'`
  - Calculates percentage: `Math.round((makes / total) * 100)` where `total > 0`

## 🎨 UI Implementation (Exact Tailwind/JSX - copy-paste ready)

### 1. `supabase/migrations/015_phase_14_4.sql` Migration
```sql
-- Migration 015: Phase 14.4 — Club Settings Expansion
-- Safe, idempotent migration

-- Add default_squad_size column
ALTER TABLE club_settings 
ADD COLUMN IF NOT EXISTS default_squad_size integer DEFAULT 22;

COMMENT ON COLUMN club_settings.default_squad_size IS 'Default squad size for team selection (e.g., 22 for 15+7)';

-- Add require_positions_in_form column
ALTER TABLE club_settings 
ADD COLUMN IF NOT EXISTS require_positions_in_form boolean DEFAULT true;

COMMENT ON COLUMN club_settings.require_positions_in_form IS 'Whether to ask for player positions in the public availability form';
```

### 2. `src/lib/supabase.ts` Updates
```typescript
// Update ClubSettings interface (around line 100-110)
export interface ClubSettings {
  id: string
  club_name: string
  brand_color: string | null
  logo_url: string | null
  default_teams: string[] | null
  created_at: string
  updated_at: string
  default_squad_size?: number           // NEW
  require_positions_in_form?: boolean   // NEW
}
```

### 3. `src/pages/ClubSettings.tsx` New Fields
```jsx
// Add after the default_teams section (around line 150-170):

{/* Default Squad Size */}
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700">
    Default Squad Size
  </label>
  <input
    type="number"
    min="15"
    max="35"
    value={form.default_squad_size ?? 22}
    onChange={(e) => setForm({ ...form, default_squad_size: parseInt(e.target.value) || 22 })}
    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
    placeholder="22"
  />
  <p className="text-xs text-gray-500">
    Number of players in a full squad (starters + bench). Default is 22 (15+7).
  </p>
</div>

{/* Position Toggle */}
<div className="flex items-center justify-between py-3">
  <div>
    <p className="text-sm font-medium text-gray-700">Ask for Player Positions on Availability Form</p>
    <p className="text-xs text-gray-500">Players will see Primary/Secondary position dropdowns</p>
  </div>
  <button
    type="button"
    onClick={() => setForm({ ...form, require_positions_in_form: !form.require_positions_in_form })}
    className={`relative inline-flex h-6 w-11 items-center rounded-full ${form.require_positions_in_form ? 'bg-purple-600' : 'bg-gray-200'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${form.require_positions_in_form ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
</div>
```

### 4. `src/pages/AvailabilityForm.tsx` Scroll Fix
```jsx
// Find the outermost Shell div (around line 50-70) and update its styles:
<div style={{
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  position: 'relative',
  background: '#F9FAFB',
}}>
```

### 5. `src/components/SelectionBoard.tsx` Dynamic Squad Size
```jsx
// Find line ~598 and replace:
const BENCH_COUNT = 8

// With:
const squadSize = clubSettings?.default_squad_size ?? 22
const BENCH_COUNT = Math.max(0, squadSize - startersCount)
```

### 6. `src/components/PlayerOverlay.tsx` Kicking % Debug
```typescript
// Replace the existing kicking percentage useEffect with:
useEffect(() => {
  async function fetchKickingStats() {
    const { data } = await supabase
      .from('match_events')
      .select('event_type')
      .eq('player_id', player.id)
    
    if (data) {
      let makes = 0
      let total = 0
      
      data.forEach(event => {
        const type = event.event_type
        if (type === 'Conversion' || type === 'Penalty') {
          makes++
          total++
        } else if (type === 'Conversion Miss' || type === 'Penalty Miss') {
          total++
        }
      })
      
      if (total > 0) {
        setKickingPct(Math.round((makes / total) * 100))
      } else {
        setKickingPct(null)
      }
    }
  }
  
  fetchKickingStats()
}, [player.id])
```

## ✅ Acceptance Criteria (Checklist format, binary pass/fail)

### Database Migration
- [ ] Migration `015_phase_14_4.sql` exists and adds both columns
- [ ] `default_squad_size` column exists with default 22
- [ ] `require_positions_in_form` column exists with default true
- [ ] Migration uses idempotent pattern (`IF NOT EXISTS`)

### Type Definitions
- [ ] `ClubSettings` interface in `supabase.ts` includes new fields
- [ ] TypeScript compilation passes with new interface

### Club Settings UI
- [ ] Number input for "Default Squad Size" appears in Club Settings
- [ ] Toggle for "Ask for Player Positions on Availability Form" appears
- [ ] Both fields save and load correctly
- [ ] Validation handles edge cases (min/max squad size)

### Availability Form Fixes
- [ ] Scroll lock bug fixed - form scrolls smoothly on mobile
- [ ] Position fields hide when `require_positions_in_form` is false
- [ ] Form layout remains intact when positions are hidden

### Selection Board Squad Size
- [ ] `BENCH_COUNT` dynamically calculated from `default_squad_size`
- [ ] PDF export respects custom squad size
- [ ] Team sheet displays correct number of bench slots

### Kicking % Debug
- [ ] PlayerOverlay fetches ALL match events (no query filtering)
- [ ] Kicking percentage calculated correctly in JavaScript
- [ ] Handles case sensitivity issues with event types
- [ ] Shows `—` when no kicking data exists

## ⚠️ Edge Cases (Already Handled)
1. **Mobile Scroll:** `100dvh` + `WebkitOverflowScrolling: 'touch'` fixes iOS Safari scroll lock
2. **Empty Settings:** `?? 22` fallback when `default_squad_size` is null
3. **Position Toggle:** Form gracefully hides position fields without layout shift
4. **Kicking Calculation:** Divide-by-zero prevented with `total > 0` check
5. **Backward Compatibility:** Existing data works with new columns (nullable)

## 🚀 Implementation Order (Step-by-Step)

### Step 1: Create and run database migration
```bash
# 1. Create supabase/migrations/015_phase_14_4.sql
# 2. Run migration to add new columns
# 3. Verify columns exist with correct defaults
```

### Step 2: Update type definitions in `supabase.ts`
```bash
# 1. Update ClubSettings interface
# 2. Verify TypeScript compilation passes
```

### Step 3: Update `ClubSettings.tsx` with new fields
```bash
# 1. Add number input for squad size
# 2. Add toggle for position requirement
# 3. Update save/load logic
# 4. Test UI interactions
```

### Step 4: Fix `AvailabilityForm.tsx` scroll bug
```bash
# 1. Update Shell container styles
# 2. Implement position toggle logic
# 3. Test mobile scrolling
```

### Step 5: Update `SelectionBoard.tsx` squad size logic
```bash
# 1. Replace hardcoded bench count
# 2. Calculate dynamically from settings
# 3. Verify PDF export respects squad size
```

### Step 6: Debug `PlayerOverlay.tsx` kicking percentage
```bash
# 1. Replace fetch query with hardened version
# 2. Filter events in JavaScript
# 3. Test with various player scenarios
```

### Step 7: Test all changes
```bash
# 1. Verify database operations work
# 2. Test Club Settings UI end-to-end
# 3. Test Availability Form on mobile
# 4. Verify Selection Board respects squad size
# 5. Confirm Kicking % works reliably
```

## 📝 Notes for Tech Lead (Not for Developer)
- **Reference Documents:** `/.docs/architecture.md`, `/.docs/ARM-TRACKER.md`, `ACTIVE_SPEC_14.3.md`
- **Database Impact:** Requires migration for new club_settings columns
- **Mobile Testing:** Critical to test Availability Form scroll fix on iOS Safari
- **Session Log Entry:** Update SESSION_LOG.md after completion with "Club Settings Expansion & Critical Bug Fixes"

## 🚨 Post-Implementation Documentation (Tech Lead Responsibility)
After Developer completes implementation, Tech Lead MUST:

1. **Update `/.docs/SESSION_LOG.md`** with new entry using exact format
2. **Update `/.docs/ARM-TRACKER.md`** - move task to "Done" section  
3. **Update `/.docs/architecture.md`** with any new UI patterns if established
4. **Update `/.docs/database_schema.md`** with new club_settings columns
5. **Move this `ACTIVE_SPEC.md` to `/.docs/phase-specs/`** as `14.4_Club_Settings_Expansion_Critical_Bug_Fixes_COMPLETED_SPEC.md`