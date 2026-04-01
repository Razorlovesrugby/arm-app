# SPEC: Selection Board — Full Rebuild (CP7)

**Type:** Rebuild of Existing Feature (scrap and replace)
**Priority:** Must Build Now
**Affects:** SelectionBoard.tsx, useSelectionBoard.ts, PlayerOverlay.tsx, bottom navigation, DB schema (week_teams, team_selections)
**PRD Reference:** §4.5 (Team Selection), §4.5.1–4.5.6, §7.3 (week_teams), §7.4 (team_selections), §7.5 (availability_responses)

---

## Why

The current Selection Board implementation has been corrected multiple times due to layout issues, interaction bugs, and unhandled edge cases. The root cause is an underspecified original spec. This document scraps the existing visual and interaction layer entirely and rebuilds it from a clean, agreed design validated in interactive mockup (selection-board-mockup-v4.html). The data hook logic is retained and extended.

---

## Adjacent Screen: Weeks (Out of Scope — Boundary Defined Here)

The Selection Board is one of three primary screens in ARM, accessible via the bottom navigation. The screen **before** the Selection Board in the coach's workflow is the **Weeks screen**, which handles:

- Creating and listing match weeks
- Copying / sharing the availability link for a given week
- Editing game notes for a week (single free-text field: time, location, opponent)

The Weeks screen is **not built in this spec**. However, the bottom navigation must include a Weeks tab that routes to this screen (placeholder acceptable for now). The Selection Board must not attempt to host any availability link or week management UI — those belong exclusively on the Weeks screen.

---

## What to Build

---

### Behaviour

#### App Shell — Bottom Navigation

A persistent bottom navigation bar sits at the bottom of the app shell, always visible. It contains three tabs:

| Tab | Label | Icon | Screen |
|-----|-------|------|--------|
| 1 | Roster | 👥 | Player roster screen (existing) |
| 2 | Board | 🏉 | Selection Board (this spec) |
| 3 | Weeks | 📅 | Weeks screen (future spec — placeholder for now) |

The active tab is highlighted in `#6B21A8` (purple). Inactive tabs use `rgba(255,255,255,0.35)`. Tapping a tab switches the active screen. The bottom nav height is 72px including safe-area padding (8px bottom inset). The nav bar does not scroll away.

---

#### Selection Board Screen — Layout

The Selection Board screen has four fixed layers stacked top to bottom:

1. **Header** (fixed, does not scroll) — week selector + team management button
2. **Team tabs** (fixed, does not scroll) — horizontal scrollable tab strip
3. **Board scroll area** (scrollable) — the full team roster with starters and bench
4. **Add Players pill** (fixed, floats above bottom nav) — opens the unassigned pool sheet

---

#### Header

The header contains two elements on a single row:

**Left — Week selector button:**
- Displays the label of the currently active week (e.g. "Sat 5 Apr")
- Tapping opens the Week Picker sheet (see Sheet: Week Picker below)
- Format: week label + a purple downward chevron (▾) to signal tappability
- No week label = show "No week selected" in muted colour

**Right — action row:**
- A `✓ Saved` label in `#22c55e` (green), 11px, that appears briefly (1.8s fade) after any mutation and is otherwise invisible. This is the only save feedback — there is no save button.
- A gear icon button (`⚙`) that opens the Team Management sheet for the currently active team.

---

#### Team Tabs

A horizontally scrollable tab strip below the header. One tab per visible `week_team` record for the active week. Tab labels are the team names. The active tab has a 2px bottom border in `#6B21A8` and white text. Inactive tabs are `rgba(255,255,255,0.4)`. Scrollable with no scrollbar visible. Tapping a tab sets it as the active team and re-renders the board.

Only teams where `visible = true` appear as tabs. A team where `visible = false` is hidden from the tab strip entirely — its data is preserved in the database.

---

#### Board Scroll Area — Structure

The scrollable content area renders the active team's player order. It is divided into two sections: **Starters** and **Bench**, separated by a visual divider.

