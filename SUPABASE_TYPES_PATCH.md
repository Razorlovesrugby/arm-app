# CP7A.0 — supabase.ts Type Additions

Open `src/lib/supabase.ts` and add the two fields below.

---

## 1. Add `visible` to the `WeekTeam` interface

Find the `WeekTeam` interface and add `visible: boolean`:

```ts
export interface WeekTeam {
  id: string
  week_id: string
  name: string
  starters_count: number
  visible: boolean          // ← ADD THIS (migration 006)
  created_at: string
}
```

---

## 2. Add `captain_id` to the `TeamSelection` interface

Find the `TeamSelection` interface and add `captain_id: string | null`:

```ts
export interface TeamSelection {
  id: string
  week_id: string
  week_team_id: string
  player_order: string[]
  captain_id: string | null  // ← ADD THIS (migration 006)
  created_at: string
  updated_at: string          // include if already present
}
```

---

## Note — `players.coach_notes` vs `players.notes`

The CP7-A spec refers to `players.coach_notes` in two places.
The locked decision in ARM-RULES.md states the column is `players.notes`.
No schema rename is required — the Coach Notes textarea will read/write `players.notes`
(the existing column). The spec wording is descriptive, not a new column name.
