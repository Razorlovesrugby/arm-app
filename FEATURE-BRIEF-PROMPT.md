# ARM — Feature Brief Prompt
**Use this in the PRODUCT project before any complex Dev phase.**
**Paste the block below into PRODUCT, fill in the bracketed fields, then let Claude produce the Feature Brief.**

---

## When to use this

Use this prompt whenever a phase involves:
- Custom UI that isn't a standard form/list (e.g. Selection Board, Archive view)
- Multiple interacting components
- Edge cases that could be missed (empty states, error states, permission states)
- Any phase where you've had to correct Dev output mid-session before

Simpler phases (auto-remove logic, schema migrations, CSV export) don't need a Feature Brief — the PRD + RULES are enough.

---

## The Prompt — Paste this into PRODUCT

```
You are my product thinking partner on ARM, a rugby club team selection app for Belsize Park RFC.

I need you to produce a Feature Brief for the following phase before I hand it to Dev.

**Phase:** [e.g. Phase 9 — Close Week]
**PRD reference:** [e.g. Section 4.6 and 8.5 in ARM-PRD-v1.9.docx]
**What the PRD says:** [paste the relevant PRD section text here]
**Known complexity / things that went wrong before:** [describe anything you're worried about — e.g. "Last time Dev interpreted the layout differently than I imagined"]

Produce a Feature Brief with the following sections. Be specific and visual. Assume Dev will build exactly what you write and nothing more.

---

### 1. Overview (2–3 sentences)
What this phase delivers and why it matters to the coach.

### 2. Component Map
List every UI component involved. For each, state:
- What it is (e.g. "confirmation dialog", "inline editable field")
- Where it appears (which screen/tab/section)
- What triggers it

### 3. Interaction Flows
Write out every user action as a numbered step-by-step flow.
For each action: what the user does → what the system does → what the user sees.
Cover the happy path first, then every edge case and error state.

### 4. Edge Cases & Error States
List every scenario that could go wrong or be ambiguous:
- Empty states (no data, first use)
- Error states (network failure, validation failure)
- Ambiguous states (e.g. closing a week with empty teams)
For each: what the user sees, what the system does.

### 5. Data Operations
For each Supabase operation in this phase:
- Table(s) involved
- Operation type (SELECT / INSERT / UPDATE / UPSERT)
- Exact conditions and constraints
- What happens on success and on failure

### 6. Acceptance Criteria
A numbered checklist. Dev must be able to tick every item before the phase is considered complete.
Write these as testable statements: "When X happens, Y is visible / Y occurs."

### 7. Out of Scope
Anything that could be confused as part of this phase but is NOT. Be specific.
```

---

## Example — How a completed Feature Brief looks (Phase 9: Close Week)

### 1. Overview
Close Week finalises a week after the match has been played. It locks the week as read-only, snapshots each player's last_played data, and auto-creates archive_game_notes rows for every player in every team so coaches can fill in post-match feedback later.

### 2. Component Map
| Component | Where | Trigger |
|---|---|---|
| "Close Week" button | Week detail card, open weeks only | Always visible on open week card |
| Standard confirmation dialog | Overlays current screen | Tapping "Close Week" |
| Empty-team warning dialog | Replaces standard dialog | Tapping "Close Week" when ≥1 team has 0 players |
| Week card status badge | Weeks tab | Updates to "Closed" after confirmation |

### 3. Interaction Flows

**Happy path — all teams have players:**
1. Coach taps "Close Week" on an open week card.
2. System checks: are all teams with players? Yes.
3. Confirmation dialog appears: title "Close this week?", body "This will finalise all selections and update player histories. This cannot be undone.", buttons "Cancel" (secondary) and "Close Week" (danger red).
4. Coach taps "Close Week".
5. System executes (see Section 5). Week card updates status badge to Closed. Close Week button disappears. Week moves to Archive on next Archive tab load.

**Edge case — one or more teams have zero players:**
1. Coach taps "Close Week".
2. System checks: ≥1 team has 0 players.
3. Warning dialog appears: "Team [name] has no players. Close anyway?" with "Cancel" and "Close Anyway" (danger red).
4. If Cancel: dismiss, no action.
5. If Close Anyway: proceed with close as normal (empty teams produce no archive_game_notes rows — nothing to insert for a team with no players).

**Edge case — network failure on confirm:**
1. Coach taps confirm.
2. System attempts Supabase operations. Network error occurs.
3. Error banner slides down from top: "Something went wrong. Please try again." Auto-dismisses after 5 seconds.
4. Week status remains Open. No partial writes committed.

### 4. Edge Cases & Error States
| Scenario | What user sees | What system does |
|---|---|---|
| All teams empty (no players assigned at all) | Warning dialog for each empty team name, grouped | Still closeable — produces zero archive_game_notes rows |
| Week already closed (stale UI) | Refresh shows Closed badge, Close button gone | Read from DB on next load |
| Player deleted between selection and close | archive_game_notes row: player_id = null, player_name_snapshot = name at time of close | Name snapshot is taken at close time from week_teams/team_selections |

### 5. Data Operations
**On confirmation:**
1. UPDATE `weeks` SET `status = 'Closed'` WHERE `id = [week_id]`
2. For each player in each team for this week:
   - UPDATE `players` SET `last_played_date = [week.end_date]`, `last_played_team = [week_team.team_name]` WHERE `id = [player_id]`
3. For each player in each team:
   - INSERT INTO `archive_game_notes` (`week_team_id`, `player_id`, `player_name_snapshot`, `game_notes`) VALUES ([...], [...], [player.name at this moment], null)
   - Use ON CONFLICT DO NOTHING (idempotent in case of retry)

All three operations should be attempted as a logical group. If any fail, show error banner and do not partially commit.

### 6. Acceptance Criteria
1. Tapping "Close Week" on an open week always shows a confirmation dialog before any action occurs.
2. If any team has zero players, the warning dialog appears instead of the standard dialog, naming the empty team(s).
3. On confirm: week status updates to Closed within 2 seconds.
4. On confirm: `last_played_date` and `last_played_team` are correctly set for every player who was in a team.
5. On confirm: one `archive_game_notes` row is created per player per team, with `game_notes = null`.
6. The Close Week button is not visible on closed weeks.
7. On network failure: error banner appears, week remains Open, no partial writes.
8. A closed week appears in the Archive tab in reverse chronological order.

### 7. Out of Scope
- Editing any data after close (except Game Notes — that's Phase 11).
- Exports from closed weeks.
- Re-opening a closed week (not supported in MVP).
- Migrating existing closed weeks — only weeks closed via this UI go through this flow.

---

## Tips for writing a good Feature Brief

- **Be visual.** Describe what the coach sees, not just what the system does.
- **Name edge cases before Dev finds them.** Empty states, network errors, and ambiguous confirmations are where bugs live.
- **Write acceptance criteria as if you're testing it yourself.** "When X happens, Y is visible" — not "the feature works".
- **Say what's out of scope.** Dev will build what's implied as well as what's stated. Cutting scope in the brief saves correction time.
