# ARM — Build Tracker
**Last updated: 2026-04-07**
**Current position: Phase 11 Complete. Ready for Phase 12 UI Pivot.**

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
| 8 | Auto-remove — Unavailable submission removes player from team_selections | ✅ Done |
| 9 | Close Week — confirmation dialog, set Closed, last_played fields, archive_game_notes insert | ✅ Done |
| 10 | Exports — jsPDF PDF + plain text, native OS share sheet | ⏳ Pending |
| 11 | v2.0 Architecture Pivot — Schema refactor for concurrent Selection/Results (Archive logic integrated into v2.0 Results view) | ✅ Done |
| 12 | UI Pivot — Sidebar Navigation, Results Mode toggle, Scoring/MVP entry, Player Overlay upgrade | ▶ Next |
| 13 | Exports — jsPDF PDF + plain text, native OS share sheet | ⏳ Pending |
| 14 | Polish & Performance — empty states, error banners, Saved feedback, 44px touch audit, Lighthouse 90+ | ⏳ Pending |

**Note:** Project has pivoted to v2.0 architecture. Phase 10 (Exports) deferred to focus on v2.0 features. Archive functionality is no longer a standalone locked tab; historical data is now accessed via the concurrent 'Results' toggle on the Selection Board.

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

**✅ All deploy prerequisites complete:**
- Migration 006 applied (week_teams.visible + team_selections.captain_id)
- Migration 007 applied (get_player_last_selections RPC)
- Commits 55686d4 + 0ec8bad pushed, Vercel build clean

---

### Phase 8 ✅
| CP | Description | Status |
|---|---|---|
| 8.1 | DB trigger (009_cp8_trigger.sql): AFTER INSERT on availability_responses, availability=Unavailable → replace player UUID with null in player_order for all team_selections for that week. Preserves sparse array structure. | ✅ Done |

### Phase 9 ✅
| CP | Description | Status |
|---|---|---|
| 9.1 | Close Week dialog: danger modal, empty-active-team warning variant. CloseWeekDialog component in Weeks.tsx. | ✅ Done |
| 9.2 | close_week RPC (010_cp8_close_week_rpc.sql): atomic — sets Closed, updates last_played_date + last_played_team. | ✅ Done |
| 9.3 | RPC upserts archive_game_notes with player_name_snapshot, player_type_snapshot, position_snapshot. | ✅ Done |

### Phase 11 ✅ — v2.0 Architecture Pivot
**Note:** Archive functionality is no longer a standalone locked tab; historical data is now accessed via the concurrent 'Results' toggle on the Selection Board.

| CP | Description | Status |
|---|---|---|
| 11.1 | **Legacy (v1.9)** — Archive tab: reverse-chrono closed weeks, pill team tabs (hides is_active=false Bye teams), click-to-expand game notes. | ✅ Done |
| 11.2 | **Legacy (v1.9)** — Game notes: debounced auto-save on textarea change. | ✅ Done |
| 11.3 | **Legacy (v1.9)** — Player History Search: ilike query, sorted by most recent week, search cards with badges + notes preview. | ✅ Done |
| 11.4 | **Legacy (v1.9)** — Deep-link: tap search result → /archive?tab=archive&week=X&team=Y&player=Z. Auto-expands week, selects team tab, scrollIntoView(center). Back button preserves q param. | ✅ Done |
| 11.5 | Migration 011_v2_pivot.sql: club_settings table for dynamic branding | ✅ Done |
| 11.6 | Migration 011_v2_pivot.sql: match_events table for performance tracking | ✅ Done |
| 11.7 | Migration 011_v2_pivot.sql: players.historical_caps, court_fines, is_retired columns | ✅ Done |
| 11.8 | Migration 011_v2.0: week_teams.score_for, score_against, match_report columns | ✅ Done |
| 11.9 | TypeScript interfaces updated (ClubSettings, MatchEvent, Player, WeekTeam) | ✅ Done |
| 11.10 | usePlayers hook enhanced with retired/archived filtering | ✅ Done |
| 11.11 | useWeeks hook enhanced with updateMatchScore/updateMatchReport | ✅ Done |
| 11.12 | useClubSettings hook created for dynamic branding | ✅ Done |
| 11.13 | UI updates: removed hardcoded "Belsize Park RFC" strings | ✅ Done |