**Starters section:**
- Section header row: label "STARTERS", count `{assigned} / {starters_count}` (e.g. "11 / 15")
- Slots 1 through `starters_count` — one row per slot
- Each slot renders either a **Filled Row** (player assigned) or a **Ghost Row** (slot empty)

**Bench divider:**
- A horizontal dashed line in `rgba(107,33,168,0.35)` with the label "BENCH" centred over it in `rgba(107,33,168,0.55)`

**Bench section:**
- Section header row: label "BENCH", count of bench players assigned
- Slots `starters_count + 1` through `starters_count + 8` — one row per slot, filled or ghost

Total ghost rows always shown: starters_count (default 15) + 8 bench slots = 23 rows maximum (some filled, some ghost).

---

#### Filled Player Row

A filled row is rendered when a player is assigned to that slot. Height: 52px. Border-bottom: `1px solid #0f0f0f`. Tap target for opening the Player Overlay is the **name/position area only** (not the drag handle or remove button).

Left to right contents:
1. **Slot number** — 22px wide, right-aligned, `rgba(255,255,255,0.45)`, 12px bold. Slot 1 = first starter, slot `starters_count + 1` = first bench player.
2. **Player info block** (flex: 1, min-width: 0) — tappable area:
   - Top line: player name, 14px bold, white. If this player is the team captain, a **"C" badge** appears immediately after the name — purple background (`#6B21A8`), white text, 9px, bold.
   - Bottom line: player's primary position, 11px, `rgba(255,255,255,0.28)`
3. **Availability dot** — 7px circle. Green (`#22c55e`) = Available, Amber (`#f59e0b`) = TBC.
4. **Drag handle** — the characters `⠿`, `rgba(255,255,255,0.18)`, 18px. This is the only touch target for drag-to-reorder. Touch area should be generous (min 44×44px touch target via padding).
5. **Remove button** — circular, 28px, border `1px solid rgba(255,255,255,0.1)`, `✕` character. On press: background transitions to `rgba(239,68,68,0.15)`, border to `rgba(239,68,68,0.5)`, text to `#ef4444`. Tapping removes player from the team immediately (optimistic update + Supabase write).

---

#### Ghost Row

A ghost row occupies an unfilled slot. Height: 52px. Opacity: 0.3. Not tappable. Not draggable.

Contents:
1. **Slot number** — same position as filled row, `rgba(255,255,255,0.25)`
2. **"Unfilled"** label — 13px, italic, `rgba(255,255,255,0.2)`
3. **Position hint** — for slots 1–15 only, the traditional rugby position name for that shirt number (see table below), 11px, `rgba(255,255,255,0.2)`. Slots 16+ show no position hint. This is a hint only — it does not constrain which player can be placed there.

**Shirt number → position hint mapping:**

| Slot | Position |
|------|----------|
| 1 | Loosehead Prop |
| 2 | Hooker |
| 3 | Tighthead Prop |
| 4 | Lock |
| 5 | Lock |
| 6 | Blindside Flanker |
| 7 | Openside Flanker |
| 8 | Number 8 |
| 9 | Scrum-half |
| 10 | Fly-half |
| 11 | Left Wing |
| 12 | Inside Centre |
| 13 | Outside Centre |
| 14 | Right Wing |
| 15 | Fullback |

---

#### Add Players Pill

A full-width purple button (`#6B21A8`) fixed above the bottom navigation bar. Label: `+ Add Players`, 15px bold white. Height: 50px. Border-radius: 14px. Tapping opens the Pool Sheet. A gradient fade (`linear-gradient(to top, #000 55%, transparent)`) sits behind it so it floats cleanly over the scroll content. The pill must never overlap the bottom nav.

---

### Sheet: Pool (Unassigned Players)

Opens as a bottom sheet when the Add Players pill is tapped. Height: 88% of the screen. The sheet title reads: `Add to {active team name}`.

