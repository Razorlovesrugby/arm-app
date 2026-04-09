# ACTIVE_SPEC: Phase 14.3 — Match Event UX, Kicking Stats & Career Percentage

## Overview
**Phase:** 14.3 — Polish & Performance  
**Priority:** High  
**Target:** Refine match event UI by removing unnecessary text (leaving only purple dot indicator), introduce advanced kicking stat tracking (Made vs. Attempted), and calculate career Kicking % on Player Overlay  
**Status:** Ready for Implementation  
**Previous Phase:** 14.2 (Depth Chart UX, Selection Board Light Mode & Bulk Add)

## 🎯 Why
To refine the match event UI by removing unnecessary text (leaving only the purple dot indicator), and to introduce advanced kicking stat tracking (Made vs. Attempted) with a calculated career Kicking % on the Player Overlay. This provides coaches with better visibility into player performance and kicking accuracy over time.

## 🏗️ Architecture Decisions (Locked)
1. **Database Extension:** A new migration (`014_phase_14.sql`) will add `'Conversion Miss'` and `'Penalty Miss'` to the `match_events` type check constraint.
2. **Event Type Capitalization:** Use capital case `'Conversion Miss'` and `'Penalty Miss'` to maintain consistency with readable event names.
3. **Points Value:** Missed kicks will have `points: 0` in the database.
4. **Stat Entry Logic:** Use standard sports entry logic:
   - UI Labels: "Conversions" (Made) and "Attempted" / "Penalties" (Made) and "Attempted"
   - Math: `Attempted = Makes + Misses`
   - Action: Tapping `+` on "Attempted" inserts a "Miss" record. Tapping `+` on "Made" inserts a "Make" record.
5. **Career Stats Calculation:** PlayerOverlay will fetch ALL historic match events for the player across all weeks/teams to calculate career kicking percentage.
6. **Migration Safety:** Use idempotent patterns (`IF NOT EXISTS`, exception handling) like previous migrations.

## 📁 Files to Touch (Exact paths + what to do)

### 1. `supabase/migrations/014_phase_14.sql` (Create new)
- Drop existing `match_events_event_type_check` constraint
- Recreate with `'Conversion Miss'` and `'Penalty Miss'` added
- Use idempotent exception handling pattern

### 2. `src/lib/supabase.ts`
- Add `'Conversion Miss'` and `'Penalty Miss'` to the `MatchEventType` type definition
- Update `MATCH_EVENT_TYPES` array to include new types

### 3. `src/hooks/useMatchEvents.ts`
- Update `PlayerEventCounts` interface to include `conversionMisses: number` and `penaltyMisses: number`
- Update `getTeamStats()` to parse and count miss events
- Update `getPlayerCounts()` to include miss counts in player totals
- Update `saveMatchEvents()` to handle insertion of miss events with `points: 0`

### 4. `src/pages/ResultDetail.tsx`
- **Purple Dot:** Remove "events" text, leaving only `●` indicator
- **Kicking Steppers:** Create horizontal split layout for "Made" and "Attempted" for both Conversions and Penalties
- Update `hasEvents` logic to include miss types
- Update `updateCount` and `getCount` to handle miss fields

### 5. `src/components/PlayerOverlay.tsx`
- Add local state: `const [kickingPct, setKickingPct] = useState<number | null>(null)`
- Add `useEffect` to fetch ALL `match_events` for `player.id` where `event_type IN ('Conversion', 'Penalty', 'Conversion Miss', 'Penalty Miss')`
- Calculate career percentage: `Math.round((makes / total) * 100)` where `total > 0`
- Replace empty `<div />` in 2x2 grid with `InfoCell` showing "Kicking %"

## 🎨 UI Implementation (Exact Tailwind/JSX - copy-paste ready)

### 1. `supabase/migrations/014_phase_14.sql` Migration
```sql
-- Migration 014: Phase 14.3 — Kicking Miss Events
-- Safe, idempotent migration

-- Drop existing constraint
ALTER TABLE match_events DROP CONSTRAINT IF EXISTS match_events_event_type_check;

-- Add new constraint with miss types
ALTER TABLE match_events ADD CONSTRAINT match_events_event_type_check
  CHECK (event_type IN (
    'try', 'conversion', 'penalty', 'drop_goal',
    'mvp_3', 'mvp_2', 'mvp_1', 'dotd',
    'yellow_card', 'red_card',
    'Conversion Miss', 'Penalty Miss'
  ));
```

