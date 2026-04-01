
ARM — Rules & Locked Decisions
ARM · Belsize Park RFC · Read at the start of every Dev session Last updated: 2026-03-30

What this file is
This file contains two things Dev must read before writing any code:
All locked decisions — architectural, data, and UX choices that are final. Do not re-litigate these.
Session management rules — how every Dev session must be structured.
The authoritative spec is ARM-PRD-v1.9.docx. This file summarises locked decisions for quick reference; the PRD is the source of truth for full detail.

SECTION A — Locked Decisions
Tech Stack
Layer
Technology
Frontend
React + TypeScript + Vite + Tailwind CSS
Drag & Drop
dnd-kit
Backend
Supabase (PostgreSQL + Auth + Realtime)
PDF Export
jsPDF (client-side)
Hosting
Vercel
Dev Environment
GitHub Codespaces
PWA
vite-plugin-pwa + Workbox

Authentication
Single shared Supabase Auth account. One email/password for all coaches.
No roles, no permissions for MVP.
Data Logic — Locked Rules
Availability responses: No unique constraint on (week_id, player_id). Full history retained. Latest = ORDER BY created_at DESC LIMIT 1.
Auto-remove: If player submits Unavailable and is in a team → silently removed from team_selections for that week. No alert shown to coach.
Auto-create: Unmatched availability submission → auto-create player with primary_position = Unspecified, player_type = Open, status = Active.
Phone normalisation: Strip spaces and dashes on write.
Position sync: Only on Available submissions. TBC, Unavailable, and Not Sure do NOT update the player's profile positions.
Availability form field order: Name → Phone → Availability status → Positions (hidden if Unavailable) → Availability Note.
Duplicate player: Same Full Name (case-insensitive) + same Phone (normalised) = silent replace. No dialog.
Notes Architecture
Two distinct note types. Never mix them.
Coach Notes (players.notes) — long-lived CRM annotations added by coaches. Visible in Roster detail and Selection Board player overlay (editable inline). Roster view shows Coach Notes only.
Availability Note (availability_responses.availability_note) — week-specific, player-submitted note. Visible read-only in Selection Board player overlay for that week only. Never shown on Roster.
Player card compact view shows a Coach Notes dot indicator if Coach Notes exist (not Availability Notes).
Player Status Values
Active | Injured | Unavailable | Retired | Archived
Archived players hidden from default Roster view. "Show Archived" toggle reveals them.
Archiving does not delete historical week or archive_game_notes data.
Archived players still appear in Player History Search results.
Archive
Closed weeks displayed in reverse chronological order.
Archive is read-only except Game Notes fields — coaches can fill in post-match Game Notes per player at any time after a week is closed.
On week close, one archive_game_notes row is auto-inserted per player per team (game_notes = null).
Player History Search: searches player_name_snapshot across archive_game_notes. Works even if player has been deleted from roster.
No export from archive.
Navigation
Mobile: 3 bottom tabs — Players · Weeks · Archive
Tablet/Desktop: Left sidebar
Players has 2 sub-tabs in unified sticky top bar: Roster · Depth Chart
Archive has 2 sub-tabs: Closed Weeks · Player History
Week switcher is a compact dropdown, not tabs.
Selection Board (CP-7.8 Redesign — Final)
Unified tabbed layout: scrollable pill-style team tabs at top, one per team with live player count badge. Same layout across all screen sizes — no separate mobile/desktop layout.
Team sheet: numbered position rows 1–15 (starters) + bench rows. Each row shows shirt-number circle, rugby position label, coloured avatar circle with player initials + availability dot.
Filled rows: name + position label + dnd-kit drag handle (200ms touch delay) + × remove. Tap name = PlayerOverlay.
Empty rows: dashed placeholder, tap scrolls to Unassigned pool.
Unassigned pool: collapsible panel below team sheet. Each player has avatar + name + position + availability badge + purple "+" button to assign.
Close Week
Confirmation dialog required. Irreversible.
On close: last_played_date = end_date, last_played_team snapshotted from week_teams.
archive_game_notes rows auto-inserted for all players in all teams for that week (game_notes = null).
Warning dialog if one or more teams have zero players: "Team [name] has no players. Close anyway?"
Exports
jsPDF, client-side. Triggers native OS share sheet.
Open weeks only. Not available from archive.
Player Detail
Bottom sheet on mobile (~85% screen height), centred modal on tablet/desktop.
Destructive Confirmations
Action
Behaviour
Close Week
Confirmation dialog required
Delete Player
Confirmation dialog required
Remove from team
Silent — no confirmation