**Filter chips** (horizontal scrollable row below the title):
- All · Available · TBC · Forward · Back
- Default: All selected
- Tapping a chip activates it and deactivates others (single-select)
- Filters apply to the unassigned pool list only. Assigned players in the board are never filtered.

**Pool list:**
- Each row: player name (14px bold), primary position + type below (11px muted), availability label right-aligned (Available in green / TBC in amber), and a circular `+` button (purple tint).
- Tapping anywhere on the row OR the `+` button assigns the player to the active team.
- A player who has already been assigned to any team does **not** appear in the pool.
- If all players are assigned: show "All players assigned" in centre, muted.
- If the filter produces no results: show "No players match this filter" in centre, muted.

**Assignment behaviour:**
- Player is removed from any team they were previously in (a player can only be in one team per week).
- Player is appended to the end of the active team's `player_order` array (becomes the last slot).
- Sheet closes immediately after assignment.
- Board re-renders. "✓ Saved" indicator appears.
- Supabase `team_selections` row is upserted (see Data Operations).

---

### Sheet: Player Overlay

Opens as a bottom sheet when the player info area of a filled row is tapped. This sheet shows full player detail and allows the coach to set captain and edit coach notes.

**Sheet header:**
- Player name (18px bold white)
- Below: primary position + current slot number, e.g. "Number 8 · Slot 8" (12px muted)
- Close button (✕) top-right

**Section 1 — Captain toggle:**
- Row with label "Captain" (14px bold white) left, toggle switch right.
- Toggle: 44×26px, `#333` when off, `#6B21A8` when on.
- Behaviour: tapping the toggle assigns or unassigns this player as captain for the active team.
- **Only one captain per team:** assigning a new captain immediately removes the previous one.
- **Live update:** the C badge on the player's row in the board list updates in real-time (the overlay can stay open while the board re-renders behind it).
- Captain assignment is per-week, not persistent across weeks.

**Section 2 — Player Info grid (2 columns × 2 rows):**

| Cell | Label | Value | Source |
|------|-------|-------|--------|
| Top-left | Last Team | e.g. "1st XV" | Derived — most recent team name from `team_selections` (see Data Operations) |
| Top-right | Last Played | e.g. "22 Mar" | Derived — date of the most recent week this player appeared in any `team_selections.player_order` |
| Bottom-left | Availability | "Available" (green) or "TBC" (amber) | `availability_responses` for this player + active week |
| Bottom-right | *(empty — reserved)* | — | — |

Each cell: `background: #1a1a1a`, `border-radius: 10px`, label in 10px uppercase muted, value in 13px bold white. Availability value is coloured (green/amber). If no `last_team` or `last_played` data exists (player has never been selected): show "—".

**Section 3 — Positions:**
- Label: "POSITIONS"
- Chip list: one chip per position in the player's `positions` array (primary + secondary). Primary position chip is purple-tinted (`rgba(107,33,168,0.15)` background, purple border, `#a855f7` text). Secondary positions are grey (`#1a1a1a` background, `#2a2a2a` border, `rgba(255,255,255,0.7)` text).
- If player has only one position: just one purple chip.

**Section 4 — Coach Notes:**
- Label: "COACH NOTES"
- Multi-line textarea, `background: #1a1a1a`, `border-radius: 10px`. Min-height ~72px. Placeholder: "Add a note…"
- Auto-saves on every `input` event with a debounce of 800ms. Triggers "✓ Saved" badge.
- Stores in `players.coach_notes` (existing column per PRD §7.1).

**Section 5 — Selection Note (conditional):**
- Label: "SELECTION NOTE"
- Only visible if the player submitted a note with their availability response for this week.
- If present: shown as a read-only styled block (`background: #1a1a1a`, italic text, `rgba(255,255,255,0.55)`).
- If absent: section is hidden entirely (no empty state shown).
- Source: `availability_responses.note` for this player + active week.

---

### Sheet: Team Management

Opens from the `⚙` gear button in the header. Applies to the currently active team.

