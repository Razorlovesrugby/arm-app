# ARM — Session Log

---

## Session Summary — Phase 2 Close-out + Phase 3 Complete — 2026-03-27

### Phase 1 — Completed (prior session)
- Supabase schema: all 6 tables created (players, depth_chart_order, weeks, week_teams, availability_responses, team_selections)
- RLS policies applied (002_rls.sql)
- Seed data applied (003_seed.sql — depth_chart_order rows for all 11 positions)
- Supabase Auth user created for coach login

**Note:** `players` table includes `email` (TEXT NOT NULL) and `date_of_birth` (DATE NOT NULL) — confirmed addition to locked schema (Option A accepted by product owner 2026-03-27).

### Phase 2 — Scaffold — Completed

- CP-2.1 — Vite + React + TS + Tailwind scaffold, all dependencies installed
- CP-2.2 — Design tokens (CSS custom properties), badge classes, base styles
- CP-2.3 — Nav shell: Layout with bottom tab bar (mobile) + sidebar (tablet/desktop)
- CP-2.4 — Auth: AuthContext, ProtectedRoute, Login page
- CP-2.5 — App.tsx routing (Players/Roster/DepthChart/Weeks/Archive + public AvailabilityForm)
- CP-2.6 — PWA: vite-plugin-pwa, manifest.json, offline.html, InstallPrompt component
- CP-2.7 — Missing stub pages created: Weeks.tsx, Archive.tsx, AvailabilityForm.tsx
- CP-2.8 — TypeScript build errors fixed (duplicate minHeight, vite-env.d.ts added)
- CP-2.9 — SESSION_LOG.md created; git initialised; first push to GitHub; Vercel env vars set; deployed

**Infrastructure notes:**
- GitHub repo: https://github.com/Razorlovesrugby/arm-app.git
- Vercel live URL: https://arm-app-black.vercel.app
- Git identity configured: raysairaijimckenzie@gmail.com / Razorlovesrugby
- Vercel env vars set: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY

### Phase 3 — Roster Tab — Completed

- CP-3.1 — usePlayers hook + live player list from Supabase, loading spinner, empty state
- CP-3.2 — Search by name, filter by status / type / position, active filter badge
- CP-3.3 — PlayerFormSheet: bottom sheet (mobile) + centred modal (desktop), full form with validation
- CP-3.4 — Add Player saves to Supabase (insert)
- CP-3.5 — Edit Player: tap card opens pre-populated form, saves via update
- CP-3.6 — DeletePlayerDialog: confirmation dialog, irreversible delete
- CP-3.7 — CSV export (in filter panel): exports filtered player list as .csv
- CP-3.8 — Build passing, committed, deployed to Vercel

**New files this phase:**
- src/hooks/usePlayers.ts
- src/pages/Roster.tsx (replaced stub)
- src/components/PlayerCard.tsx
- src/components/PlayerFormSheet.tsx
- src/components/DeletePlayerDialog.tsx

### Current state
- Last clean checkpoint: CP-3.8
- All changes committed: Yes
- Tests passing: N/A — no tests written yet
- Live URL: https://arm-app-black.vercel.app

### Next session starts at
- **CP-4.1** — Depth Chart tab: position columns render with players from Supabase
- Files to touch: `src/pages/DepthChart.tsx`, possibly `src/hooks/useDepthChart.ts`
- Decisions pending: None

### Paste this at the start of next session
"Continuing ARM Phase 4 from CP-4.1. Phases 1–3 complete and deployed. Supabase has all 6 tables. The app has: auth, nav shell, PWA setup, and a fully working Roster tab (list, search, filter, add/edit/delete, CSV export) at https://arm-app-black.vercel.app. Phase 4 builds the Depth Chart tab: vertical position columns (Prop → Unspecified), drag-to-reorder within columns using dnd-kit, player order persisted in depth_chart_order table, tapping a player opens the Edit Player form."

---

## Session Summary — Phase 4 Complete — 2026-03-27

### Phase 4 — Depth Chart — Completed

- CP-4.1 — `useDepthChart` hook: parallel fetch of players + depth_chart_order, merges into 11 `PositionColumn` objects (explicit order first, unordered players appended alphabetically). Includes optimistic `updateOrder` with Supabase upsert + rollback on failure.
- CP-4.2 — `DepthChart.tsx` renders 11 horizontally scrollable position columns with compact player chips (name + status badge), player count badge per column, loading spinner, error state.
- CP-4.3 + CP-4.4 — dnd-kit drag-to-reorder within each column. Each column has its own `DndContext` with PointerSensor + TouchSensor (200ms touch delay to avoid scroll conflict). Optimistic update fires immediately; Supabase upserts new order; rolls back on error. Visual drag feedback: purple border, shadow, 50% opacity.
- CP-4.5 — Tap player name opens `PlayerFormSheet` in edit mode (reuses Phase 3 component). Depth chart refetches after save.