PWA
vite-plugin-pwa + Workbox
NetworkFirst for Supabase calls; CacheFirst for static assets
Offline fallback page
Install prompt: Android (beforeinstallprompt banner) + iOS (Share → Add to Home Screen instruction)
Design Tokens
--primary:        #6B21A8
--primary-dark:   #581C87
--primary-light:  #F3E8FF
--surface:        #FFFFFF
--background:     #F8F8F8
--border:         #E5E7EB
--text-primary:   #111827
--text-secondary: #6B7280
--success:        #16A34A
--warning:        #D97706
--danger:         #DC2626
--font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

Badge Colours
Value
Background
Text
Active / Available
#DCFCE7
#15803D
Injured / TBC
#FEF3C7
#B45309
Unavailable
#FEE2E2
#B91C1C
Retired
#F3F4F6
#4B5563
Archived
#F3F4F6
#374151
Performance
#F3E8FF
#6B21A8
Open
#DBEAFE
#1D4ED8
Women's
#FCE7F3
#BE185D

Position Enum
Prop · Hooker · Lock · Flanker · Number 8 · Scrum-half · Fly-half · Centre · Wing · Fullback · Unspecified
Data Model — 7 Tables
See ARM-PRD-v1.9.docx Section 7 for the full schema. Key points:
players has email (text, NOT NULL) and date_of_birth (date, NOT NULL) — added Phase 1.
availability_responses has NO unique constraint on (week_id, player_id).
archive_game_notes uses a partial unique index: UNIQUE(week_team_id, player_id) where player_id is not null.

SECTION B — Session Management Rules
Rule 1 — Confirm starting state before writing any code
State: which phase/checkpoint, what was completed last session, the goal of this session, what the end checkpoint looks like. Do not begin until confirmed.
Rule 2 — Break the phase into named checkpoints
Propose a numbered checkpoint list (CP-X.X format) and wait for approval before starting.
Rule 3 — Announce every checkpoint when reached
✓ CP-X.X complete — [what was done]
Next: CP-X.X — [what comes next]
Safe to commit here.

Do not proceed until I say "continue" or "next".
Rule 4 — Use /compact proactively
Run /compact without being asked:
After every 2 completed checkpoints
Before any checkpoint estimated at 100+ lines of code
If re-reading earlier conversation to recall decisions
Say: "Running /compact now. Continuing from CP-X.X."
Rule 5 — End sessions at clean checkpoints only
When I say stop or context is running low:
Finish the current checkpoint if within ~10 minutes of completion
If not, roll back to last clean checkpoint
Update ARM-TRACKER.md (mark completed checkpoints Done, update Next, add any Needs Redo items)
Append session summary to SESSION_LOG.md
Session summary format:
## Session Summary — Phase X — [date]
### Completed checkpoints
- CP-X.X — [description]
### Current state
- Last clean checkpoint: CP-X.X
- All changes committed: Yes / No
### Next session starts at
- CP-X.X — [exact description]
- Files to touch: [list]
- Decisions pending: [anything unresolved]
### Paste this at the start of next session
"[one paragraph state summary]"

Rule 6 — Commit at every checkpoint
git add .
git commit -m "CP-X.X: [short description]"

Never let more than one checkpoint go uncommitted.
Rule 7 — Flag decisions before making them
Decision needed: [describe]
Option A: [approach + tradeoff]
Option B: [approach + tradeoff]
Recommendation: [option + reason]

Wait for confirmation. Especially important for: shared state, schema changes, any PRD deviation.
Rule 8 — Never change locked decisions silently
If you encounter a reason to change anything in Section A of this file, stop and flag it. Do not work around it.
Rule 12 — Bug fix sessions
Bug fixes are standalone sessions. They are never continuations of the chat that built the phase.
Session prompt structure for bug fixes:
[ARM-RULES.md]
[ARM-TRACKER.md]

Previous session summary:
[paste last session brief here]

This is a bug fix session. Do not proceed to the next phase.

Issue to fix:
[paste the Issue section from the PRODUCT bug fix brief here]

Start with Rule 11 — read the relevant files before proposing anything.

Rules:
Never reopen the DEV chat that built the phase — that context is stale
Never revise the original feature brief — it did its job, this is a correction
Log every issue in the Corrections Queue in ARM-TRACKER.md before starting a fix session
One fix session per issue where possible — don't bundle unrelated fixes
End the session with a commit and an updated Corrections Queue (mark fixed items Done)