**Fields:**

1. **Team Name** — text input, pre-filled with current name. Saved on "Save Changes".
2. **Starters Count** — stepper (− / value / +). Range: 1–22. Default: 15. Label reads: "Slots 1–{n} = starters". Saved on "Save Changes".
3. **Show this team** — toggle (on = visible in tabs, off = hidden). Label: "Show this team". Sub-label: "Hide if team has a bye this week". Saved on "Save Changes".

**Save Changes button:** full-width purple button. On tap:
- Updates `week_teams` record for this team + active week.
- Closes sheet.
- Re-renders board and team tabs (tab name updates immediately).
- "✓ Saved" badge appears.

**Starters count change behaviour:** if the new starters count is lower than the previous value and there are assigned players in slots that are now "bench", those players are not removed — they simply move to bench positions. No data is lost.

---

### Sheet: Week Picker

Opens when the week label in the header is tapped.

**List of weeks:** each row shows the week date label and a sub-label (opponent + home/away if available, otherwise blank). The currently active week has a purple `✓` checkmark on the right. Tapping any row sets that week as active, closes the sheet, and re-renders the full board (tabs, player assignments, availability dots all update for the newly selected week).

Weeks are listed most-recent-first.

---

### Drag-to-Reorder (Touch)

Drag-to-reorder allows the coach to change the slot order of players within the active team. This determines shirt numbers.

**Trigger:** pressing and holding the `⠿` drag handle on any filled row.

**Behaviour during drag:**
1. `touchstart` on the drag handle: a floating ghost element appears, positioned at the touch point. It shows the slot number and player name. The source row reduces to 40% opacity (visual "lifted" state). The board remains scrollable behind the ghost.
2. `touchmove`: the ghost follows the finger. As the finger crosses the midpoint of another filled row, a subtle `rgba(107,33,168,0.12)` highlight appears on the target row to indicate the drop position.
3. `touchend`: the ghost disappears. The player is inserted at the target position. All other players shift accordingly to maintain contiguous slots. The board re-renders. Supabase upsert is triggered. "✓ Saved" badge appears.

**Rules:**
- Players can be dragged to any slot within the team's `player_order` array — there is no starters/bench boundary enforcement. The coach can drag a starter to a bench slot and vice versa.
- Ghost rows cannot be dragged — only filled rows.
- If the player is released in the same position they started, no mutation occurs.
- During a drag, tapping other UI elements (remove button, player info area) must be suppressed.

**Implementation note:** this is a **touch-first** implementation using native `touchstart`, `touchmove`, `touchend` events. `touch-action: none` must be set on drag handles to prevent scroll interference. The floating ghost is a fixed-position element appended to the document body (not inside the scroll container) so it always appears above all other elements. See also: Notes for Dev.

---

### Data / Schema Changes

#### New column: `week_teams.visible`

```sql
ALTER TABLE week_teams
ADD COLUMN visible BOOLEAN NOT NULL DEFAULT true;
```

Controls whether a team tab appears in the Selection Board for the given week. Existing rows default to `true`.

---

#### New column: `team_selections.captain_id`

```sql
ALTER TABLE team_selections
ADD COLUMN captain_id UUID REFERENCES players(id) ON DELETE SET NULL;
```

Stores the UUID of the captain for this team in this week. Nullable. One captain per `team_selections` row (one row per team per week). No additional enforcement needed — the application layer enforces single-captain.

---

#### Derived fields: Last Team + Last Played

These are **not stored** on the `players` table. They are derived at read time by the `useSelectionBoard` hook (or a dedicated `usePlayerHistory` hook).

**Query pattern:**

```sql
-- For a given player_id, find the most recent team_selection containing them:
SELECT
  wt.name AS last_team,
  w.match_date AS last_played
FROM team_selections ts
JOIN week_teams wt ON ts.team_id = wt.id
JOIN weeks w ON ts.week_id = w.id
WHERE ts.player_order @> jsonb_build_array(player_id::text)
ORDER BY w.match_date DESC
LIMIT 1;
```