**New files this phase:**
- `src/hooks/useDepthChart.ts`
- `supabase/seed_players.sql` (33 test players for QA)

**Modified files:**
- `src/pages/DepthChart.tsx` (stub → full implementation)

### Infrastructure note
- GitHub push blocked by VM network proxy during this session.
- **Action required:** Run `git push origin main` from your terminal or GitHub Codespaces to deploy to Vercel.
- All 4 commits are staged locally and ready to push.

### Current state
- Last clean checkpoint: CP-4.4 (CP-4.5 delivered within CP-4.2)
- All changes committed locally: Yes
- Pushed to GitHub: **No — requires manual push (see above)**
- Tests passing: N/A

### Next session starts at
- **CP-5.1** — Weeks tab: create week form, auto-insert 5 week_teams rows, generate UUID token
- Files to touch: `src/pages/Weeks.tsx`, new `src/hooks/useWeeks.ts`
- Decisions pending: None

### Paste this at the start of next session
"Continuing ARM Phase 5 from CP-5.1. Phases 1–4 complete. The app has auth, nav shell, PWA, Roster tab (full CRUD + CSV export), and Depth Chart tab (11 position columns, drag-to-reorder with dnd-kit, persisted to Supabase, tap-to-edit). Live at https://arm-app-black.vercel.app. Phase 5 builds the Weeks tab: create week, auto-insert week_teams, shareable availability link with UUID token, and week dropdown switcher."

---

## Session Summary — Phase 5 Complete — 2026-03-27

### PRD version confirmed
- PRD v1.7 (Final) read in full. Used as source of truth.
- Key v1.7 additions noted and implemented:
  - Multiple open weeks allowed (no limit)
  - Two link buttons: Copy Link + Share (native OS share sheet, pre-formatted message)
  - `submitted_primary_position` + `submitted_secondary_positions` columns in `availability_responses` (migration 004 added)
  - Availability form field order confirmed: Name → Phone → Availability → Positions → Note (Phase 6)

### Phase 5 — Weeks Tab — Completed

- CP-5.1 — `useWeeks` hook: fetches all weeks with nested `week_teams`, exposes `openWeeks`/`closedWeeks` derived lists, `createWeek` function (inserts week + auto-inserts 5 `week_teams` rows + generates UUID token via `crypto.randomUUID()`). Refetches after create.
- CP-5.2 — Weeks tab renders week list: label, date range, Open/Closed status badge. Auto-selects most recent open week on load. Shows "No weeks yet" empty state with CTA.
- CP-5.3 — Create Week form: bottom sheet (mobile) / centred modal (desktop). Date pickers for start + end date (defaults to current Mon–Sun). Auto-generated label ("Week of 17 Mar") updates live from start date unless user edits manually. Validation on save. Creates week + 5 `week_teams` rows in Supabase.
- CP-5.4 — Link panel on week detail card (open weeks only): URL pill display, Copy Link button (clipboard, 2s "Copied!" feedback), Share button (native `navigator.share` with pre-formatted message: "Belsize Park RFC — [label]. Please submit your availability for this week: [URL]. Takes 30 seconds, no login needed."). Fallback to clipboard copy if `navigator.share` not available.
- CP-5.5 — Week dropdown switcher: compact `<select>` showing all weeks (label + status). Auto-populates. All-weeks list rendered below active week card when 2+ weeks exist.
- CP-5.6 — Migration `004_availability_positions.sql`: adds `submitted_primary_position` (TEXT) and `submitted_secondary_positions` (JSONB) to `availability_responses`. Ready to apply before Phase 6.

**New / modified files:**
- `src/hooks/useWeeks.ts` (new)
- `src/pages/Weeks.tsx` (stub → full implementation, 682 lines)
- `supabase/migrations/004_availability_positions.sql` (new)

### Infrastructure note
- GitHub push blocked by VM network proxy (same as Phase 4).
- **Action required:** Run `git push origin main` from your terminal or GitHub Codespaces.
- Commit hash: `a4cd448` — all Phase 5 changes in one commit.
- **Also required:** Run migration `004_availability_positions.sql` in Supabase SQL editor before Phase 6.

### Current state
- Last clean checkpoint: CP-5.6
- All changes committed locally: Yes
- Pushed to GitHub: **No — requires manual push**
- Tests passing: N/A