Rule 9 — Context warning protocol
When within 20% of context limit:
Say: "Context is running low — wrapping up this checkpoint."
Finish current checkpoint only — nothing more.
Update ARM-TRACKER.md and produce session summary immediately.
Do not start another checkpoint.
Rule 10 — Start of session checklist
Run this out loud before anything else:
[ ] ARM-RULES.md read — locked decisions understood
[ ] ARM-TRACKER.md read — current phase and status confirmed
[ ] SESSION_LOG.md read — previous state understood
[ ] Feature Brief read (if one exists for this phase)
[ ] Codebase orientation complete (Rule 11) — existing files read and summarised
[ ] Checkpoint list proposed and approved
[ ] Ready to begin CP-X.X

Rule 11 — Read the codebase before writing any code
Before proposing checkpoints or writing a single line of code, perform a codebase orientation:
Read every file listed in "Files to touch" for this phase (from ARM-TRACKER.md).
Trace one level of imports from each of those files — read those files too.
Produce a written summary in this format:
Codebase orientation — Phase X

Files to touch:
- [filename]: [what it currently does, what state it's in, key exports/hooks/components]

Connected files (one level of imports):
- [filename]: [what it exports that the touched files depend on]

Shared components / hooks at risk:
- [list anything that is used by both this phase's files AND other already-built features]

Risk flags:
- [any file or pattern that could break existing functionality if modified]

Wait for confirmation before proposing checkpoints.
This rule exists to prevent new features from breaking already-built ones. The depth chart was deleted because the selection board was built without reading what already existed. This must not happen again.
# SECTION C — Brand & UI Consistency Rules
**Read this section whenever building or modifying any UI component.**
**These rules exist to keep ARM looking and behaving consistently across all screens.**

---

## C.1 Typography Scale

Every text role is named and locked. Use exactly these Tailwind classes. Do not invent alternatives.

| Role | Tailwind Classes | Usage |
|---|---|---|
| Page heading | `text-xl font-bold text-gray-900` | Screen titles (e.g. "Players", "Weeks") |
| Section heading | `text-base font-semibold text-gray-900` | Group labels within a screen |
| Player name | `text-sm font-medium text-gray-900` | Player name on all cards and rows |
| Position label | `text-xs font-normal text-gray-500` | Position beneath or beside player name |
| Badge text | `text-xs font-medium` | All status/type/availability badges |
| Body text | `text-sm font-normal text-gray-700` | Notes, descriptions, form helper text |
| Caption | `text-xs font-normal text-gray-500` | Metadata, last played date, timestamps |
| Button label — primary | `text-sm font-semibold text-white` | Primary action buttons |
| Button label — secondary | `text-sm font-medium text-gray-700` | Secondary/cancel buttons |
| Error text | `text-xs font-medium text-red-600` | Inline field errors |
| Link / action text | `text-sm font-medium text-purple-700` | Tappable text actions |

**Never:**
- Use `text-base` or larger for player names or labels
- Use `font-bold` outside of page headings and primary buttons
- Use raw colour values — always use token-mapped Tailwind classes

---

## C.2 Colour Usage Rules

Tokens are defined in Section A. This section defines **when** to use each one.

| Token | Tailwind Equivalent | Use for | Never use for |
|---|---|---|---|
| `--primary` #6B21A8 | `bg-purple-800`, `text-purple-800` | Primary buttons, active tab, active state highlights, "+" assign button, links | Backgrounds, decorative elements |
| `--primary-dark` #581C87 | `bg-purple-900` | Hover/pressed state on primary buttons only | Default state |
| `--primary-light` #F3E8FF | `bg-purple-50` | Selected card backgrounds, active chip fill | Text colour |
| `--background` #F8F8F8 | `bg-gray-50` | Page background only | Cards, modals |
| `--surface` #FFFFFF | `bg-white` | Cards, modals, bottom sheets, form inputs | Page background |
| `--border` #E5E7EB | `border-gray-200` | All card borders, dividers, input borders | Text |
| `--text-primary` #111827 | `text-gray-900` | Player names, headings, primary content | Metadata, captions |
| `--text-secondary` #6B7280 | `text-gray-500` | Labels, captions, inactive tab labels | Headings |
| `--success` #16A34A | `text-green-700`, `bg-green-100` | Available badge, success toasts | General green usage |
| `--warning` #D97706 | `text-amber-600`, `bg-amber-50` | TBC badge, Injured badge | General amber usage |
| `--danger` #DC2626 | `text-red-600`, `bg-red-50` | Unavailable badge, destructive buttons, error states | Warnings |

**Rules:**
- Colour is never the only indicator of state — always pair with a text label or icon
- Purple is reserved for primary actions and active states only — do not use it decoratively
- Page background is always `bg-gray-50`. Cards and modals are always `bg-white`

---

## C.3 Spacing & Layout Rules

These rules define the rhythm that makes every screen feel consistent.

### Page Layout
- Page padding (mobile): `px-4 py-4`
- Page padding (tablet/desktop): `px-6 py-6`
- Bottom clearance on mobile: always add `pb-20` to page content to clear the bottom tab bar
- Maximum content width (desktop): `max-w-2xl mx-auto`

### Cards & Lists
- Gap between player cards in a list: `gap-2` (8px)
- Gap between section groups: `gap-4` (16px)
- Card internal padding: `px-4 py-3`
- Card border radius: `rounded-xl`
- Card border: `border border-gray-200`
- Card background: `bg-white`
- Card shadow: `shadow-sm`

### Forms
- Gap between form fields: `gap-4`
- Label to input gap: `gap-1`
- Field internal padding: `px-3 py-2`
- Field border radius: `rounded-lg`
- Bottom sheet height (mobile): 85% of screen height, scrollable
- Modal max width (tablet/desktop): `max-w-lg` (560px)

### Touch Targets
- Minimum touch target: 44×44px on all interactive elements
- Primary buttons: minimum height `h-12` (48px), full width on mobile
- Availability buttons on submission form: minimum height `h-14` (56px)
- Tab bar height: `h-14` (56px)

### Header
- Top header bar height: `h-14` (56px)
- Header background: `bg-white`
- Header border bottom: `border-b border-gray-200`
- Sub-tab switcher (Roster/Depth Chart): pill-style, sits directly below header, `bg-gray-100` track, `bg-white` active pill

---

## C.4 Component Canon

These are the 8 components that appear across every phase. Read the canonical description before building anything that resembles one of these. Reuse — do not rebuild.

---

### C.4.1 Player Card (Compact)
Appears on: Roster tab, Depth Chart, Selection Board unassigned pool.

```
[Avatar circle] [Player name]          [Status badge]
                [Position label]       [Type badge]
```

- Height: `h-14` (56px), full-width tap target
- Avatar: `w-9 h-9 rounded-full` coloured circle, player initials in `text-sm font-semibold text-white`
- Avatar colour: derived from player type (Performance = purple, Open = blue, Women's = pink)
- Name: `text-sm font-medium text-gray-900`
- Position: `text-xs text-gray-500`
- Badges: right-aligned, see C.4.3
- Coach Notes indicator: small filled dot `w-2 h-2 rounded-full bg-purple-600`, shown only if Coach Notes exist
- Card: `bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm`

**Never:** Add hover backgrounds on mobile. Never show Availability Note on compact card.

---

### C.4.2 Avatar Circle
Appears on: Player cards, team sheet rows, unassigned pool.

- Size (standard): `w-9 h-9 rounded-full`
- Size (team sheet): `w-8 h-8 rounded-full`
- Background: derived from player type token
- Text: player initials, `text-sm font-semibold text-white`
- Availability dot: `w-2.5 h-2.5 rounded-full` positioned `absolute bottom-0 right-0`, coloured by availability status

**Never:** Use a placeholder image or icon instead of initials in MVP.

---

### C.4.3 Badge
Appears on: Player cards, availability responses, team sheet rows.

- Base classes: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium`
- Colours: always from the badge colour table in Section A
- Never use a badge colour outside the defined set
- Never use badge for non-status information (e.g. shirt numbers)

| Badge | Background | Text |
|---|---|---|
| Active / Available | `bg-green-100` | `text-green-700` |
| Injured / TBC | `bg-amber-50` | `text-amber-600` |
| Unavailable | `bg-red-50` | `text-red-600` |
| Retired | `bg-gray-100` | `text-gray-600` |
| Archived | `bg-gray-100` | `text-gray-700` |
| Performance | `bg-purple-50` | `text-purple-800` |
| Open | `bg-blue-100` | `text-blue-700` |
| Women's | `bg-pink-100` | `text-pink-700` |

---

### C.4.4 Primary Button
Appears on: All primary actions (Save Player, Submit Availability, Close Week confirm).

- Classes: `w-full h-12 bg-purple-800 hover:bg-purple-900 text-white text-sm font-semibold rounded-xl`
- Disabled state: `bg-purple-200 text-white cursor-not-allowed`
- Loading state: spinner replaces label, button remains disabled
- Mobile: always full width
- Desktop: `w-auto px-6` minimum

**Never:** Use primary button for cancel, secondary, or destructive actions.

---

### C.4.5 Destructive Button
Appears on: Delete Player, Close Week confirm, Close Anyway.

- Classes: `w-full h-12 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl`
- Always preceded by a confirmation dialog — never fire a destructive action directly

---

### C.4.6 Bottom Sheet (Mobile) / Centred Modal (Tablet/Desktop)
Appears on: Add Player, Edit Player, player detail overlay, confirmation dialogs.

**Mobile (bottom sheet):**
- Slides up from bottom of screen
- Height: 85% of screen height, scrollable content area
- Background: `bg-white rounded-t-2xl`
- Drag handle: `w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-4`
- Dismiss: swipe down or tap X button
- Dark backdrop: `bg-black/50`

**Tablet/Desktop (centred modal):**
- Centred on screen with dark backdrop
- Max width: `max-w-lg` (560px)
- Background: `bg-white rounded-2xl`
- Dismiss: tap backdrop or X button

**Footer actions (both):**
- Sticky footer inside the sheet/modal: `border-t border-gray-200 px-4 py-4`
- Cancel (left or secondary): `text-sm font-medium text-gray-700`
- Primary action (right): primary or destructive button

**Never:** Stack more than 2 action buttons in the footer. Never put a destructive button as the default/right action without a preceding confirmation.

---

### C.4.7 Confirmation Dialog
Appears on: Close Week, Delete Player.

- Always a centred modal overlay regardless of screen size
- Dark backdrop: `bg-black/50`
- Card: `bg-white rounded-2xl p-6 max-w-sm mx-4`
- Title: `text-base font-semibold text-gray-900`
- Body: `text-sm text-gray-500 mt-2`
- Button row: Cancel (secondary, left) + Confirm (destructive, right), `mt-6 flex gap-3`
- Minimum button height: `h-11`

**Never:** Proceed with a destructive action without this dialog. Never auto-dismiss a confirmation dialog.

---

### C.4.8 Empty State
Appears on: Roster (no players), Depth Chart (no players), Selection Board (no responses), Archive (no closed weeks).

- Layout: `flex flex-col items-center justify-center py-16 px-4 text-center`
- Icon: `w-12 h-12 text-gray-300 mb-4` (appropriate outline icon)
- Heading: `text-sm font-medium text-gray-900 mb-1`
- Body: `text-sm text-gray-500`
- CTA button (where applicable): primary button, `mt-6 w-auto px-6`

**Never:** Show an empty state while data is still loading. Use a loading skeleton or spinner instead.

---

## C.5 Screen Anatomy Rules

Every screen in ARM must follow this structure. This is what prevents screens from feeling different from each other.

### Every screen must have:
1. **Top header bar** — `h-14 bg-white border-b border-gray-200` — contains screen title and any top-right action (e.g. + Add Player)
2. **Page background** — always `bg-gray-50`
3. **Bottom tab bar clearance** — always `pb-20` on mobile so content isn't hidden behind the tab bar
4. **Consistent page padding** — `px-4` on mobile, `px-6` on tablet/desktop

### Players section:
- Sub-tab switcher (Roster / Depth Chart) sits directly below the header, full width, sticky
- Sub-tab switcher background: `bg-gray-100`, active pill: `bg-white shadow-sm rounded-lg`

### Weeks section:
- Week dropdown switcher at top of content area, below header
- Dropdown: `bg-white border border-gray-200 rounded-xl px-4 py-3`

### Selection Board:
- Team tabs: scrollable pill row below header, `bg-gray-50` track
- Active team tab: `bg-purple-800 text-white rounded-full px-4 py-1.5`
- Inactive team tab: `bg-white border border-gray-200 text-gray-700 rounded-full px-4 py-1.5`
- Live player count badge on each tab: `text-xs bg-white/20 text-white rounded-full px-1.5` (active) / `bg-gray-100 text-gray-600` (inactive)

### Archive:
- Sub-tab switcher (Closed Weeks / Player History) — same pattern as Players sub-tabs
- Closed weeks in reverse chronological order — newest first, always

### Availability Form (public, no auth):
- No navigation chrome — no tab bar, no sidebar
- White background throughout
- ARM wordmark top-left in `text-purple-800 font-bold`, "Belsize Park RFC" directly below in `text-xs text-gray-500`
- Thin `border-b border-purple-100` below the wordmark bar
- Single column layout, never horizontal scroll

---

## C.6 What to Check Before Marking a Checkpoint Done

Before calling any UI checkpoint complete, verify:

- [ ] All text roles match C.1 exactly — no ad-hoc sizing
- [ ] All colours come from C.2 — no raw hex values in JSX
- [ ] Page padding and bottom clearance applied per C.3
- [ ] Any new card/button/badge matches the canonical component in C.4 — nothing rebuilt from scratch
- [ ] Screen has correct header, background, and padding per C.5
- [ ] All touch targets are minimum 44px
- [ ] Colour is never the only state indicator — text label or icon always paired