### 2. `src/lib/supabase.ts` Updates
```typescript
// Update MatchEventType type (around line 128-132)
export type MatchEventType =
  | 'try' | 'conversion' | 'penalty' | 'drop_goal'
  | 'mvp_3' | 'mvp_2' | 'mvp_1' | 'dotd'
  | 'yellow_card', 'red_card'
  | 'Conversion Miss' | 'Penalty Miss'

// Update MATCH_EVENT_TYPES array (around line 154-158)
export const MATCH_EVENT_TYPES: MatchEventType[] = [
  'try', 'conversion', 'penalty', 'drop_goal',
  'mvp_3', 'mvp_2', 'mvp_1', 'dotd',
  'yellow_card', 'red_card',
  'Conversion Miss', 'Penalty Miss',
]
```

### 3. `src/hooks/useMatchEvents.ts` Updates

**Update PlayerEventCounts interface:**
```typescript
export interface PlayerEventCounts {
  playerId: string
  try: number
  conversion: number
  penalty: number
  drop_goal: number
  yellow_card: number
  red_card: number
  conversionMisses: number  // NEW
  penaltyMisses: number     // NEW
}
```

**Update getTeamStats() parsing logic (find the forEach loop around line 120-140):**
```typescript
// In the matchEvents.forEach loop, add:
case 'Conversion Miss':
  stats.conversionsMissed = (stats.conversionsMissed || 0) + 1
  break
case 'Penalty Miss':
  stats.penaltiesMissed = (stats.penaltiesMissed || 0) + 1
  break
```

**Update getPlayerCounts() (find the similar loop):**
```typescript
// Add to the switch case:
case 'Conversion Miss':
  playerCounts.conversionMisses = (playerCounts.conversionMisses || 0) + 1
  break
case 'Penalty Miss':
  playerCounts.penaltyMisses = (playerCounts.penaltyMisses || 0) + 1
  break
```

**Update saveMatchEvents() SCORING_POINTS and event types:**
```typescript
const SCORING_POINTS: Record<string, number> = {
  try: 5, conversion: 2, penalty: 3, drop_goal: 3,
  yellow_card: 0, red_card: 0,
  'Conversion Miss': 0, 'Penalty Miss': 0,  // NEW
}

// Update the delete query to include miss types:
.in('event_type', ['try', 'conversion', 'penalty', 'drop_goal', 'yellow_card', 'red_card', 'Conversion Miss', 'Penalty Miss'])

// Update the types array in the for loop:
const types: (keyof Omit<PlayerEventCounts, 'playerId'>)[] = [
  'try', 'conversion', 'penalty', 'drop_goal', 
  'yellow_card', 'red_card', 'conversionMisses', 'penaltyMisses',
]
```

### 4. `src/pages/ResultDetail.tsx` Updates

**Purple Dot Fix (around line 96-98):**
```jsx
// REPLACE:
{hasEvents && (
  <span className="ml-2 text-xs text-purple-700 font-medium">● events</span>
)}

// WITH:
{hasEvents && (
  <span className="ml-2 text-xs text-purple-700 font-medium">●</span>
)}
```

**Update hasEvents logic (around line 86-88):**
```jsx
const hasEvents = (['try','conversion','penalty','drop_goal','yellow_card','red_card','conversionMisses','penaltyMisses'] as const)
  .some(f => getCount(player.id, f) > 0)
```

