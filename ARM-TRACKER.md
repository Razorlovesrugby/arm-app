# ARM — Build Tracker
**Last updated: 2026-04-29 20:26**
**Current position: Phase 19.2 implemented (Availability Form Profile Update Phone & Birthday). All of Phase 19 (19.0, 19.0.1, 19.1, 19.2) now complete.**

---

## How to use this file

- **Tech Lead updates this file** after each phase completion (Rule 5).
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
| 11 | Archive — Closed Weeks sub-tab, inline Game Notes, Player History Search sub-tab | ✅ Done |
| 12 | Polish — empty states, error banners, Saved feedback, 44px touch audit, Lighthouse 90+ | ⏳ Pending |
| 14 | Native App Shell Layout Refactor — fixed viewport, scroll containers, sticky headers | ✅ Done |
| 14.2 | Depth Chart UX, Selection Board Light Mode & Bulk Add — vertical layout, light mode colors, bulk add, text wrapping | ✅ Done |
| 14.3 | Match Event UX, Kicking Stats & Career Percentage — conversion/penalty miss types, career kicking % | ✅ Done |
| 14.4 | Club Settings Expansion & Critical Bug Fixes — default_squad_size, require_positions_in_form, scroll fix | ✅ Done |
| 14.5 | Export UX, Career Stats & Lightweight Polish — WhatsApp export, toast notifications, enhanced empty states | ✅ Done |
| 15.1 | Attendance Metric — training_attendance table, availability dashboard, training schedule builder | ✅ Done |
| 15.2 | Availability Form Data Collection Mode — require_contact_info, require_birthday, player profile updates | ✅ Done |
| 16.0 | Multi-Tenant Database Architecture & Data Backfill — clubs/profiles tables, RLS policies, data migration | ✅ Done |
| 16.1 | Database Expansion & Safe Backfill — NOT NULL constraints, service role bypass, zero frontend impact | ✅ Done |
| 16.2 | Multi-Tenant Frontend Sweep — all hooks updated with activeClubId filtering, AuthContext polishing | ✅ Done |
| 16.3 | Database Lockdown, Resilience & Edge Case Sweep — ErrorBoundary, Auth Airlock, multi-tab sync | ✅ Done |
| 16.3.1 | Selection Board Save Patch — club_id injection fix for selection board mutations | ✅ Done |
| 16.4 | Exhaustive Mutation Sweep & Club Settings Upsert Fix — audit of all Supabase mutations, upsert pattern | ✅ Done |
| 16.5 | iOS Splash Screens & PWA Icon Standardisation — 8 device-specific splash screens, generate-icons script | ✅ Done |
| 16.6 | Safari iPad Date Selection Fix — YYYY-MM-DD text input replacement, format validation | ✅ Done |
| 16.7 | Selection Board Order — player_order sparse array optimization, droppable ghost rows | ✅ Done |
| 16.8 | RDO Settings & Data Governance Foundation — rdo_facilities table, settings UI, data governance | ⏳ Pending |
| 17.1 | RDO Data Layer & RLS Expansion — rdo_club_access table, profiles.role column, expanded RLS policies | ✅ Done |
| 17.2 | RDO Command Center UX & Launchpad — RDOLayout, RDODashboard, switchTenant, God Mode banner | ✅ Done |
| 17.3 | God Mode Hydration & Data Safety — hard remount, switching state, hook hardening, race condition protection | ✅ Done |
| 17.4 | RDO Command Center & Team Readiness Matrix — useRDOReadiness hook, Weekly Readiness Matrix, aggregated metrics | ✅ Done |
| 17.5 | RFC Player Pool & Master Grids — get_rfc_player_pool RPC, master grid with filters, read-only player panel | ⏳ Pending |
| 18.0 | Touch Zoom & Movement Lockdown — Viewport meta tag, touch-action CSS, iOS auto-zoom prevention | ✅ Done |
| 18.1 | Form Layer Sheet Sideways Movement Lockdown — touch-action: pan-y on PlayerFormSheet | ✅ Done |
| 19.0 | Player Merge & Public Form Duplicate Cleanup — MergePlayerModal, migration 034, duplicate cleanup | ✅ Done |
| 19.0.1 | Supabase Array Operator Bug Fix — Defensive Array.isArray() guards for .in() calls across 6 files | ✅ Done |
| 19.1 | Hard Reset, Refresh Navigation & Caching Fix — Remove offline fallback, Vercel anti-caching headers, auth bypass | ✅ Done |
| 19.2 | Availability Form Profile Update Phone & Birthday — Phone sync on existing player matches, conditional birthday overwrite guard | ✅ Done |
| 19.3 | Export Functions Include Player Caps — total_caps and captain badge in WhatsApp text and PDF exports | ✅ Done |
| 20.0 | Remove CloseWeek, Archive & Migrate GameNotes — [scope TBD] | ⏳ Pending |
| 20.1 | Logo & Theme Color Overhaul — Brand color palette defined in tailwind.config.js | ✅ Done |
| 20.1.1 | Full Purple-to-Blue Color Migration — 17 files migrated from purple (#6B21A8) to blue (#0062F4) brand tokens | ✅ Done |
| 20.1.2 | Sidebar Color Correction — Sidebar bg-brand-dark → bg-brand, nav hover restyled, borders use white/20 | ✅ Done |
| 20.1.3 | Selection Board Bug Fixes — Drag & drop snaps back on filled slots, capacity-aware "+" assign | **▶ Next** |
| 20.1.4 | Customizable Export Caps — [scope defined in spec] | ⏳ Pending |
| 20.1.5 | Selection Indicators — [scope defined in spec] | ⏳ Pending |

---

## Checkpoint Detail (Recent Phases)

### Phase 16.7 ✅ (Selection Board Order)
| CP | Description | Status |
|---|---|---|
| 16.7.1 | player_order sparse array optimization (string\|null)[] | ✅ Done |
| 16.7.2 | DroppableGhostRow with useDroppable per slot | ✅ Done |
| 16.7.3 | handleDragEnd handles slot-N targets for precise positioning | ✅ Done |

### Phase 17.1 ✅ (RDO Data Layer & RLS Expansion)
| CP | Description | Status |
|---|---|---|
| 17.1.1 | Migration 021: profiles.role column with CHECK constraint | ✅ Done |
| 17.1.2 | rdo_club_access bridging table with RLS policies | ✅ Done |
| 17.1.3 | Expanded RLS policies on all 10 core tables with OR logic | ✅ Done |
| 17.1.4 | Composite index on rdo_club_access(user_id, club_id) | ✅ Done |

### Phase 17.2 ✅ (RDO Command Center UX & Launchpad)
| CP | Description | Status |
|---|---|---|
| 17.2.1 | RDOLayout.tsx with sidebar navigation and branding | ✅ Done |
| 17.2.2 | RDODashboard.tsx with ClubCard grid (Launchpad) | ✅ Done |
| 17.2.3 | switchTenant function in AuthContext for club impersonation | ✅ Done |
| 17.2.4 | God Mode banner in Layout.tsx for RDOs impersonating clubs | ✅ Done |
| 17.2.5 | RDO routing logic in App.tsx conditional routing | ✅ Done |

### Phase 17.3 ✅ (God Mode Hydration & Data Safety)
| CP | Description | Status |
|---|---|---|
| 17.3.1 | Hard remount with key={activeClubId} in App.tsx | ✅ Done |
| 17.3.2 | Enhanced switchTenant with switching loading state | ✅ Done |
| 17.3.3 | All 8 custom hooks hardened with ignore flag pattern | ✅ Done |
| 17.3.4 | Race condition protection for all data fetches | ✅ Done |

### Phase 17.4 ✅ (RDO Command Center & Team Readiness Matrix)
| CP | Description | Status |
|---|---|---|
| 17.4.1 | useRDOReadiness hook for aggregated club readiness data | ✅ Done |
| 17.4.2 | Weekly Readiness Matrix data table with columns: Club, Active Roster, Availability %, Selection Status | ✅ Done |
| 17.4.3 | Performance-optimized query without N+1 patterns | ✅ Done |
| 17.4.4 | Visual alerts (traffic lights) for concerning metrics | ✅ Done |
| 17.4.5 | Integration with existing RDODashboard | ✅ Done |

### Phase 17.5 ▶ (RFC Player Pool & Master Grids)
| CP | Description | Status |
|---|---|---|
| 17.5.1 | Migration 022: get_rfc_player_pool() RPC function | ⏳ Pending |
| 17.5.2 | src/hooks/useRFCPlayerPool.ts custom hook | ⏳ Pending |
| 17.5.3 | src/pages/RfcPlayerPool.tsx master grid page | ⏳ Pending |
| 17.5.4 | Filter bar with Team, Type, Status, Position, Availability filters | ⏳ Pending |
| 17.5.5 | Read-only PlayerFormSheet enhancement | ⏳ Pending |
| 17.5.6 | RDOLayout navigation update | ⏳ Pending |

---

## Corrections Queue

> Corrections go here when output needs fixing. Tech Lead picks these up at the start of the next relevant session.
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
- Supabase migrations applied: 001–021
- **Current Git Commit:** d375302cd2f02cd62fbb68af197d05c84a217767
- **Recurring note:** GitHub push blocked by VM network proxy. Run `git push origin main` from terminal or Codespaces after each session.

---

## Quick Navigation

- **Next Immediate Task:** Phase 17.5 — RFC Player Pool & Master Grids
- **Active Spec:** `docs/phase-specs/17.5_RFC_Player_Pool_Master_Grids_ACTIVE_SPEC.md`
- **Recent Completed:** Phase 17.4 — RDO Command Center & Team Readiness Matrix
- **New Spec Created:** Phase 16.8 — RDO Settings & Data Governance Foundation (`docs/phase-specs/16.8_RDO_Settings_Data_Governance_ACTIVE_SPEC.md`)
- **Pending Polish:** Phase 12 (Polish) and Phase 10 (Exports) remain pending but lower priority than RDO features

---

## Developer Notes

- **Phase 17.5 Spec Complete:** Comprehensive ACTIVE_SPEC created with detailed implementation plan
- **Database Impact:** Migration 022 required for RPC function only (no new tables)
- **Frontend Impact:** New page, new hook, component enhancements
- **Security:** RPC uses SECURITY DEFINER with RLS bypass respect from Phase 17.1
- **Performance:** Optimized single-query RPC prevents N+1 frontend fetches

**Ready for Developer execution.** Toggle to Act Mode to begin Phase 17.5 implementation.