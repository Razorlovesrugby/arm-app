# ARM — Build Tracker
**Last updated: 2026-03-30**
**Current position: CP7-B complete. Apply migrations 006 + 007 in Supabase, then push to deploy. Next: Phase 8 (auto-remove Unavailable).**

---

## How to use this file

- **Dev updates this file at the end of every session** (Rule 5).
- Status values: `✅ Done` · `▶ Next` · `🔁 Needs Redo` · `⏳ Pending`
- Corrections go in the **Corrections Queue** below — not in the PRD.
- When a Needs Redo item is fixed, move it to Done and clear it from the queue.

---

## Phase Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Supabase schema (6 tables), seed positions, Auth user | ✅ Done |
| 2 | Scaffold — Vite + React + TS + Tailwind + nav shell + PWA | ✅ Done |
| 3 | Roster tab — CRUD, search, filter, CSV export, Archived toggle | ✅ Done |
| 4 | Depth Chart — position columns, drag-to-reorder, detail sheet, persisted order | ✅ Done |
| 5 | Weeks — create week, auto-insert week_teams, UUID token, share link, week dropdown | ✅ Done |
| 6 | v1.8 schema migration + Availability Form (public page, match/auto-create, availability_note) | ✅ Done |
| 7 | Selection Board — tabbed UI, team sheet, unassigned pool, PlayerOverlay | ✅ Done |
| 8 | Auto-remove — Unavailable submission removes player from team_selections | ▶ Next |
| 9 | Close Week — confirmation dialog, set Closed, last_played fields, archive_game_notes insert | ⏳ Pending |
| 10 | Exports — jsPDF PDF + plain text, native OS share sheet | ⏳ Pending |
| 11 | Archive — Closed Weeks sub-tab, inline Game Notes, Player History Search sub-tab | ⏳ Pending |
| 12 | Polish — empty states, error banners, Saved feedback, 44px touch audit, Lighthouse 90+ | ⏳ Pending |

---

## Checkpoint Detail

### Phase 1 ✅
| CP | Description | Status |
|---|---|---|
| 1.1–1.x | Supabase schema: 6 tables, RLS, seed, Auth user | ✅ Done |

**Note:** `players` table includes `email` (TEXT NOT NULL) and `date_of_birth` (DATE NOT NULL) — added Phase 1, accepted by product owner 2026-03-27.

---

### Phase 2 ✅
| CP | Description | Status |
|---|---|---|
| 2.1 | Vite + React + TS + Tailwind scaffold | ✅ Done |
| 2.2 | Design tokens, badge classes, base styles | ✅ Done |
| 2.3 | Nav shell: bottom tab bar (mobile) + sidebar (tablet/desktop) | ✅ Done |
| 2.4 | Auth: AuthContext, ProtectedRoute, Login page | ✅ Done |
| 2.5 | App.tsx routing (all pages + public AvailabilityForm) | ✅ Done |
| 2.6 | PWA: vite-plugin-pwa, manifest.json, offline.html, InstallPrompt | ✅ Done |
| 2.7 | Stub pages created | ✅ Done |
| 2.8 | TypeScript build errors fixed | ✅ Done |
| 2.9 | SESSION_LOG created, git initialised, GitHub push, Vercel deployed | ✅ Done |

---

### Phase 3 ✅
| CP | Description | Status |
|---|---|---|
| 3.1 | usePlayers hook + live player list from Supabase | ✅ Done |
| 3.2 | Search by name, filter by status/type/position | ✅ Done |
| 3.3 | PlayerFormSheet: bottom sheet (mobile) + centred modal (desktop) | ✅ Done |
| 3.4 | Add Player saves to Supabase | ✅ Done |
| 3.5 | Edit Player: tap card, pre-populated form, save via update | ✅ Done |
| 3.6 | DeletePlayerDialog: confirmation, irreversible delete | ✅ Done |
| 3.7 | CSV export from filter panel | ✅ Done |
| 3.8 | Build passing, committed, deployed | ✅ Done |