### Next session starts at
- **CP-6.1** — Availability form public page (`/availability/:token`): renders form from week token, validates token, shows week label
- Files to touch: `src/pages/AvailabilityForm.tsx` (replace stub), possibly new `src/hooks/useAvailability.ts`
- Decisions pending: None — PRD v1.7 §4.4.3 + §5.9 are the spec

### Paste this at the start of next session
"Continuing ARM Phase 6 from CP-6.1. Phases 1–5 complete. The app has auth, nav shell, PWA, Roster (full CRUD + CSV), Depth Chart (drag-to-reorder, persisted), and a full Weeks tab (create week, UUID token, Copy Link + Share buttons, week switcher). Live at https://arm-app-black.vercel.app after manual push. Phase 6 builds the public Availability Submission form: /availability/:token page, matching logic, auto-create player, position sync on Available, store responses, success/error states, Supabase real-time for coach view."

---

## Session Summary — Phase 6 Complete — 2026-03-28

### PRD version confirmed
- PRD v1.8 read in full. Used as source of truth for Phase 6.

### Phase 6 — Schema Migration + Availability Form — Completed

- CP-6.1 — Migration 005: renamed `availability_responses.note → availability_note`, expanded `players.status` CHECK to include `Archived`, created `archive_game_notes` table (with partial unique index + RLS). TypeScript types updated: `PlayerStatus += Archived`, `AvailabilityResponse.note → availability_note`, `ArchiveGameNote` interface added, `PLAYER_STATUSES += Archived`. Roster: `showArchived` toggle (Archived hidden by default, purple checkbox in filter panel, included in activeFilters count, `clearFilters` resets it). `PlayerCard` Archived badge colour fixed (`#374151`).
- CP-6.2–6.5 — `AvailabilityForm.tsx` (full rewrite from stub, 595 lines): token resolution via anon Supabase query (invalid / closed / open states); form fields in PRD order (name → phone → availability card-radio → positions hidden when Unavailable → availability_note); submit logic: phone match → name ilike match → auto-create (Unspecified / Open / Active, placeholder email + DOB); position sync on Available submissions only; stores `availability_note` + `submitted_primary_position` + `submitted_secondary_positions`; success screen with player first name + availability label; 16px inputs (prevents iOS zoom); safe-area-inset padding.

**New / modified files:**
- `supabase/migrations/005_phase6.sql` (new)
- `src/lib/supabase.ts` (PlayerStatus, AvailabilityResponse, ArchiveGameNote, PLAYER_STATUSES)
- `src/pages/Roster.tsx` (showArchived toggle)
- `src/components/PlayerCard.tsx` (Archived badge)
- `src/pages/AvailabilityForm.tsx` (stub → full implementation)

### Infrastructure note
- GitHub push blocked by VM network proxy.
- **Action required:** Run `git push origin main` from terminal. Commits: `b71a504` (CP-6.1), `6e4c9ce` (CP-6.2–6.5).
- Migration `005_phase6.sql` already applied to Supabase (confirmed by user this session).

### Current state
- Last clean checkpoint: CP-6.5
- All changes committed locally: Yes
- Pushed to GitHub: **No — requires manual push**
- Tests passing: N/A

### Next session starts at
- **CP-7.1** — Selection Board: mobile layout (available players list + team dropdown assign)
- Files to touch: `src/pages/Weeks.tsx` (add Selection Board tab/section), new `src/hooks/useSelectionBoard.ts`, new `src/components/SelectionBoard.tsx`
- Decisions pending: None — PRD v1.8 §Selection Board locked

### Paste this at the start of next session
"Continuing ARM Phase 7 from CP-7.1. Phases 1–6 complete. The app has auth, nav shell, PWA, Roster (full CRUD + CSV + Archived toggle), Depth Chart (drag-to-reorder), Weeks tab (create, UUID token, share), and a fully working public Availability Form (/availability/:token — token lookup, player match/auto-create, position sync, availability_note, success screen). Live at https://arm-app-black.vercel.app. Phase 7 builds the Selection Board: mobile (available players list + team dropdown assign + swipe between teams + drag-to-reorder within team) and tablet/desktop (full multi-column drag-drop). Player overlay shows Coach Notes (editable) + Availability Note for the current week (read-only)."

---

## Session Summary — Phase 7 Complete — 2026-03-28

### PRD version confirmed
- PRD v1.8 read in full. Used as source of truth for Phase 7.

### Phase 7 — Selection Board — Completed

