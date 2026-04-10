# ACTIVE SPEC: Phase 15.1 — Training Attendance Tracker & Availability Dashboard

**Status:** Ready for Implementation  
**Target:** Bridge training attendance with match-day selection  
**Priority:** High — Critical coach workflow enhancement  
**Context-Free:** ✅ All decisions locked below  
**Preserves All Features:** ✅ No existing functionality removed or broken

---

## 🎯 Why
To bridge the gap between week-round training and match-day selection. Coaches need to define custom training days, track attendance rapidly, and see attendance directly mapped against match availability and team selection.

---

## 🏗️ Architecture Decisions (Locked)

### Database Schema (Migration 016)
```sql
-- Add to club_settings
ALTER TABLE club_settings ADD COLUMN training_days JSONB DEFAULT '[{"id": "1", "label": "Wednesday"}]'::jsonb;

-- Create training_attendance table
CREATE TABLE training_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  week_id UUID REFERENCES weeks(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  attended BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, week_id, session_id)
);
-- Add RLS policies (enable RLS, policy for authenticated users)
```

### Navigation & Routing
- Add `/attendance` route to `App.tsx`
- Update sidebar: "Grid" → "Availability", add "Attendance" item
- Route structure: `/attendance` (new), `/grid` → "Availability" dashboard

### Data Fetching Strategy
- **Use `useQuery` for all Supabase fetches** (consistent with existing patterns)
- Attendance data: `useQuery` for `training_attendance` with `player_id` + `week_id` filters
- Club settings: Existing `useClubSettings` hook extended for `training_days`

### Attendance UX Pattern
- Matrix layout with sticky left column (player names)
- Columns: `week_id` + `session_id` groupings
- Tappable cells upsert `attended = true|false` via `useMutation`

### Availability Dashboard
- Combines: `training_attendance` + `availability_responses`
- Columns: `Player Name` | `Training (Current Week)` | `Status (Current Week)` | `Status (Next Week)`

### Selection Board Integration
- `PlayerOverlay`: Fetch `training_attendance` via `useQuery` for active week
- Display: `[Attended] / [Total Sessions]` in InfoGrid

---

## 📁 Files to Touch (Exact Paths)

1. **`supabase/migrations/016_phase_15_1.sql`** — NEW
   - SQL from Architecture section
   - Include RLS policies

2. **`src/lib/supabase.ts`** — UPDATE
   - Add `training_days: {id: string, label: string}[]` to `ClubSettings`
   - Add `TrainingAttendance` interface

3. **Routing & Navigation** — UPDATE
   - `App.tsx`: Add `/attendance` route
   - `Sidebar.tsx`: "Grid" → "Availability", add "Attendance" item

4. **`src/pages/ClubSettings.tsx`** — UPDATE
   - Add "Training Schedule" section after branding
   - Dynamic UI for `training_days` array (add/remove/edit)

5. **`src/pages/Attendance.tsx`** — NEW
   - Attendance matrix with sticky left column
   - `useQuery` for `training_attendance`, `useMutation` for toggles

6. **`src/pages/Grid.tsx`** — RENAME/REFACTOR
   - Header: "Grid" → "Availability"
   - Combine `training_attendance` + `availability_responses`

7. **`src/components/PlayerOverlay.tsx`** — UPDATE
   - Add `useQuery` for `training_attendance` (player + active week)
   - InfoGrid: `<InfoCell label="Training" value={`${attended}/${total}`} />`

---

## 🎨 UI Implementation (Tailwind Signatures)

### Club Settings Training Schedule
- **Component**: Add to `ClubSettings.tsx` after branding section
- **Layout**: `space-y-4` container, `space-y-3` for day list
- **Day Item**: `flex items-center gap-3` with `input` (`.flex-1.rounded-lg.border.border-gray-300.px-3.py-2.text-gray-900`) and Remove button (`.rounded-lg.bg-red-50.px-3.py-2.text-sm.font-medium.text-red-700`)
- **Add Button**: `.w-full.rounded-lg.bg-purple-100.px-4.py-3.text-sm.font-medium.text-purple-700`
- **Data Mapping**: Map `clubSettings?.training_days` array, each with `{id, label}`