**Kicking Steppers UI (replace lines 106-107 with this horizontal layout):**
```jsx
{/* Conversions - Made vs Attempted */}
<div className="space-y-2">
  <div className="text-sm font-semibold text-gray-700">Conversions</div>
  <div className="flex gap-3">
    {/* MADE */}
    <div className="flex-1 flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
      <span className="text-xs text-gray-600">Made</span>
      <div className="flex items-center gap-2">
        <button
          className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center"
          onClick={() => updateCount(player.id, 'conversion', Math.max(0, getCount(player.id, 'conversion') - 1))}
        >−</button>
        <span className="w-6 text-center font-medium">{getCount(player.id, 'conversion')}</span>
        <button
          className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center"
          onClick={() => updateCount(player.id, 'conversion', getCount(player.id, 'conversion') + 1)}
        >+</button>
      </div>
    </div>
    {/* ATTEMPTED */}
    <div className="flex-1 flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
      <span className="text-xs text-gray-600">Attempted</span>
      <div className="flex items-center gap-2">
        <button
          className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center"
          onClick={() => {
            const misses = getCount(player.id, 'conversionMisses')
            if (misses > 0) updateCount(player.id, 'conversionMisses', misses - 1)
          }}
        >−</button>
        <span className="w-6 text-center font-medium">
          {getCount(player.id, 'conversion') + getCount(player.id, 'conversionMisses')}
        </span>
        <button
          className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center"
          onClick={() => updateCount(player.id, 'conversionMisses', getCount(player.id, 'conversionMisses') + 1)}
        >+</button>
      </div>
    </div>
  </div>
</div>

{/* Penalties - Made vs Attempted */}
<div className="space-y-2">
  <div className="text-sm font-semibold text-gray-700">Penalties</div>
  <div className="flex gap-3">
    {/* MADE */}
    <div className="flex-1 flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
      <span className="text-xs text-gray-600">Made</span>
      <div className="flex items-center gap-2">
        <button
          className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center"
          onClick={() => updateCount(player.id, 'penalty', Math.max(0, getCount(player.id, 'penalty') - 1))}
        >−</button>
        <span className="w-6 text-center font-medium">{getCount(player.id, 'penalty')}</span>
        <button
          className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center"
          onClick={() => updateCount(player.id, 'penalty', getCount(player.id, 'penalty') + 1)}
        >+</button>
      </div>
    </div>
    {/* ATTEMPTED */}
    <div className="flex-1 flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
      <span className="text-xs text-gray-600">Attempted</span>
      <div className="flex items-center gap-2">
        <button
          className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center"
          onClick={() => {
            const misses = getCount(player.id, 'penaltyMisses')
            if (misses > 0) updateCount(player.id, 'penaltyMisses', misses - 1)
          }}
        >−</button>
        <span className="w-6 text-center font-medium">
          {getCount(player.id, 'penalty') + getCount(player.id, 'penaltyMisses')}
        </span>
        <button
          className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center"
          onClick={() => updateCount(player.id, 'penaltyMisses', getCount(player.id, 'penaltyMisses') + 1)}
        >+</button>
      </div>
    </div>
  </div>
</div>
```

### 5. `src/components/PlayerOverlay.tsx` Updates

**Add state and useEffect (add near other state declarations around line 69-73):**
```typescript
const [kickingPct, setKickingPct] = useState<number | null>(null)

// Add this useEffect after existing useEffects:
useEffect(() => {
  async function fetchKickingStats() {
    const { data } = await supabase
      .from('match_events')
      .select('event_type')
      .eq('player_id', player.id)
      .in('event_type', ['Conversion', 'Penalty', 'Conversion Miss', 'Penalty Miss'])
    
    if (data) {
      let makes = 0
      let total = 0
      
      data.forEach(event => {
        if (event.event_type === 'Conversion' || event.event_type === 'Penalty') {
          makes++
          total++
        } else if (event.event_type === 'Conversion Miss' || event.event_type === 'Penalty Miss') {
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

**Update Info Grid (replace line 186):**
```jsx
// REPLACE:
<div /> {/* reserved cell */}