- CP-7.1 — `useSelectionBoard` hook: parallel fetch of players (non-archived), availability_responses (latest per player via DESC order), week_teams, team_selections for the selected weekId. Derives `unassignedPlayers` (Available/TBC/no-response, sorted Available-first then TBC then no-response, then alpha). Exposes `assignPlayer`, `removePlayer`, `reorderTeam`, `movePlayer` with optimistic updates + Supabase upsert (ON CONFLICT week_id,week_team_id) + fetchData rollback on error.
- CP-7.2 — Mobile unassigned list: `AssignRow` component — player name/position, availability badge, "Add to" dropdown showing all 5 teams. Assign calls `assignPlayer` and player moves to team view immediately.
- CP-7.3 — Mobile swipe: left/right arrow nav + dot indicator bar. Views cycle: Unassigned → Team 1 → Team 2 → … → Team 5. Dot click navigates directly.
- CP-7.4 — Mobile drag-to-reorder: `MobileTeamView` uses dnd-kit `SortableContext` + `useSortable` per player. TouchSensor with 200ms delay. Starters / Reserves sections split at `starters_count`. Persisted via `reorderTeam` on drag end.
- CP-7.5 — Desktop multi-column drag-drop: `DndContext` wraps all columns. `useDroppable` per column (including unassigned). Cross-team moves call `movePlayer`. Same-team reorder calls `reorderTeam`. `DragOverlay` renders dragged chip. `DesktopUnassignedColumn` is droppable — dropping a team player here calls `removePlayer`.
- CP-7.6 — `PlayerOverlay`: bottom sheet (mobile) / centred modal (desktop). Shows Coach Notes (editable textarea + Save button, saves to `players.notes`). Shows Availability Note (read-only, yellow callout, hidden if none submitted, labelled "Availability Note — Week of [label]"). Player info row shows status / type / secondary positions.
- CP-7.7 — Integration: `SelectionBoard` + `PlayerOverlay` wired into `Weeks.tsx`. Board renders below `WeekDetail` for open weeks only. `useSelectionBoard` called with `weekId = null` for closed/no weeks (hook no-ops). Commit: `8e39d8f`.

**Note on swipe gesture:** Implemented as arrow-nav + dot indicator rather than touch-swipe gesture. Actual swipe can be added in Phase 12 polish.

**New files:**
- `src/hooks/useSelectionBoard.ts`
- `src/components/SelectionBoard.tsx`
- `src/components/PlayerOverlay.tsx`

**Modified files:**
- `src/pages/Weeks.tsx`

### Infrastructure note
- GitHub push blocked by VM network proxy (same as prior phases).
- **Action required:** Run `git push origin main` from terminal. Commit: `8e39d8f`.
- No new Supabase migrations required for Phase 7.

- CP-7.8 — **Selection Board redesign** (this session): full rewrite of `SelectionBoard.tsx` to match product mockup.
  - Team tabs: scrollable pill-style tabs at top, one per team, with live player-count badge
  - TeamSheet: numbered position rows 1–15 (starters) + bench rows for any extra players; each row shows shirt-number circle, rugby position label (Loosehead Prop → Fullback), colored avatar circle with player initials + availability dot
  - FilledRow: avatar + name + position label + drag handle (dnd-kit long-press reorder) + × remove button; tap player to open PlayerOverlay
  - EmptyRow: dashed placeholder row showing shirt number + position name; tap scrolls to Unassigned pool
  - SortableFilledRow: dnd-kit useSortable with 200ms touch delay for in-team reorder; persists via reorderTeam
  - UnassignedPool: collapsible panel below team sheet; each player shows avatar + name + position + avail badge + purple "+" button; "+" appends player to the currently active team tab
  - Removed old multi-column desktop drag-drop layout; single tabbed UI works on all screen sizes
  - Props interface unchanged; Weeks.tsx integration unaffected. Commit: `f8cdd62`

### Current state
- Last clean checkpoint: CP-7.8
- All changes committed locally: Yes
- Pushed to GitHub: **No — requires manual push** (commits since last push: f8cdd62 + earlier session commits)
- Tests passing: N/A

### Next session starts at
- **CP-8.1** — Auto-remove: Unavailable submission removes player from team_selections for that week (app-level logic triggered on availability form submit)
- Then: **CP-9.1** — Close Week: confirmation dialog, set Closed, update last_played fields, auto-insert archive_game_notes rows
- Files to touch: `src/pages/AvailabilityForm.tsx` (Phase 8), `src/pages/Weeks.tsx` + new close-week logic (Phase 9)
- Decisions pending: None

