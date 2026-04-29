# ACTIVE_SPEC: Phase 19.3 — Export Functions Include Player Caps

## 📋 Metadata
- **Status**: ACTIVE
- **Priority**: Medium (UX Polish)
- **Phase**: 19.3
- **Estimated Effort**: 20 minutes
- **Dependencies**: None
- **Related Specs**: Phase 13 (PDF export), Phase 14.5 (Export UX)
- **Target Users**: Coach / Social Media Manager
- **Implementation Date**: Pending

---

## 🎯 Why

When a coach exports the Team Sheet (WhatsApp text copy or PDF), the output only shows shirt number and name. Coaches and social media managers need to see each player's `total_caps` at a glance — it adds credibility to the squad list and saves them from cross-referencing the player database.

---

## 🏗️ Architecture Decisions (Locked)

1. **Format:** `[Number]. [Name] ([Total Caps])` — e.g., `1. Jonny Wilkinson (91)`
2. **Captain format:** `[Number]. [Name] (C) ([Total Caps])` — e.g., `10. Owen Farrell (C) (112)`
3. **Captain badge `(C)` comes before caps** — matches the existing PDF pattern
4. **`total_caps` already exists on `Player` type** (line 92 of `supabase.ts`) — no DB changes needed
5. **`PDFPlayer` interface needs a new `totalCaps` field** — currently missing
6. **WhatsApp export currently has NO captain indicator** — this spec adds it alongside caps
7. **Empty/unfilled slots** show "Unfilled" with no caps or captain badge
8. **Fallback:** If `total_caps` is null/undefined, show `(0)` — never show `(null)`

---

## 📁 Files to Modify

### File 1: `src/lib/supabase.ts`
**Action:** Add `totalCaps: number` to the `PDFPlayer` interface (line ~322)

### File 2: `src/hooks/useSelectionBoard.ts`
**Action:** In `selectionTeamsToPDF` (line ~80), pass `totalCaps: player.total_caps` when mapping `Player` → `PDFPlayer`

### File 3: `src/components/TeamSheetPDF.tsx`
**Action:** Update `getPlayerDisplayName` to append `(totalCaps)` and update the `<Text>` rendering

### File 4: `src/components/SelectionBoard.tsx`
**Action:** Rewrite `handleWhatsAppExport` (lines 808-840) to include captain `(C)` and `(total_caps)` for all players

---

## 🎨 Implementation — Exact Code Changes

### Change 1: `src/lib/supabase.ts` — Add `totalCaps` to PDFPlayer

**Current (lines 317-323):**
```ts
export interface PDFPlayer {
  id: string
  shirtNumber: number
  fullName: string
  isCaptain: boolean
  position?: string
}
```

**New:**
```ts
export interface PDFPlayer {
  id: string
  shirtNumber: number
  fullName: string
  isCaptain: boolean
  totalCaps: number
  position?: string
}
```

---

### Change 2: `src/hooks/useSelectionBoard.ts` — Pass `total_caps` in PDF mapping

**Current (lines 80-86):**
```ts
return {
  id:          player.id,
  shirtNumber,
  fullName:    player.name,
  isCaptain:   team.captainId === player.id,
  position:    RUGBY_POSITIONS[shirtNumber],
}
```

**New:**
```ts
return {
  id:          player.id,
  shirtNumber,
  fullName:    player.name,
  isCaptain:   team.captainId === player.id,
  totalCaps:   player.total_caps,
  position:    RUGBY_POSITIONS[shirtNumber],
}
```

---

### Change 3: `src/components/TeamSheetPDF.tsx` — Update display name + rendering

**Current `getPlayerDisplayName` (lines 28-31):**
```ts
const getPlayerDisplayName = (player: PDFPlayer | null): string | null => {
  if (!player) return null
  return player.isCaptain ? `${player.fullName} (C)` : player.fullName
}
```

**New:**
```ts
const getPlayerDisplayName = (player: PDFPlayer | null): string | null => {
  if (!player) return null
  const caps = player.totalCaps ?? 0
  const base = player.isCaptain ? `${player.fullName} (C)` : player.fullName
  return `${base} (${caps})`
}
```

**Current `<Text>` rendering (lines 195-200):**
```tsx
{player && displayName ? (
  <>
    <Text style={styles.playerName}>{displayName}</Text>
    {player.position && (
      <Text style={styles.positionLabel}>{player.position}</Text>
    )}
  </>
) : (
  <View style={styles.emptySlot} />
)}
```