// WITH:
<InfoCell label="Kicking %" value={kickingPct !== null ? `${kickingPct}%` : '—'} />
```

## ✅ Acceptance Criteria (Checklist format, binary pass/fail)

### Database Migration
- [ ] Migration `014_phase_14.sql` exists and handles check constraint perfectly
- [ ] `'Conversion Miss'` and `'Penalty Miss'` added to `match_events_event_type_check`
- [ ] Migration uses idempotent pattern (safe to run multiple times)

### Type Definitions
- [ ] `MatchEventType` in `supabase.ts` includes new miss types
- [ ] `MATCH_EVENT_TYPES` array updated with new types
- [ ] `PlayerEventCounts` interface includes `conversionMisses` and `penaltyMisses`

### Result Detail UI
- [ ] Purple dot indicator shows only `●` (no "events" text)
- [ ] Kicking UI displays "Made" and "Attempted" horizontally for both Conversions and Penalties
- [ ] "Attempted" number automatically equals Made + Missed
- [ ] Tapping `+` on "Attempted" adds a miss record
- [ ] Tapping `+` on "Made" adds a make record
- [ ] `hasEvents` logic includes miss types

### Player Overlay
- [ ] PlayerOverlay fetches ALL historic match events for player's career
- [ ] Kicking percentage calculated correctly: `(makes / total) * 100`
- [ ] Empty grid cell replaced with "Kicking %" InfoCell
- [ ] Shows `—` when no kicking data exists
- [ ] Shows percentage (e.g., "67%") when data exists
- [ ] Handles divide-by-zero (returns `null` when `total === 0`)

### Edge Case Handling
- [ ] Missed kicks have `points: 0` in database
- [ ] All database operations handle new event types correctly
- [ ] UI doesn't break when switching between players with/without kicking data

## ⚠️ Edge Cases (Already Handled)
1. **Divide by Zero:** In `PlayerOverlay`, if `totalAttempts === 0`, `kickingPct` remains `null` to avoid `NaN%`
2. **Existing Data:** Migration doesn't affect existing match events data
3. **Backward Compatibility:** Existing code continues to work with new event types
4. **Points Calculation:** Missed kicks correctly have 0 points in scoring calculations
5. **UI Consistency:** All new UI elements follow existing design patterns

## 🚀 Implementation Order (Step-by-Step)

### Step 1: Create and run database migration
```bash
# 1. Create supabase/migrations/014_phase_14.sql
# 2. Run migration to update check constraint
# 3. Verify constraint includes new miss types
```

### Step 2: Update type definitions in `supabase.ts`
```bash
# 1. Update MatchEventType type definition
# 2. Update MATCH_EVENT_TYPES array
# 3. Verify TypeScript compilation passes
```

### Step 3: Update `useMatchEvents.ts` hook
```bash
# 1. Update PlayerEventCounts interface
# 2. Update getTeamStats() parsing logic
# 3. Update getPlayerCounts() parsing logic
# 4. Update saveMatchEvents() to handle miss events
# 5. Test hook functionality with new event types
```

### Step 4: Update `ResultDetail.tsx` UI
```bash
# 1. Remove "events" text from purple dot
# 2. Implement horizontal kicking steppers for Conversions
# 3. Implement horizontal kicking steppers for Penalties
# 4. Update hasEvents logic to include miss types
# 5. Test UI interactions and state updates
```

### Step 5: Update `PlayerOverlay.tsx` with career stats
```bash
# 1. Add kickingPct state and useEffect
# 2. Implement fetch logic for career kicking stats
# 3. Calculate and display kicking percentage
# 4. Replace empty grid cell with Kicking % InfoCell
# 5. Test with players who have/no have kicking data
```

### Step 6: Test all changes
```bash
# 1. Verify database operations work with new event types
# 2. Test ResultDetail UI with various player scenarios
# 3. Verify PlayerOverlay shows correct career percentages
# 4. Test edge cases (no data, divide by zero, etc.)
# 5. Ensure backward compatibility with existing data
```

## 📝 Notes for Tech Lead (Not for Developer)
- **Reference Documents:** `/.docs/architecture.md`, `/.docs/ARM-TRACKER.md`, `ACTIVE_SPEC_14.2.md`
- **Database Impact:** Requires migration for new event types - backward compatible
- **Session Log Entry:** Update SESSION_LOG.md after completion with "Match Event UX, Kicking Stats & Career Percentage"

## 🚨 Post-Implementation Documentation (Tech Lead Responsibility)
After Developer completes implementation, Tech Lead MUST:

1. **Update `/.docs/SESSION_LOG.md`** with new entry using exact format
2. **Update `/.docs/ARM-TRACKER.md`** - move task to "Done" section  
3. **Update `/.docs/architecture.md`** with any new UI patterns if established
4. **Update `/.docs/database_schema.md`** with new match event types
5. **Move this `ACTIVE_SPEC.md` to `/.docs/phase-specs/`** as `14.3_Match_Event_UX_Kicking_Stats_Career_Percentage_COMPLETED_SPEC.md`