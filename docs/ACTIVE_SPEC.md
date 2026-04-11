# ACTIVE_SPEC: 16.4HOTFIX - Exhaustive Mutation Sweep & Settings Patch

### 🎯 Why
The database's `NOT NULL` constraints on `club_id` are successfully blocking incomplete queries, but the frontend is throwing "Save failed" errors on certain pages (e.g., Club Settings). This indicates the previous frontend sweep missed injecting the `club_id` payload into several specific `insert`, `update`, or `upsert` calls. We must perform an exhaustive codebase search to audit and patch every single database mutation, completely eliminating these errors.

### 🧠 Context Gathering (MANDATORY FIRST STEP)
Before writing any code, you MUST perform a global search across `src/hooks/`, `src/components/`, and `src/pages/` for the following Supabase methods:
1. `.insert(`
2. `.update(`
3. `.upsert(`

Cross-reference these results with the 10 core tables: `players`, `depth_chart_order`, `weeks`, `week_teams`, `availability_responses`, `team_selections`, `club_settings`, `match_events`, `training_attendance`, `archive_game_notes`.

### 🏗️ Architecture Decisions
- **The Golden Rule for Writes:** EVERY mutation writing to a core table (except anonymous public forms) MUST include `club_id: activeClubId` in its data payload.
- **Null Blocking:** Every mutation function must gracefully abort (e.g., `if (!activeClubId) return;`) before calling Supabase to prevent raw database errors.
- **Settings Upsert Pattern:** `club_settings` (and any similar 1-to-1 club configuration tables) MUST use `.upsert()` rather than `.update()` to ensure they work for newly onboarded tenants that don't have existing rows.

### 📁 Files to Touch
1. `src/hooks/useClubSettings.ts` (or relevant settings component)
2. ANY file discovered in Context Gathering that executes a Supabase mutation without explicitly including `club_id`.

### 🎨 Logic Implementation

**1. The Club Settings Fix (Priority)**
Locate the `club_settings` save function. Ensure it uses the Upsert pattern:
```typescript
const { error } = await supabase
  .from('club_settings')
  .upsert({
    ...newSettings,
    club_id: activeClubId, // <-- MANDATORY
    id: newSettings.id || undefined 
  }, { 
    onConflict: 'club_id' // Explicit conflict resolution
  });
```

**2. The Exhaustive Codebase Audit**
Review every `.insert()`, `.update()`, and `.upsert()` call found during Context Gathering.

If the payload lacks `club_id`, inject it: `club_id: activeClubId`.

Exception: If the mutation belongs to the public availability form, ensure it continues to securely derive the `club_id` from the fetched `week_id` rather than using `activeClubId` from auth.

### ✅ Acceptance Criteria

- [ ] AI Developer successfully performed a regex/global search for all Supabase mutation methods.
- [ ] The Club Settings save logic explicitly uses `.upsert()` and passes `club_id`.
- [ ] Every other `insert`, `update`, and `upsert` across the app has been audited and patched to include `club_id`.
- [ ] Super Admin can successfully onboard a new club, save settings, and edit all data without constraint errors.

### 🚀 Implementation Order

1. **Context Gathering**: Perform exhaustive search for all mutation calls
2. **Club Settings Priority Fix**: Convert `.update()` to `.upsert()` with `club_id` injection
3. **Mutation Audit**: Review each found mutation and add missing `club_id` payloads
4. **Null Checks**: Add `if (!activeClubId) return` guards before all mutations
5. **Testing**: Verify all core functionality works without constraint errors

### 📋 Files Requiring Updates (Based on Initial Audit)

1. `src/hooks/useClubSettings.ts` - Convert to upsert, add club_id
2. `src/hooks/useWeeks.ts` - Add club_id to week_teams inserts/updates
3. `src/hooks/useSelectionBoard.ts` - Add club_id to team_selections upserts
4. `src/pages/Attendance.tsx` - Add club_id to training_attendance upsert
5. `src/pages/ResultDetail.tsx` - Add club_id to club_settings update
6. `src/hooks/useMatchEvents.ts` - Add club_id to match_events insert
7. `src/hooks/useDepthChart.ts` - Add club_id to depth_chart_order update
8. `src/pages/Archive.tsx` - Add club_id to archive_game_notes update
9. `src/components/PlayerFormSheet.tsx` - Add club_id to player insert/update
10. `src/components/PlayerOverlay.tsx` - Add club_id to player update

### ⚠️ Edge Cases & Special Handling

- **Public Availability Form**: Must continue using `week.club_id` derived from token, not `activeClubId`
- **New Club Onboarding**: `club_settings` upsert pattern ensures first-time settings save works
- **Race Conditions**: Null checks prevent mutations during auth state transitions
- **Multi-Tenant Isolation**: All mutations must respect the authenticated user's club context