---

### Phase 4 ✅
| CP | Description | Status |
|---|---|---|
| 4.1 | useDepthChart hook: parallel fetch, 11 PositionColumn objects | ✅ Done |
| 4.2 | DepthChart.tsx: 11 scrollable columns, compact chips, player count badges | ✅ Done |
| 4.3–4.4 | dnd-kit drag-to-reorder within columns, optimistic update + rollback | ✅ Done |
| 4.5 | Tap player → PlayerFormSheet edit mode, refetch after save | ✅ Done |

---

### Phase 5 ✅
| CP | Description | Status |
|---|---|---|
| 5.1 | useWeeks hook: fetch weeks, createWeek, auto-insert 5 week_teams | ✅ Done |
| 5.2 | Weeks tab: week list, status badges, empty state | ✅ Done |
| 5.3 | Create Week form: bottom sheet/modal, date pickers, auto-label | ✅ Done |
| 5.4 | Link panel: Copy Link + Share (native navigator.share) | ✅ Done |
| 5.5 | Week dropdown switcher | ✅ Done |
| 5.6 | Migration 004: submitted_primary_position + submitted_secondary_positions | ✅ Done |

---

### Phase 6 ✅
| CP | Description | Status |
|---|---|---|
| 6.1 | Migration 005: rename note→availability_note, archive_game_notes table, Archived status, TypeScript types, Show Archived toggle | ✅ Done |
| 6.2–6.5 | AvailabilityForm.tsx full implementation: token lookup, form fields, submit logic, auto-create, position sync, success/error states | ✅ Done |

---

### Phase 7 ✅
| CP | Description | Status |
|---|---|---|
| 7.1 | useSelectionBoard hook: parallel fetch, derives unassignedPlayers, optimistic update + rollback | ✅ Done |
| 7.2 | Mobile unassigned list: AssignRow component with team dropdown | ✅ Done |
| 7.3 | Mobile swipe: arrow nav + dot indicator | ✅ Done |
| 7.4 | Mobile drag-to-reorder: MobileTeamView with dnd-kit SortableContext | ✅ Done |
| 7.5 | Desktop multi-column drag-drop: DndContext, useDroppable per column, DragOverlay | ✅ Done |
| 7.6 | PlayerOverlay: Coach Notes (editable) + Availability Note (read-only) | ✅ Done |
| 7.7 | Integration: SelectionBoard + PlayerOverlay wired into Weeks.tsx | ✅ Done |
| 7.8 | **Selection Board redesign:** tabbed UI, numbered position rows, avatar circles, unassigned pool with "+", removed multi-column desktop layout | ✅ Done |

### CP7-A ✅ (Selection Board Core Rebuild — scrap and replace)
| CP | Description | Status |
|---|---|---|
| 7A.0 | supabase.ts: WeekTeam.visible + TeamSelection.captain_id | ✅ Done |
| 7A.1 | New Layout.tsx (3-tab bottom nav) + App.tsx (new routing) + Board.tsx (standalone board page) | ✅ Done |
| 7A.2 | useSelectionBoard.ts: visible filter, captain_id, setCaptain mutation, saveStatus | ✅ Done |
| 7A.3+4 | SelectionBoard.tsx full rebuild: header, team tabs, filled/ghost rows, pool sheet, dnd-kit PointerSensor+TouchSensor+DragOverlay | ✅ Done |
| 7A.5 | PlayerOverlay.tsx: captain toggle, info grid, positions chips, debounced notes auto-save, selection note | ✅ Done |
| 7A.6 | Weeks.tsx stripped of SelectionBoard. Commit: 7fa7426 | ✅ Done |