This query runs once when the Selection Board loads (or when the player overlay is opened). Results can be cached in component state for the session — no need to re-fetch per player open.

**Important:** the active week's current selections should be excluded from this query (you want "last played", not "currently selected"). Filter: `ts.week_id != current_week_id`.

---

#### No other schema changes.

The following tables are read but not structurally modified: `players`, `availability_responses`, `weeks`.

---

### Edge Cases & Rules

**Empty team (no players assigned):**
- Board renders all ghost rows (starters_count + 8 bench slots).
- Section counts show "0 / 15" for starters, "0" for bench.
- "C" badge cannot appear (no captain possible without players).
- Drag-to-reorder is disabled (nothing to drag).

**Week with no availability responses:**
- Players still appear in the unassigned pool.
- All availability dots are hidden (or a neutral grey dot can be shown — dev to match v4 mockup).
- Availability section in Player Overlay shows "—" or is hidden.
- Board must not crash.

**Player with no availability response for the active week:**
- Player still appears in the pool.
- No availability dot shown on their row.
- Availability cell in Player Overlay info grid shows "—".
- Selection Note section is hidden (no note submitted).

**Player assigned to another team, coach tries to add to a second team:**
- This can only happen via the Pool sheet.
- The pool only shows unassigned players — a player already on any team does not appear.
- Therefore this scenario cannot occur through normal flow. Dev does not need to handle a conflict UI.

**Reorder: dragging a bench player to a starter slot:**
- Permitted. No constraint enforced. Slot order is the only source of truth for shirt numbers.
- The starters/bench divider re-renders based on `starters_count` — the divider is positional, not semantic.

**Captain removed from team (via ✕ remove button):**
- When a player is removed, if `team.captain === player.id`, set `captain_id` to `null` and upsert.
- The C badge disappears from all rows immediately.

**starters_count changed via team management sheet:**
- If decreased: players now in overflow slots (above the new bench threshold) are not removed. They become bench players.
- If increased: ghost rows fill the new starter slots.
- `player_order` array is not modified — only `starters_count` changes.

**Saving captain with no players assigned:**
- Cannot occur (captain toggle only appears when a player overlay is open, which requires a filled row).

**Week picker: only one week exists:**
- Picker sheet still opens. Shows one row, already checked.

**Team tab strip: all teams hidden (visible = false):**
- No tabs rendered. Board shows an empty state: "No teams for this week. Tap ⚙ to show a team." This state should be extremely rare — guard it, don't design for it.

**Network error on any mutation:**
- Rollback optimistic update.
- Show a brief inline error label "Save failed — tap to retry" in red below the header (replacing the "✓ Saved" label position).
- The state reverts to what was in Supabase. This mirrors the existing hook's rollback pattern.

**Player overlay open during drag:**
- The Player Overlay sheet cannot be open at the same time as a drag. Drag handles have `touchstart` handlers — if a sheet is open, the drag should not initiate. Guard: if any sheet is visible, `touchstart` on drag handles does nothing.

**Last Team / Last Played: player has never appeared in any team_selection:**
- Both cells show "—".

---

### What NOT to Change

- `useSelectionBoard` hook's existing Supabase fetch logic for `week_teams`, `team_selections`, `availability_responses`, and `players` — extend, do not replace.
- `PlayerOverlay.tsx` data bindings and auto-save for `coach_notes` — these already work. Restructure the layout only.
- Player roster screen (existing) — untouched.
- Availability response form — untouched.
- PDF/text export logic — untouched.
- Week creation and availability link management — untouched (these belong to the Weeks screen, not yet built).
- Any existing Supabase RLS policies — schema columns are additive only.

---

### What to Keep / What to Delete / What to Rebuild

