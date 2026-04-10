# ACTIVE_SPEC: 16.2 Multi-Tenant Frontend Sweep

**Status:** 🏃 In Progress  
**Priority:** Critical — Enables database lockdown  
**Frontend Impact:** High — All data hooks require updates  
**Database Impact:** None — Schema already expanded in 16.1  

---

### 🎯 Why
The database has been soft-expanded to support `club_id` (Phase 16.1). Now, we must sweep the frontend data hooks to actively inject the logged-in coach's `activeClubId` into all database queries and mutations. This prepares the app for the final database lockdown (Phase 16.3) where `club_id` NOT NULL constraints and RLS will be enforced.

### 🏗️ Architecture Decisions (LOCKED)
- **The Auth Bridge:** `AuthContext.tsx` already fetches `club_id` from `profiles` table and exposes `activeClubId` via `useAuth()`.
- **Context Injection:** Every data hook must utilize `useAuth()` to grab the `activeClubId`.
- **Read Operations:** All `supabase.from('...').select()` calls accessed by the coach MUST append `.eq('club_id', activeClubId)`.
- **Write Operations:** All `insert()` and `update()` payloads MUST have `club_id: activeClubId` appended.
- **Anonymous Availability:** The public `AvailabilityForm.tsx` must fetch the week's `club_id` from the database and use it for player creation (not from auth).
- **Error Handling:** If `activeClubId` is null, hooks should block data operations at the hook level (console.error and abort). UI airlock comes in Phase 16.3.
- **Migration Strategy:** All hooks updated at once — database is "soft" (no NOT NULL, no RLS) from Phase 16.1.
- **Testing:** Feature parity only — verify Admin can still see their players and new Weeks save with `club_id` attached.

### 📁 Files to Touch

#### 1. `src/contexts/AuthContext.tsx` (Minor)
- Add null-check guard for `activeClubId` in fetchProfile
- Add loading state clarity for `activeClubId`

#### 2. `src/hooks/` (Sweep ALL 8 hooks)
- `usePlayers.ts` — Add `.eq('club_id', activeClubId)` to player queries
- `useWeeks.ts` — Add `.eq('club_id', activeClubId)` to week queries and `club_id: activeClubId` to insert payloads
- `useSelectionBoard.ts` — Add club filtering to: players fetch, week_teams fetch, team_selections fetch, availability_responses fetch
- `useClubSettings.ts` — Add `.eq('club_id', activeClubId)` to club_settings queries
- `useMatchEvents.ts` — Add `.eq('club_id', activeClubId)` to match_events queries and `club_id: activeClubId` to insert payloads
- `useDepthChart.ts` — Add `.eq('club_id', activeClubId)` to depth_chart_order queries
- `useGrid.ts` — Add `.eq('club_id', activeClubId)` to grid queries
- `usePlayerDetails.ts` — Add `.eq('club_id', activeClubId)` to player detail queries

#### 3. `src/pages/AvailabilityForm.tsx`
- **CRITICAL:** Fetch week's `club_id` via `SELECT club_id FROM weeks WHERE id = week_id`
- Store `club_id` in component state
- When creating new players, add `club_id: weekClubId` to insert payload
- When inserting availability responses, add `club_id: weekClubId` to insert payload

#### 4. `src/pages/ClubSettings.tsx`
- Ensure `useClubSettings` hook filters by `activeClubId` (already covered in hook updates)

### 🎨 Implementation Patterns

#### Standard Read Pattern (All Hooks):
```typescript
const { activeClubId } = useAuth();

// DEFENSIVE: Block if activeClubId is null
if (!activeClubId) {
  console.error('activeClubId is null - cannot fetch data');
  return; // or set error state
}

const { data } = await supabase
  .from('table_name')
  .select('*')
  .eq('club_id', activeClubId); // ← CRITICAL
```

#### Standard Write Pattern (All Hooks):
```typescript
const { activeClubId } = useAuth();

// DEFENSIVE: Block if activeClubId is null
if (!activeClubId) {
  console.error('activeClubId is null - cannot write data');
  return { error: 'No active club' };
}

const { error } = await supabase
  .from('table_name')
  .insert([{ 
    ...payload, 
    club_id: activeClubId // ← CRITICAL
  }]);
```