### CP7-B ✅ (Selection Board Data Layer + Management)
| CP | Description | Status |
|---|---|---|
| 7B.1 | Migration 007: get_player_last_selections RPC (Postgres function) | ✅ Done |
| 7B.2 | useSelectionBoard: activeWeekId internal state, playerHistory RPC, allWeekTeams, saveTeamSettings, players week-agnostic | ✅ Done |
| 7B.3 | PlayerOverlay: lastTeam + lastPlayed wired from playerHistory (replaces — placeholders) | ✅ Done |
| 7B.4 | SelectionBoard: Team Management sheet (rename/starters/visibility), Week Picker sheet (all weeks, checkmark, empty state) | ✅ Done |
| 7B.5 | Board.tsx prop rename + commit bef62b1 | ✅ Done |

**⚠️ Required before deploy:**
1. Apply `006_cp7a.sql` in Supabase SQL Editor (adds week_teams.visible + team_selections.captain_id)
2. Apply `supabase/migrations/007_cp7b.sql` in Supabase SQL Editor (adds get_player_last_selections RPC)
3. `git push origin main`

---

### Phase 8 ▶ NEXT
| CP | Description | Status |
|---|---|---|
| 8.1 | Auto-remove: Unavailable submission removes player from team_selections for that week (app-level in AvailabilityForm.tsx) | ▶ Next |

**Files to touch:** `src/pages/AvailabilityForm.tsx`

---

### Phase 9 ⏳
| CP | Description | Status |
|---|---|---|
| 9.1 | Close Week: confirmation dialog (with empty-team warning variant) | ⏳ Pending |
| 9.2 | On confirm: set week status → Closed, update last_played_date + last_played_team | ⏳ Pending |
| 9.3 | Auto-insert archive_game_notes rows (one per player per team, game_notes = null) | ⏳ Pending |

**Files to touch:** `src/pages/Weeks.tsx`, new close-week logic

---

### Phase 10 ⏳
| CP | Description | Status |
|---|---|---|
| 10.1 | PDF export: jsPDF, one PDF per team, starters + bench numbered list, native OS share sheet | ⏳ Pending |
| 10.2 | Plain text export: formatted team sheet string, native OS share sheet | ⏳ Pending |

---

### Phase 11 ⏳
| CP | Description | Status |
|---|---|---|
| 11.1 | Archive: Closed Weeks sub-tab — reverse chronological, historical team names | ⏳ Pending |
| 11.2 | Inline editable Game Notes per player (saves to archive_game_notes) | ⏳ Pending |
| 11.3 | Player History Search sub-tab: search by player name, results from archive_game_notes | ⏳ Pending |

---

### Phase 12 ⏳
| CP | Description | Status |
|---|---|---|
| 12.1 | Empty states — all screens | ⏳ Pending |
| 12.2 | Error banners + Saved inline feedback | ⏳ Pending |
| 12.3 | Touch target audit (44px minimum) | ⏳ Pending |
| 12.4 | Lighthouse PWA score 90+ | ⏳ Pending |

---

## Corrections Queue

> Corrections go here when output needs fixing. Dev picks these up at the start of the next relevant session.
> Format: `[Phase/CP] — What was wrong — What it should do instead`

| Ref | Issue | Required Fix | Status |
|---|---|---|---|
| BUG-1 | CP7-A nav had Roster/Board/Weeks — Board tab accessible from nav, Depth Chart unreachable | Replace Board tab with Depth Chart; Board accessed via "Open Board" from week card; /board activates Weeks tab | ✅ Done — ea26444 |
| BUG-2 | CP7-A Layout.tsx set background #000 + color #fff on root div — all pages rendered black | Root div → #F8F8F8 background, #111827 text. Nav bar stays dark. | ✅ Done — ea26444 |

---

## Infrastructure Notes

- GitHub: https://github.com/Razorlovesrugby/arm-app.git
- Vercel: https://arm-app-black.vercel.app
- Git identity: raysairaijimckenzie@gmail.com / Razorlovesrugby
- Supabase migrations applied: 001–005
- **Recurring note:** GitHub push blocked by VM network proxy. Run `git push origin main` from terminal or Codespaces after each session.