### Attendance Matrix Cell
- **Component**: In `Attendance.tsx` grid cells
- **Size**: `h-12.w-12.flex.items-center.justify-center.rounded-lg.border`
- **States**: Attended → `.border-green-200.bg-green-50.text-green-700`, Empty → `.border-gray-200.bg-gray-50.text-gray-400`
- **Content**: `attended ? '✓' : '–'`
- **Interaction**: `onClick` calls `toggleAttendance(player.id, week.id, session.id)`

### PlayerOverlay Training Stat
- **Component**: Add to `PlayerOverlay.tsx` InfoGrid
- **Pattern**: `<InfoCell label="Training" value={`${attendedCount} / ${totalSessions}`} />`
- **Data**: Fetch via `useQuery` for `training_attendance` matching `player.id` and active `week.id`

---

## ✅ Acceptance Criteria (Binary Pass/Fail)

### Database Migration
- [ ] Migration 016 creates `training_attendance` table with correct schema
- [ ] `club_settings.training_days` column added as JSONB with default value
- [ ] RLS policies exist for `training_attendance` table

### Club Settings
- [ ] "Training Schedule" section visible in Club Settings
- [ ] Can add/remove/edit training day labels
- [ ] Changes persist to `club_settings.training_days`

### Navigation
- [ ] Sidebar includes "Attendance" tab
- [ ] "Grid" renamed to "Availability" in sidebar
- [ ] `/attendance` route works correctly

### Attendance Page
- [ ] Sticky left column with player names
- [ ] Columns group by week → session
- [ ] Tapping cells toggles attendance (green ✓ / gray –)
- [ ] Attendance data persists to Supabase

### Availability Dashboard
- [ ] Page header shows "Availability" not "Grid"
- [ ] Shows training ratio (e.g., "1/2") for current week
- [ ] Shows match availability status for current and next week
- [ ] Data matches attendance and availability records

### PlayerOverlay Integration
- [ ] Fetches training attendance for active week
- [ ] Displays `[Attended] / [Total Sessions]` in info grid
- [ ] Updates when attendance changes

---

## ⚠️ Edge Cases (Already Handled)

### Stale Session IDs
- If coach changes training days from 2 to 1, Attendance grid gracefully handles historical `session_id`s
- UI maps strictly to current `club_settings.training_days` structure

### Empty Training Days
- Fallback to default `[{"id": "1", "label": "Wednesday"}]`
- Clear UI messaging when no training days configured

### No Active Week
- Attendance page shows empty state when no open weeks
- Availability dashboard shows "No current week" messaging

### Network Failures
- Attendance toggles show optimistic updates
- Failed operations roll back with error toast

---

## 🚀 Implementation Order

1. **Database Migration 016 & Types** — Foundation
   - Create `016_phase_15_1.sql`
   - Update `src/lib/supabase.ts` types

2. **Sidebar Routing & Renaming** — Navigation
   - Update `App.tsx` and `Sidebar.tsx`
   - Test new routes

3. **Club Settings Training Builder** — Configuration
   - Add training schedule UI to `ClubSettings.tsx`
   - Implement add/remove/edit logic

4. **Build Attendance Page** — Core Feature
   - Create `Attendance.tsx` with sticky matrix
   - Implement attendance toggle logic

5. **Refactor Grid to Availability Dashboard** — Integration
   - Rename and update `Grid.tsx`
   - Combine training + availability data

6. **Wire Training to PlayerOverlay** — Selection Context
   - Update `PlayerOverlay.tsx` with training fetch
   - Add training stat to info grid

7. **Testing** — iOS Safari verification
   - Test all features on iOS Safari
   - Verify sticky columns work correctly

---

## 📝 Quick Start Commands

```bash
# Create migration file
touch supabase/migrations/016_phase_15_1.sql

# Create new attendance page
touch src/pages/Attendance.tsx

# Apply migration in Supabase SQL editor
# Copy content from migration file
```

**Deliverable:** Fully implemented Training Attendance Tracker with integrated Availability Dashboard, working on iOS Safari.