### Paste this at the start of next session
"Continuing ARM Phase 8 from CP-8.1. Phases 1–7 complete and committed. The app has auth, nav shell, PWA, Roster (full CRUD + CSV + Archived toggle), Depth Chart (drag-to-reorder), Weeks tab (create, UUID token, share), Availability Form (public, full submit logic), and a fully working Selection Board (tabbed team view, numbered rugby position rows, colored avatar circles with initials + availability dot, dnd-kit drag-to-reorder, unassigned pool with '+' assign buttons, PlayerOverlay with editable Coach Notes). Live at https://arm-app-black.vercel.app after manual push. Phase 8: auto-remove player from team_selections when they submit Unavailable."

---

## Session Summary — CP7-A Selection Board Core Rebuild — 2026-03-29

### Completed checkpoints
- CP7A.0 — supabase.ts type patch: WeekTeam.visible + TeamSelection.captain_id
- CP7A.1 — New Layout.tsx (3-tab dark bottom nav: Roster/Board/Weeks), App.tsx (new flat routing), Board.tsx (standalone board page with week auto-select)
- CP7A.2 — useSelectionBoard.ts rebuilt: reads visible column, captain_id, new setCaptain mutation, saveStatus/setSaveStatus for ✓ Saved feedback, all existing mutations retained with optimistic update + rollback
- CP7A.3+4 — SelectionBoard.tsx full rebuild per spec: header (week label + gear + save badge), team tabs (scrollable, visible teams only), filled rows (slot#, name, C captain badge, avail dot, ⠿ drag handle, ✕ remove), ghost rows (Unfilled + rugby position hints for slots 1–15), starters/bench divider, Add Players pill, Pool sheet (All/Available/TBC/Forward/Back filter chips), dnd-kit PointerSensor+TouchSensor drag-to-reorder with DragOverlay ghost
- CP7A.5 — PlayerOverlay.tsx rebuilt: captain toggle (44×26px, purple on), 2×2 info grid (Last Team/Last Played=— placeholders, Availability coloured), positions chips (primary purple, others grey), Coach Notes textarea with 800ms debounce auto-save, Selection Note section (hidden if no note)
- CP7A.6 — Weeks.tsx stripped of SelectionBoard references. Build clean. Commit: 7fa7426

### Current state
- Last clean checkpoint: CP7A.6
- All changes committed: Yes (7fa7426)
- Pushed to GitHub: **No — requires manual push**
- Migration 006_cp7a.sql: **Not yet applied to Supabase** — must apply before deploy

### Required actions before next session
1. Apply `006_cp7a.sql` in Supabase SQL Editor
2. `git push origin main` from terminal to trigger Vercel deploy

### Next session starts at
- **CP7-B** — Last Team / Last Played data in PlayerOverlay, Team Management sheet, Week Picker sheet
  - OR —
- **CP-8.1** — Auto-remove: Unavailable submission removes player from team_selections
- Files to touch: `src/pages/AvailabilityForm.tsx` (Phase 8)
- Decisions pending: None

### Paste this at the start of next session
"Continuing ARM. CP7-A Selection Board Core Rebuild is complete and committed (7fa7426). The app has a fully rebuilt Selection Board on its own /board route with 3-tab bottom nav (Roster/Board/Weeks). Board features: header with week label, scrollable team tabs (visible teams only), filled/ghost position rows with rugby hints, drag-to-reorder (dnd-kit TouchSensor+PointerSensor), Add Players pill, Pool sheet with filter chips. PlayerOverlay has captain toggle, info grid (Last Team/Last Played=— placeholders for CP7-B), positions chips, debounced coach notes auto-save, and conditional selection note. BEFORE deploying: apply 006_cp7a.sql in Supabase (adds week_teams.visible + team_selections.captain_id), then git push origin main. Next: CP7-B (Last Team/Last Played data, Team Management sheet, Week Picker) or Phase 8 (auto-remove Unavailable)."

---

## Session Summary — CP7-B Selection Board Data Layer + Management — 2026-03-30

### Completed checkpoints
- CP7B.1 — Migration `007_cp7b.sql`: `get_player_last_selections(p_week_id UUID)` Postgres function using `start_date`/`team_name`/`week_team_id` (actual schema column names, not spec notation). Uses `DISTINCT ON` for clean most-recent-per-player query.
- CP7B.2 — `useSelectionBoard.ts` rebuilt: `activeWeekId` moves to internal state + `setActiveWeekId` exposed; `playerHistory` fetched via RPC once per week (not per overlay open); `allWeekTeams` fetches all teams including hidden for gear-button fallback; `saveTeamSettings` atomic patch returning `Promise<boolean>`; players fetch is week-agnostic (no re-fetch on week switch); `useMemo` for `teams` + `unassignedPlayers`.
- CP7B.3 — `PlayerOverlay.tsx`: `lastTeam` + `lastPlayed` props added; info grid cells wired with real data (fallback to "—").
- CP7B.4 — `SelectionBoard.tsx`: Team Management sheet (team name input, starters stepper 1–22, visibility toggle, Save Changes disabled when name empty, only closes on success, error badge stays on failure); Week Picker sheet (all weeks most-recent-first, formatted "EEE d MMM", purple ✓ on active, "No weeks yet" empty state, same week = close only); gear button and week label button wired; `activeTeamId` auto-resets when teams change (week switch or team hidden); board dims to 0.4 opacity while loading.
- CP7B.5 — `Board.tsx` prop rename `weekId` → `initialWeekId`. Commit: `bef62b1`.

### Schema deviations from spec (no impact, noted for record)
- Spec SQL used `match_date` → actual column is `start_date`
- Spec SQL used `name` → actual column is `team_name`
- Spec SQL used `team_id` → actual FK is `week_team_id`
- `weeks.notes` column does not exist → Week Picker sub-label shows `w.label` instead (graceful degradation)
- `date-fns` not installed → vanilla JS date helpers used (`formatWeekDate`, `formatLastPlayed`)

### Current state
- Last clean checkpoint: CP7B.5
- All changes committed: Yes (bef62b1)
- Pushed to GitHub: **No — requires manual push**
- Migrations applied to Supabase: **No — 006 and 007 both pending**

### Required actions before deploy
1. Apply `006_cp7a.sql` in Supabase SQL Editor
2. Apply `supabase/migrations/007_cp7b.sql` in Supabase SQL Editor
3. `git push origin main`

### Next session starts at
- **CP-8.1** — Auto-remove: Unavailable availability submission removes player from `team_selections` for that week
- Files to touch: `src/pages/AvailabilityForm.tsx`
- Decisions pending: None

### Paste this at the start of next session
"Continuing ARM. CP7-A + CP7-B are both complete and committed (bef62b1). The Selection Board now has: Week Picker sheet (tap week label to switch weeks, all weeks listed, purple checkmark on active), Team Management sheet (rename team, adjust starters count, show/hide team), and Player Overlay with real Last Team / Last Played history from the get_player_last_selections RPC. BEFORE deploying: apply 006_cp7a.sql then 007_cp7b.sql in Supabase SQL Editor, then git push origin main. Next: Phase 8 — auto-remove player from team_selections when they submit Unavailable (logic in AvailabilityForm.tsx)."

---

## Session Summary — Bug Fix Session (BUG-1 + BUG-2) — 2026-03-30

### Issues fixed
- **BUG-1** — Navigation restructure (Spec: Navigation Restructure — Roster / Depth Chart / Weeks, Board via Week)
- **BUG-2** — White background regression (Spec: Restore White Background and System Font Stack Across All Pages)

### Completed checkpoints

**BUG-1: Navigation restructure** — Commit: ea26444
- `Layout.tsx`: Replaced Roster/Board/Weeks tabs with Roster/Depth Chart/Weeks. `/board` path now activates the Weeks tab (board belongs to a specific week, not its own tab).
- `App.tsx`: Added `/depth` route for DepthChart.tsx. Kept `/depth-chart` as a legacy redirect.
- `Board.tsx`: Added `useSearchParams` to read the `?week=` query param on mount. If present, passes it as `initialWeekId`; otherwise falls back to auto-selecting most recent open week. Existing week dropdown switcher inside SelectionBoard unaffected.
- `Weeks.tsx`: Restructured from dropdown-switcher + single selected week to list of all open weeks as full detail cards, each with an "Open Board →" button (navigates to `/board?week=<id>`). Archive section below shows all closed weeks (read-only, no tap action, "Closed" badge visible). Dropdown and selectedWeekId state removed.

**BUG-2: White background + font fix** — Same commit (ea26444) — Layout.tsx touched once for both
- `Layout.tsx`: Root div `background: '#000'` → `background: '#F8F8F8'` and `color: '#fff'` → `color: '#111827'`. Page content area now white across all tabs. Nav bar retains dark styling (`#0a0a0a`).
- `index.css`: Already correct — body had correct font stack and background token. No changes needed.
- `SelectionBoard.tsx`: Dark backgrounds inside the component are intentional (board design). No changes needed.

### Current state
- Last clean checkpoint: BUG-1 + BUG-2 (ea26444)
- All changes committed: Yes (ea26444)
- Pushed to GitHub: **No — requires manual push**
- Migrations applied to Supabase: **No — 006 and 007 both still pending**

### Required actions before deploy
1. Apply `006_cp7a.sql` in Supabase SQL Editor
2. Apply `supabase/migrations/007_cp7b.sql` in Supabase SQL Editor
3. `git push origin main`

### Next session starts at
- **CP-8.1** — Auto-remove: Unavailable availability submission removes player from `team_selections` for that week
- Files to touch: `src/pages/AvailabilityForm.tsx`
- Decisions pending: None

### Paste this at the start of next session
"Continuing ARM. CP7-A + CP7-B + BUG-1 + BUG-2 are all committed (ea26444). Nav is now 3 tabs: Roster / Depth Chart / Weeks. Board tab removed from nav — each week card has an 'Open Board' button that navigates to /board?week=<id>. Board reads the ?week= query param on load. White background regression fixed — all pages now render on white background. Archive section visible in Weeks tab for closed weeks. BEFORE deploying: apply 006_cp7a.sql then 007_cp7b.sql in Supabase SQL Editor, then git push origin main. Next: Phase 8 — auto-remove player from team_selections when they submit Unavailable (logic in AvailabilityForm.tsx)."

---

## Session Summary — Bug Fix Session (BUG-FIX-A + BUG-FIX-B + BUG-FIX-C) — 2026-03-30

### Issues fixed
- **BUG-FIX-A** — iOS Safe Area: Board header obscured on iOS behind status bar / dynamic island
- **BUG-FIX-B** — Availability Note: not rendering in PlayerOverlay (wrong style + missing weekLabel prop)
- **BUG-FIX-C** — Pool filter + Pool tap: pool showed no-response/Unavailable players; row tap assigned instead of opening overlay

### Completed checkpoints

**BUG-FIX-A: Board Header iOS Safe Area** — Commit: df5e296
- `SelectionBoard.tsx`: Board header `padding: '10px 16px'` replaced with `paddingTop: 'calc(env(safe-area-inset-top) + 10px)'` + individual sides. On iOS, header content now sits below the status bar / dynamic island. On Android/desktop, `env(safe-area-inset-top)` resolves to `0px` — no visual change.

**BUG-FIX-B: Availability Note in PlayerOverlay** — Same commit (df5e296)
- `PlayerOverlay.tsx`: Added `weekLabel: string | null` prop. Section 5 "Selection Note" replaced with amber callout (`background: #FEF9C3`, `border-left: 3px solid #EAB308`), labelled "Availability Note — Week of [label]". Conditional on `selectionNote.trim().length > 0`. Dark `#1a1a1a` style removed.
- `SelectionBoard.tsx`: Passes `weekLabel={activeWeek?.label ?? null}` to PlayerOverlay. Overlay guard changed from `overlayPlayer && activeTeam` to `overlayPlayer` so pool players (not yet on any team) can open the overlay. `onSetCaptain` guards against null `activeTeam`.

**BUG-FIX-C: Pool tap + Pool filter** — Same commit (df5e296)
- `SelectionBoard.tsx` `PoolSheet`: Added `onOpenOverlay` prop. Row `onClick` now calls `onOpenOverlay(p.id)`. The "+" button has `e.stopPropagation()` then `onAssign(p.id)` — tapping it assigns the player without opening the overlay. In the PoolSheet instantiation: `onOpenOverlay={(pid) => { setPoolOpen(false); setOverlayPlayerId(pid) }}`.
- `useSelectionBoard.ts` `unassignedPlayers` useMemo: filter now requires `availability === 'Available' || availability === 'TBC'`. Players with no response or `Unavailable` are excluded. When `activeWeekId` is null, `availabilityMap` is `{}` so the pool is naturally empty. Sort order preserved: Available first, TBC second, alphabetical within each group.

### Current state
- Last clean checkpoint: BUG-FIX-C (df5e296)
- All changes committed: Yes (df5e296)
- Pushed to GitHub: **No — requires manual push**
- Migrations applied to Supabase: **No — 006 and 007 both still pending**

### Required actions before deploy
1. Apply `006_cp7a.sql` in Supabase SQL Editor
2. Apply `supabase/migrations/007_cp7b.sql` in Supabase SQL Editor
3. `git push origin main`

### Next session starts at
- **CP-8.1** — Auto-remove: Unavailable availability submission removes player from `team_selections` for that week
- Files to touch: `src/pages/AvailabilityForm.tsx`
- Decisions pending: None

### Paste this at the start of next session
"Continuing ARM. All bug fixes committed (df5e296): iOS safe area on Board header, availability note amber callout in PlayerOverlay, pool filter now shows only Available/TBC players, pool row tap opens PlayerOverlay ('+' button assigns without overlay). BEFORE deploying: apply 006_cp7a.sql then 007_cp7b.sql in Supabase SQL Editor, then git push origin main. Next: Phase 8 — auto-remove player from team_selections when they submit Unavailable (logic in AvailabilityForm.tsx)."

---

## Session Summary — Bug Fix Session (BUG-FIX-GHOST-ROWS) — 2026-03-31

### Issues fixed
- **BUG-FIX-1** — Global iOS Safe Area (Layout.tsx): confirmed already fully implemented in previous session (df5e296). `paddingTop: env(safe-area-inset-top)` on content wrapper, `paddingBottom: calc(8px + env(safe-area-inset-bottom))` on nav. `viewport-fit=cover` present in index.html. No code changes required.
- **BUG-FIX-GHOST** — Ghost rows not registered as drop targets on Selection Board.

### Completed checkpoints

**BUG-FIX-GHOST: Ghost rows as droppable targets**

Root cause: `GhostRow` was a plain `<div>` with no dnd-kit integration. `SortableContext items` only included filled player IDs. `handleDragEnd` called `playerIds.indexOf(over.id)` which returned -1 for ghost slots → bailed out early → player always appended to end. `player_order` had no concept of sparse slot positions.

Fix — three files changed:

- **`src/lib/supabase.ts`**: `TeamSelection.player_order: string[]` → `(string | null)[]`. Null entries represent empty slots.

- **`src/hooks/useSelectionBoard.ts`**:
  - `SelectionTeam.players: (Player | null)[]` — null at index i means slot i+1 is empty
  - `orderedPlayers` derivation: preserves nulls (previously filtered them out), unknown IDs map to null
  - `reorderTeam` accepts `(string | null)[]`
  - Added `trimTrailingNulls` helper
  - `assignPlayer`: trims trailing nulls before appending so "+" always fills the next contiguous slot after the last filled row
  - `removePlayer`: replaces player ID with null (preserves other slot positions) then trims trailing nulls
  - `unassignedPlayers`: filters null sentinel values before building assignedIds Set

- **`src/components/SelectionBoard.tsx`**:
  - Added `useDroppable` import
  - `GhostRow` → `DroppableGhostRow`: each empty slot registers with `useDroppable({ id: 'slot-N' })`. Visual highlight (purple tint + "Drop here" label) fires when `isOver`. Slot number always visible.
  - `SortableContext items`: filters nulls from `players` before mapping to IDs
  - `handleDragEnd` rewritten: detects `over.id.startsWith('slot-')` for ghost drops → vacates source slot, fills target slot, writes sparse `player_order`. Falls through to compact `arrayMove` reorder for filled-to-filled drops (existing behaviour preserved per AC #5).
  - `draggingSlot` + `overlaySlot`: null-safe `findIndex(p => p !== null && p.id === ...)`

Acceptance criteria verified by code review:
1. ✓ Drag from slot N → ghost slot M (M > N): player at M, slots N+1–M-1 ghost
2. ✓ Drag from slot N → ghost slot M (M < N): player at M, slots M+1–N-1 ghost
3. ✓ Ghost row slot number always legible (rendered unconditionally)
4. ✓ `player_order` written correctly → persists on reload
5. ✓ Filled-to-filled reorder unchanged (compact arrayMove path)
6. ✓ "+" button appends at next contiguous slot (trimTrailingNulls)

### Current state
- Last clean checkpoint: BUG-FIX-GHOST + TS type fix
- All changes committed: Yes — 55686d4 (ghost rows) + 0ec8bad (type fix)
- Pushed to GitHub: ✅ Yes
- Migrations applied to Supabase: ✅ 001–007 all applied
- Vercel build: ✅ Clean — app live at https://arm-app-black.vercel.app

### Next session starts at
- **CP-8.1** — Auto-remove: Unavailable submission removes player from `team_selections` for that week
- Files to touch: `src/pages/AvailabilityForm.tsx`
- Decisions pending: None

### Paste this at the start of next session
"Continuing ARM. Ghost rows bug fixed and deployed (0ec8bad): empty position slots on the Selection Board are now registered dnd-kit drop targets. Dragging a player onto any ghost row places them at the exact slot number; sparse player_order persisted to Supabase and survives reload. Migrations 001–007 all applied. App live at https://arm-app-black.vercel.app. Next: Phase 8 CP-8.1 — auto-remove player from team_selections when they submit Unavailable (logic in AvailabilityForm.tsx)."