---

### Phase 12 ▶ Next — UI Pivot
| CP | Description | Status |
|---|---|---|
| 12.1 | Refactor Layout.tsx to Sidebar Navigation | ▶ Next |
| 12.2 | Implement 'Results Mode' toggle in Board.tsx | ⏳ Pending |
| 12.3 | Integrate Scoring/MVP entry into the Selection Board | ⏳ Pending |
| 12.4 | Update Player Overlay with Caps and Court Fines display | ⏳ Pending |

---

### Phase 13 ⏳ — Exports
| CP | Description | Status |
|---|---|---|
| 13.1 | PDF export: jsPDF, one PDF per team, starters + bench numbered list, native OS share sheet | ⏳ Pending |
| 13.2 | Plain text export: formatted team sheet string, native OS share sheet | ⏳ Pending |

---

### Phase 14 ⏳ — Polish & Performance
| CP | Description | Status |
|---|---|---|
| 14.1 | Empty states — all screens | ⏳ Pending |
| 14.2 | Error banners + Saved inline feedback | ⏳ Pending |
| 14.3 | Touch target audit (44px minimum) | ⏳ Pending |
| 14.4 | Lighthouse PWA score 90+ | ⏳ Pending |

---

## Corrections Queue

> Corrections go here when output needs fixing. Dev picks these up at the start of the next relevant session.
> Format: `[Phase/CP] — What was wrong — What it should do instead`

| Ref | Issue | Required Fix | Status |
|---|---|---|---|
| BUG-1 | CP7-A nav had Roster/Board/Weeks — Board tab accessible from nav, Depth Chart unreachable | Replace Board tab with Depth Chart; Board accessed via "Open Board" from week card; /board activates Weeks tab | ✅ Done — ea26444 |
| BUG-2 | CP7-A Layout.tsx set background #000 + color #fff on root div — all pages rendered black | Root div → #F8F8F8 background, #111827 text. Nav bar stays dark. | ✅ Done — ea26444 |
| BUG-FIX-A | Board header obscured by iOS status bar / dynamic island | paddingTop: env(safe-area-inset-top) applied globally via Layout.tsx | ✅ Done — df5e296 |
| BUG-FIX-B | Availability Note not rendering in PlayerOverlay | Amber callout + weekLabel prop wired | ✅ Done — df5e296 |
| BUG-FIX-C | Pool showed no-response/Unavailable players; row tap assigned instead of opening overlay | Filter to Available/TBC only; tap → overlay, "+" → assign | ✅ Done — df5e296 |
| BUG-FIX-GHOST | Ghost rows not registered as dnd-kit drop targets — players appended to end instead of exact slot | DroppableGhostRow (useDroppable per slot), sparse player_order (string\|null)[], handleDragEnd handles slot-N targets | ✅ Done — 0ec8bad |

---

## Infrastructure Notes

- GitHub: https://github.com/Razorlovesrugby/arm-app.git
- Vercel: https://arm-app-black.vercel.app
- Git identity: raysairaijimckenzie@gmail.com / Razorlovesrugby
- Supabase migrations applied: 001–010 (all migrations complete)
- **Migration 011_v2_pivot.sql** created and ready to apply for ARM 2.0 pivot
- **v2.0 Baseline:** Migration 011 applied. All v1.9 'Close Week' and 'Archive' logic is deprecated.
- **Multi-agent "Agency" workflow activated:** Project transitions from single-agent development to specialized agents for QA, documentation, deployment, and maintenance.