**New (no change needed to the JSX structure — `displayName` already includes everything):**
```tsx
{player && displayName ? (
  <>
    <Text style={styles.playerName}>{displayName}</Text>
    {player.position && (
      <Text style={styles.positionLabel}>{player.position}</Text>
    )}
  </>
) : (
  <View style={styles.emptySlot} />
)}
```
*(No JSX change needed — the `getPlayerDisplayName` function handles the formatting)*

---

### Change 4: `src/components/SelectionBoard.tsx` — Rewrite WhatsApp export

**Current (lines 817-821):**
```ts
const text =
  `FIRST XV - SQUAD LIST\nWeek of ${weekLabel}\n\nSTARTERS\n` +
  starters.map((p, i) => `${i + 1}. ${p ? p.name : 'Unfilled'}`).join('\n') +
  `\n\nBENCH\n` +
  bench.map((p, i) => `${startersCount + i + 1}. ${p ? p.name : 'Unfilled'}`).join('\n')
```

**New:**
```ts
const formatPlayerLine = (p: Player | null, slot: number, captainId: string | null): string => {
  if (!p) return `${slot}. Unfilled`
  const captainBadge = captainId === p.id ? ' (C)' : ''
  const caps = p.total_caps ?? 0
  return `${slot}. ${p.name}${captainBadge} (${caps})`
}

const text =
  `FIRST XV - SQUAD LIST\nWeek of ${weekLabel}\n\nSTARTERS\n` +
  starters.map((p, i) => formatPlayerLine(p, i + 1, activeTeam.captainId)).join('\n') +
  `\n\nBENCH\n` +
  bench.map((p, i) => formatPlayerLine(p, startersCount + i + 1, activeTeam.captainId)).join('\n')
```

---

## ✅ Acceptance Criteria

### WhatsApp Export
- [ ] Standard player line format: `1. Jonny Wilkinson (91)`
- [ ] Captain line format: `10. Owen Farrell (C) (112)`
- [ ] Empty slot shows: `16. Unfilled` (no caps)
- [ ] Player with 0 caps shows: `7. Player Name (0)`
- [ ] Header and section labels unchanged

### PDF Export
- [ ] Standard player line: `Jonny Wilkinson (91)`
- [ ] Captain line: `Owen Farrell (C) (112)`
- [ ] Empty slot shows underline (unchanged)
- [ ] Position label still appears on the right (unchanged)

### Code Quality
- [ ] `PDFPlayer` interface includes `totalCaps: number`
- [ ] `selectionTeamsToPDF` passes `total_caps` from Player to PDFPlayer
- [ ] `getPlayerDisplayName` appends `(totalCaps)` for all players
- [ ] No TypeScript errors from `npm run build`
- [ ] No console errors during export

---

## ⚠️ Edge Cases (Already Handled)

1. **Null player (empty slot):** WhatsApp shows "Unfilled" with no caps; PDF shows empty underline — both unchanged
2. **Zero caps:** Shows `(0)` — not `(null)` or blank
3. **Captain + caps:** `(C)` always comes before `(totalCaps)` — matches the natural reading order
4. **No active team:** `handleWhatsAppExport` returns early at line 809 — no crash
5. **`total_caps` undefined on Player:** Fallback `?? 0` ensures it never shows `(undefined)`

---

## 🚀 Implementation Order

### Step 1: Update `PDFPlayer` interface
Edit `src/lib/supabase.ts` — add `totalCaps: number`

### Step 2: Update `selectionTeamsToPDF` mapper
Edit `src/hooks/useSelectionBoard.ts` — pass `totalCaps: player.total_caps`

### Step 3: Update `getPlayerDisplayName` in TeamSheetPDF
Edit `src/components/TeamSheetPDF.tsx` — append `(totalCaps)` to display name

### Step 4: Rewrite WhatsApp export
Edit `src/components/SelectionBoard.tsx` — add `formatPlayerLine` helper + update text builder

### Step 5: Verify
- Run `npm run build` — confirm no TypeScript errors
- Visually confirm both export formats produce correct output

---

## 🔄 Rollback Plan

If issues arise:
1. **Restore from git:** `git checkout -- src/lib/supabase.ts src/hooks/useSelectionBoard.ts src/components/TeamSheetPDF.tsx src/components/SelectionBoard.tsx`
2. No database or migration changes to roll back