#### Anonymous Availability Pattern (AvailabilityForm.tsx):
```typescript
// Step 1: Fetch week with club_id
const { data: week } = await supabase
  .from('weeks')
  .select('club_id')
  .eq('id', weekId)
  .single();

// Step 2: Use week.club_id for player creation
const { error } = await supabase
  .from('players')
  .insert([{
    name: form.name,
    phone: normalisePhone(form.phone),
    email: form.email || null,
    date_of_birth: form.birthday || null,
    club_id: week.club_id, // ← FROM WEEK RECORD
    subscription_paid: false,
  }]);

// Step 3: Also add club_id to availability response
const { error: respErr } = await supabase
  .from('availability_responses')
  .insert({
    week_id: week.id,
    player_id: playerId,
    availability: form.availability,
    club_id: week.club_id, // ← FROM WEEK RECORD
    submitted_primary_position: form.primaryPosition || null,
    submitted_secondary_positions: form.secondaryPositions,
    availability_note: form.availabilityNote.trim() || null,
  });
```

### ✅ Acceptance Criteria (Binary Pass/Fail)
- [ ] `usePlayers` hook filters players by `club_id` and blocks if `activeClubId` is null
- [ ] `useWeeks` hook filters weeks by `club_id`, includes `club_id` in insert payloads, blocks if null
- [ ] `useSelectionBoard` hook filters all data by `club_id` and blocks if null
- [ ] `useClubSettings` hook filters club_settings by `club_id` and blocks if null
- [ ] `useMatchEvents` hook filters match_events by `club_id`, includes `club_id` in inserts, blocks if null
- [ ] `useDepthChart` hook filters depth_chart_order by `club_id` and blocks if null
- [ ] `useGrid` hook filters grid data by `club_id` and blocks if null
- [ ] `usePlayerDetails` hook filters player details by `club_id` and blocks if null
- [ ] `AvailabilityForm` fetches week's `club_id`, uses it for player creation and availability responses
- [ ] `AuthContext` has null-check guards for `activeClubId`
- [ ] All existing functionality works identically for the master club (ARM15 Lite Master)
- [ ] No console errors during normal operation (except legitimate null `activeClubId` cases)

### ⚠️ Edge Cases (Already Handled)
1. **Null activeClubId:** Hooks block operations, console.error, return early (UI airlock in Phase 16.3)
2. **Anonymous users:** AvailabilityForm fetches week.club_id from database (allowed while RLS is off)
3. **Existing master club data:** All data already backfilled with master club ID in Phase 16.1
4. **Cross-club contamination:** With club filtering, coaches only see their own club's data
5. **Week without club_id:** Should not happen (backfilled in 16.1) but handle gracefully

### 🚀 Implementation Order
1. **AuthContext polish** — Add null-check guards (5 minutes)
2. **Core hooks sweep** — `usePlayers`, `useWeeks`, `useSelectionBoard` (most critical, 30 minutes)
3. **Secondary hooks sweep** — `useClubSettings`, `useMatchEvents`, `useDepthChart`, `useGrid`, `usePlayerDetails` (20 minutes)
4. **Anonymous form update** — Update `AvailabilityForm.tsx` to fetch and use week.club_id (15 minutes)
5. **Testing** — Verify feature parity: login, roster, weeks, selection board, availability form (10 minutes)

### 📋 Notes for Developer
- **DO NOT** modify database schema or RLS — that's Phase 16.3
- **DO NOT** update tracker files or documentation — Tech Lead handles that
- **DO** implement defensive null checks in ALL hooks
- **DO** test thoroughly: login, roster, weeks, selection board, availability form
- **DO** ensure zero regression for existing master club functionality
- **Reference:** Phase 16.1 completed spec shows all tables now have `club_id` column
- **Time estimate:** 80 minutes total

---

**Ready for Developer execution. When complete, say: "Code implementation complete. Handing back to Tech Lead."**