| Component | Decision | Notes |
|-----------|----------|-------|
| `useSelectionBoard` hook | **Keep with modifications** | Add: fetch `captain_id` from `team_selections`; fetch `visible` from `week_teams`; derive `lastTeam` + `lastPlayed` per player; expose `setCaptain(teamId, playerId)` and `setTeamVisible(teamId, bool)` mutations. Retain existing `assignPlayer`, `removePlayer`, `reorderTeam`, `movePlayer`, optimistic update + rollback pattern. |
| `SelectionBoard.tsx` | **Delete and rebuild** | Full visual rebuild per this spec. Do not carry forward any layout code from the existing component. |
| `PlayerOverlay.tsx` | **Keep with modifications** | Restructure layout: add info grid (Last Team, Last Played, Availability), Positions chips, rename fields to Coach Notes + Selection Note. Remove any Status field. Wire captain toggle to new `setCaptain` mutation. |
| Bottom navigation | **Build new** | Three-tab fixed bottom nav: Roster, Board, Weeks. Does not currently exist as a standalone component. |
| Team Management sheet | **Build new** | New sheet component for rename, starters count, and show/hide toggle. |
| Week Picker sheet | **Build new** | New sheet for week switching within the board. |
| Touch drag implementation | **Build new** | touchstart/touchmove/touchend on drag handles. Floating ghost element. See Notes for Dev. |

---

## Acceptance Criteria

- ✓ Bottom navigation renders with three tabs (Roster, Board, Weeks). Tapping each switches the active screen. Active tab is purple. The nav bar is always visible and never scrolls away.
- ✓ The Board screen header shows the active week label. Tapping it opens the Week Picker sheet. Selecting a different week updates the board, tabs, and all player data.
- ✓ Team tabs render one tab per `week_team` where `visible = true` for the active week. Tapping a tab switches the active team.
- ✓ The board renders ghost rows for all unfilled slots (starters_count + 8 bench slots). Ghost rows show position name hints for slots 1–15. Ghost rows are not tappable and not draggable.
- ✓ Starters and bench are separated by a dashed purple divider labelled "BENCH".
- ✓ Each filled row shows: slot number, player name, primary position, availability dot (green/amber), drag handle, remove button.
- ✓ If a player is the team captain, a purple "C" badge appears immediately after their name on the filled row.
- ✓ Tapping ✕ on a filled row removes the player from the team. If they were captain, `captain_id` is set to null. Board re-renders. Supabase upsert fires. "✓ Saved" appears.
- ✓ Tapping the player info area (name/position) on a filled row opens the Player Overlay sheet. Tapping ✕ or remove button does NOT open the overlay.
- ✓ The Player Overlay shows: player name, slot label, Captain toggle, info grid (Last Team / Last Played / Availability), Positions chips (primary highlighted purple), Coach Notes textarea, Selection Note (only if a note exists for this week).
- ✓ Toggling Captain on in the overlay sets this player as captain for the active team. If another player was already captain, their C badge disappears. The C badge on the newly-set captain's row appears in real-time (board re-renders without closing the overlay).
- ✓ Toggling Captain off removes the captain. No player has a C badge. `captain_id` is null. Supabase upsert fires.
- ✓ Coach Notes textarea auto-saves after 800ms debounce. "✓ Saved" appears.
- ✓ The Selection Note section in the Player Overlay is hidden if the player has no `availability_responses.note` for the active week. It is visible and read-only if a note exists.
- ✓ Last Team and Last Played in the info grid show the correct values derived from historical `team_selections` (excluding the current week). If no history exists, both show "—".
- ✓ Tapping "Add Players" opens the Pool sheet. The sheet is 88% of screen height. The title shows the active team name.
- ✓ The Pool sheet lists only unassigned players. Tapping a player assigns them to the active team, closes the sheet, and appends them to the end of `player_order`. "✓ Saved" appears.
- ✓ Filter chips (All / Available / TBC / Forward / Back) filter the pool list. Only one chip is active at a time.
- ✓ Drag-to-reorder works on touch. Pressing the ⠿ handle lifts the row and shows a floating ghost. Moving the finger highlights the target slot. Releasing commits the reorder. Supabase upsert fires. "✓ Saved" appears.
- ✓ If a player is dragged to the same position, no mutation occurs.
- ✓ The gear icon opens the Team Management sheet. Renaming the team updates the tab label. Changing starters count re-renders the board with the new starter/bench boundary. Setting `visible = false` hides the team tab and removes it from view (team data preserved).
- ✓ An empty team (no players) renders all ghost rows without crashing.
- ✓ A week with no availability responses renders the board without crashing. No availability dots are shown.
- ✓ On any Supabase mutation failure: optimistic update rolls back, a "Save failed — tap to retry" label appears in red.
- ✓ All interactions work correctly on a 375px wide mobile screen (iPhone SE / standard iPhone viewport). No horizontal overflow. Touch targets are minimum 44×44px.

