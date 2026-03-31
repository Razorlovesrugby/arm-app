# ARM — Claude Code Project Knowledge Base

## Session Start Protocol
**Do this at the start of every session before writing any code:**
1. Read `SESSION_LOG.md` — source of truth for build progress
2. Read `ARM-TRACKER.md` — current phase, next CP, pending corrections
3. Read `PRD.md` — locked product decisions (do not deviate without flagging)

If a locked PRD decision conflicts with what's needed, flag it at the start of the session before proceeding.

---

## Project Overview
**ARM** — Availability & Roster Management app for Belsize Park RFC (rugby club).
A mobile-first PWA for a coach to manage player availability, team selection, and match records.

---

## Tech Stack
- **Frontend:** React (Vite) + TypeScript + Tailwind CSS
- **Backend:** Supabase (Postgres + Auth + RLS)
- **Drag & drop:** dnd-kit
- **PWA:** vite-plugin-pwa
- **Deploy:** Vercel (auto-deploy on push to `main`)

---

## Infrastructure
| Service | Detail |
|---|---|
| GitHub | https://github.com/Razorlovesrugby/arm-app.git |
| Vercel live URL | https://arm-app-black.vercel.app |
| Supabase URL | https://dgpplqzsukifcvddoxcd.supabase.co |
| Supabase region | Europe |
| Git identity | raysairaijimckenzie@gmail.com / Razorlovesrugby |

**Known issue:** GitHub push is blocked by VM network proxy in Claude Code sessions.
After every session: run `git push origin main` from your local terminal or GitHub Codespaces to trigger Vercel deploy.

---

## Session Rules
1. Read SESSION_LOG.md + ARM-TRACKER.md + PRD.md before proposing any checkpoints
2. No UX or product decisions — those are locked in PRD.md. Flag conflicts, don't resolve them silently
3. SESSION_LOG.md is the source of truth for where the build is
4. Keep sessions short and technical — this is a build project, not a planning project
5. Ensure the app can deploy after every session (build must pass, commit must be clean)
6. Update SESSION_LOG.md and ARM-TRACKER.md at the end of every session
7. Track token usage — flag if approaching limits mid-session

---

## Current State (as of last session — 2026-03-30)

**Last committed:** `df5e296` (BUG-FIX-A + BUG-FIX-B + BUG-FIX-C)
**Pushed to GitHub:** No — requires manual push
**Supabase migrations applied:** 001–005 only

### ⚠️ Required before deploy
1. Apply `supabase/migrations/006_cp7a.sql` in Supabase SQL Editor (adds `week_teams.visible` + `team_selections.captain_id`)
2. Apply `supabase/migrations/007_cp7b.sql` in Supabase SQL Editor (adds `get_player_last_selections` RPC)
3. Run `git push origin main` from terminal

### What's built
- Auth (Supabase Auth, ProtectedRoute, Login page)
- Nav shell: 3-tab bottom nav (Roster / Depth Chart / Weeks), sidebar on tablet/desktop
- PWA: manifest, offline.html, InstallPrompt
- **Roster tab:** full CRUD, search, filter, CSV export, Archived player toggle
- **Depth Chart tab:** 11 position columns, dnd-kit drag-to-reorder, persisted to Supabase, tap-to-edit
- **Weeks tab:** create week, UUID token, Copy Link + Share buttons, Open Board → button per week, archive section for closed weeks
- **Availability Form** (`/availability/:token`): public page, token lookup, player match/auto-create, position sync, availability_note, success screen, iOS zoom fix
- **Selection Board** (`/board?week=<id>`): tabbed team view, numbered rugby position rows (1–15 + bench), avatar circles with initials + availability dot, dnd-kit drag-to-reorder (TouchSensor + PointerSensor + DragOverlay), unassigned pool with filter chips, PlayerOverlay (captain toggle, coach notes auto-save, last team/last played, availability note callout), Team Management sheet (rename/starters/visibility), Week Picker sheet

### Next checkpoint
**CP-8.1** — Auto-remove: when a player submits Unavailable, remove them from `team_selections` for that week.
**File to touch:** `src/pages/AvailabilityForm.tsx`

### Session start paste (copy into first message)
> "Continuing ARM. All bug fixes committed (df5e296): iOS safe area on Board header, availability note amber callout in PlayerOverlay, pool filter now shows only Available/TBC players, pool row tap opens PlayerOverlay ('+' button assigns without overlay). BEFORE deploying: apply 006_cp7a.sql then 007_cp7b.sql in Supabase SQL Editor, then git push origin main. Next: Phase 8 — auto-remove player from team_selections when they submit Unavailable (logic in AvailabilityForm.tsx)."

---

## Supabase Schema (6 tables)
- `players` — id, name, email, date_of_birth, status, type, primary_position, secondary_positions (JSONB), notes, last_played_date, last_played_team
- `depth_chart_order` — player_id, position, order_index
- `weeks` — id, label, start_date, end_date, status (Open/Closed), token (UUID)
- `week_teams` — id, week_id, team_name, starters_count, visible (bool)
- `availability_responses` — id, week_id, player_id, availability, submitted_primary_position, submitted_secondary_positions (JSONB), availability_note
- `team_selections` — id, week_id, week_team_id, player_id, order_index, captain_id
- `archive_game_notes` — id, week_id, player_id, team_name, game_notes

**Migrations applied to Supabase:** 001–005
**Migrations pending:** 006 (week_teams.visible + team_selections.captain_id), 007 (get_player_last_selections RPC)

---

## Phase Roadmap
| Phase | Scope | Status |
|---|---|---|
| 1–7 | Schema, scaffold, Roster, Depth Chart, Weeks, Availability Form, Selection Board | ✅ Done |
| 8 | Auto-remove Unavailable from team_selections | ▶ Next |
| 9 | Close Week: dialog, set Closed, last_played fields, archive_game_notes insert | ⏳ Pending |
| 10 | Exports: jsPDF PDF + plain text, native OS share sheet | ⏳ Pending |
| 11 | Archive: Closed Weeks sub-tab, inline Game Notes, Player History Search | ⏳ Pending |
| 12 | Polish: empty states, error banners, 44px touch audit, Lighthouse 90+ | ⏳ Pending |
