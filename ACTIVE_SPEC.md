# ACTIVE_SPEC: 16.3.1 HOTFIX - Selection Board Save Patch

### 🎯 Why
The database lockdown (16.3) is successfully enforcing `club_id` and RLS. However, the frontend Selection Board is still throwing a "Save failed" error. This indicates that the 16.2 frontend sweep missed injecting the `activeClubId` into one or more of the specific mutation functions (insert/update/upsert) used by the Selection Board.

### 🧠 Context Gathering (MANDATORY FIRST STEP)
Before writing any code, analyze how the Selection Board saves data:
1. Identify the exact hook/file responsible for saving player assignments (e.g., `src/hooks/useSelectionBoard.ts`, `useTeamSelections.ts`, or inside the component itself).
2. Identify which tables it writes to (e.g., `team_selections`, `week_teams`, `depth_chart_order`).

### 🏗️ Architecture Decisions
- **Targeted Patch:** We are ONLY fixing the Selection Board save logic.
- **Payload Injection:** Every single object passed to `.insert()`, `.update()`, or `.upsert()` within the Selection Board's scope MUST contain `club_id: activeClubId`.

### 📁 Files to Touch
1. `src/hooks/[The relevant Selection Board hook].ts`
2. `src/components/.../SelectionBoard.tsx` (If the save logic lives directly in the component)

### 🎨 Logic Implementation

**1. Patching the Mutations**
Locate the save functions (e.g., `saveSelection`, `updatePlayerPosition`, `upsertTeamList`). 
Ensure that the payload explicitly maps the `club_id`.

*Example Fix:*
```typescript
// BAD (What is likely causing the error):
const { error } = await supabase.from('team_selections').upsert(
  playersToUpdate.map(p => ({
    player_id: p.id,
    position: p.position,
    week_id: currentWeek
  }))
);

// GOOD (The Fix):
const { error } = await supabase.from('team_selections').upsert(
  playersToUpdate.map(p => ({
    player_id: p.id,
    position: p.position,
    week_id: currentWeek,
    club_id: activeClubId // <-- THIS IS MANDATORY
  }))
);
```

**2. Defensive Null Check**
Ensure the save function aborts immediately if `activeClubId` is missing, so it doesn't even attempt the Supabase call.
```typescript
if (!activeClubId) {
  console.error("Save aborted: No active club ID found.");
  // Trigger a UI error toast here if applicable
  return;
}
```

### ✅ Acceptance Criteria
- [ ] AI successfully identified the specific file handling the Selection Board save.
- [ ] All payloads in that file now strictly include `club_id: activeClubId`.
- [ ] Moving a player and saving no longer triggers the "Save failed" database constraint error.