---

## Notes for Dev

**Touch drag implementation:**
Use native `touchstart` / `touchmove` / `touchend` events on the drag handle element. Set `touch-action: none` on the handle (and `user-select: none` on the whole app) to prevent scroll hijacking. The floating ghost should be a single `position: fixed` div appended to the phone screen container (not body, since the mockup is inside a frame), updated via `style.left` / `style.top` on each `touchmove`. Use `e.preventDefault()` inside `touchstart` (requires `{passive: false}` listener option) to prevent page scroll during drag. The dnd-kit library used in the main app is the right tool for this in production — this spec defines the behaviour; dnd-kit's `useSortable` with sensors configured for pointer/touch implements it.

**dnd-kit reference:** use `PointerSensor` with an `activationConstraint` of `{ distance: 8 }` to prevent accidental drags on tap. On mobile, also add `TouchSensor` with `{ delay: 150, tolerance: 5 }` to distinguish a drag from a scroll.

**Captain upsert:** when setting a captain, the update is: `UPDATE team_selections SET captain_id = $playerId WHERE week_id = $weekId AND team_id = $teamId`. When removing: `UPDATE team_selections SET captain_id = NULL ...`. This is a single-row update, not a full `player_order` upsert.

**Last Team / Last Played derivation:** this should be computed once when the board loads (not per overlay open) for all players currently in the pool and assigned. Store results in a map `{ [playerId]: { lastTeam: string, lastPlayed: string } }` in the hook state. The Supabase query uses the `@>` JSONB containment operator. Confirm Supabase supports this — it does via PostgREST `cs` filter or raw RPC.

**Scroll area height:** the board scroll area must account for both the header (variable height due to tabs) and the bottom nav + add pill. Use `calc(100vh - headerHeight - bottomNavHeight)` or a flex layout with `flex: 1; overflow-y: auto` on the scroll container. The add-pill is absolutely positioned within the scroll container's parent, not inside the scroll area.

**Sheet z-index:** all sheets must render above the bottom nav. Use a z-index of at least 50. The floating drag ghost must render above sheets (z-index 9999).

**PRD schema reference:** `team_selections` stores `player_order` as a JSONB array of player UUID strings. When reordering, the full array is replaced: `UPDATE team_selections SET player_order = $newOrderArray WHERE week_id = $weekId AND team_id = $teamId`. Upsert if no row exists yet.

**`useSelectionBoard` additions summary:**
- Read: `week_teams.visible` (existing column being added)
- Read: `team_selections.captain_id` (new column)
- Derive: `lastTeam`, `lastPlayed` per player from historical `team_selections`
- Mutate: `setTeamVisible(teamId, visible: boolean)` → upsert `week_teams.visible`
- Mutate: `setCaptain(teamId, playerId | null)` → update `team_selections.captain_id`
- Mutate: `renameTeam(teamId, name)` → upsert `week_teams.name`
- Mutate: `setStartersCount(teamId, count)` → upsert `week_teams.starters_count`
- All existing mutations (assignPlayer, removePlayer, reorderTeam) → unchanged behaviour, same optimistic update + rollback pattern
