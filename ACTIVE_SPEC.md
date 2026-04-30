# ACTIVE_SPEC: Phase 20.1.3 — Selection Board Drag & Drop / Capacity Fixes

## 📋 Metadata
- **Status**: ACTIVE
- **Priority**: High (User Testing Bugfix)
- **Phase**: 20.1.3
- **Estimated Effort**: 30-45 minutes
- **Dependencies**: None (standalone bugfixes)
- **Related Specs**: 16.3.1 (Selection Board Save Patch), 16.7 (Selection Board Order)
- **Target Users**: All PWA users, coaches selecting teams

---

## 🎯 Why This Matters

User testing revealed two critical bugs on the Selection Board:

1. **Drag & Drop Sliding**: Dragging a player onto a filled slot triggers `arrayMove` reordering, causing unwanted array shifting. The user expects drops to only work on empty "Drop here" slots — any other drop should cancel and snap back.

2. **Hidden Overflow Players**: Clicking "+" in the Add Player pool blindly appends to `player_order` via `trimTrailingNulls().concat(playerId)`. If the array exceeds `default_squad_size` (e.g., 22), players are saved to the database at index 25+ but are invisible on the board UI (which strictly renders only `default_squad_size` slots).

---

## 📁 Files to Modify

### File 1: `src/components/SelectionBoard.tsx`

#### Change: `handleDragEnd` — Neutralize the filled-slot reorder (line 792)

**Current behavior (lines 792-803):**
```typescript
} else {
  // ── Drop onto another filled player row (normal reorder) ─────────────
  const filledIds = players
    .filter((p): p is Player => p !== null)
    .map(p => p.id)
  const oldIndex = filledIds.indexOf(activeId)
  const newIndex = filledIds.indexOf(overId)
  if (oldIndex === -1 || newIndex === -1) return

  reorderTeam(weekTeam.id, arrayMove(filledIds, oldIndex, newIndex))
}
```

**Target behavior:** Replace the entire `else` block with a simple `return;`. If `overId` does not start with `slot-` (i.e., the user dragged a player onto another filled player), do nothing — the drag overlay will cancel and snap back.

```typescript
} else {
  // Drop onto a filled slot — cancelled. Player snaps back.
  return
}
```

**Important:** The `if (overId.startsWith('slot-'))` block (lines 772-790) must remain **exactly as-is**. That logic handles dropping onto empty ghost slots and works correctly.

---

### File 2: `src/hooks/useSelectionBoard.ts`

#### Change: `assignPlayer` — Add capacity-aware logic (lines 371-425)

**Current behavior:** Blindly appends via `trimTrailingNulls(s.player_order ?? []).concat(playerId)` — no squad size check.

**Target behavior:** Rewrite the array manipulation logic inside `assignPlayer` to respect `clubSettings?.default_squad_size ?? 22`.

**New logic flow:**

1. **Retrieve** the target team's current `player_order` and the `squadSize` (from `clubSettings?.default_squad_size ?? 22`).
2. **Trim trailing nulls** from the current order.
3. **Capacity Check 1 (Append):** If trimmed length `< squadSize`, simply append `playerId` to the end.
4. **Capacity Check 2 (Backfill):** If trimmed length `>= squadSize`, search the array from index `0` to `squadSize - 1` for the first `null` (empty gap). If found, insert `playerId` at that index.
5. **Capacity Check 3 (Full):** If trimmed length `>= squadSize` AND no null gaps exist, the team is completely full. Abort: call `flashError()`, set `error` state to "Team is full (maximum squad size reached)", and `return` before modifying `selections`.

**Exact code to replace the `assignPlayer` function body (lines 371-425):**

```typescript
const assignPlayer = useCallback(async (teamId: string, playerId: string) => {
  if (!activeWeekId) return

  const squadSize = clubSettings?.default_squad_size ?? 22
  const prevSelections = [...selections]
  const existing = findPlayerTeam(playerId)

  // ── Step 1: Remove player from any existing team ──────────────────────
  let newSelections = selections.map(s => {
    if (existing && s.week_team_id === existing.teamId) {
      return { ...s, player_order: s.player_order.filter(id => id !== playerId) }
    }
    return s
  })

  const targetSel = newSelections.find(s => s.week_team_id === teamId)
  if (!targetSel) {
    // No selection exists yet — create one with just this player
    newSelections = [
      ...newSelections,
      {
        id:            `optimistic-${teamId}`,
        week_id:       activeWeekId,
        week_team_id:  teamId,
        player_order:  [playerId],
        captain_id:    null,
        saved_at:      new Date().toISOString(),
        created_at:    new Date().toISOString(),
        updated_at:    new Date().toISOString(),
      } as TeamSelection,
    ]
  } else {
    const currentOrder = targetSel.player_order ?? []
    const trimmed = trimTrailingNulls(currentOrder)

    // ── Capacity Check 1: Append if room ──────────────────────────────
    if (trimmed.length < squadSize) {
      newSelections = newSelections.map(s =>
        s.week_team_id === teamId
          ? { ...s, player_order: [...trimmed, playerId] }
          : s
      )
    } else {
      // ── Capacity Check 2: Backfill null gaps ────────────────────────
      const gapIndex = currentOrder.slice(0, squadSize).indexOf(null)
      if (gapIndex !== -1) {
        const newOrder = [...currentOrder]
        newOrder[gapIndex] = playerId
        newSelections = newSelections.map(s =>
          s.week_team_id === teamId
            ? { ...s, player_order: newOrder }
            : s
        )
      } else {
        // ── Capacity Check 3: Team is completely full ─────────────────
        flashError()
        setError('Team is full (maximum squad size reached)')
        return
      }
    }
  }

  setSelections(newSelections)

  try {
    if (existing) {
      const updatedOrder = existing.order.filter(id => id !== playerId)
      await upsertSelection(existing.teamId, { player_order: updatedOrder })
    }
    const currentOrder = newSelections.find(s => s.week_team_id === teamId)?.player_order ?? [playerId]
    await upsertSelection(teamId, { player_order: currentOrder })
    flashSaved()
  } catch (err) {
    console.error('assignPlayer error:', err)
    setSelections(prevSelections)
    flashError()
    setError('Save failed')
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeWeekId, selections, allPlayers, clubSettings])
```

**Note:** `clubSettings` must be added to the dependency array of the `useCallback` (last line: `[activeWeekId, selections, allPlayers, clubSettings]`).

---

## ✅ Acceptance Criteria

- [ ] Dragging a player onto another filled player slot does nothing (the dragged player snaps back to its original position)
- [ ] Dragging a player onto an empty "Drop here" (`DroppableGhostRow`) slot successfully moves them to that exact slot
- [ ] Clicking "+" in the Add Player pool adds players sequentially until `default_squad_size` is reached
- [ ] If the team is full but Slot 3 is empty (e.g., a player was removed), clicking "+" adds the player specifically to Slot 3 (backfill)
- [ ] If the team has 0 empty slots up to `default_squad_size`, clicking "+" fails gracefully with an error toast ("Team is full (maximum squad size reached)"), and the player remains in the Unassigned pool

---

## 🚀 Implementation Order

1. **`src/components/SelectionBoard.tsx`**: Replace the `else` block in `handleDragEnd` (line 792) with `return;`
2. **`src/hooks/useSelectionBoard.ts`**: Rewrite `assignPlayer` with the three-step capacity check logic
3. **`src/hooks/useSelectionBoard.ts`**: Add `clubSettings` to the `useCallback` dependency array
4. **Manual test**: Verify drag-to-filled-slot snaps back
5. **Manual test**: Verify drag-to-empty-slot works
6. **Manual test**: Verify "+" adds sequentially up to capacity
7. **Manual test**: Verify "+" backfills gaps when team is at capacity
8. **Manual test**: Verify "+" shows error toast when team is completely full

---

## ⚠️ Risks & Mitigations

### Risk 1: Cross-team drag via `movePlayer`
- `movePlayer` delegates to `assignPlayer`, so the capacity fix automatically applies to cross-team moves too. No additional changes needed.

### Risk 2: `clubSettings` could be null during initial load
- The fallback `?? 22` handles this safely. If `clubSettings` hasn't loaded yet, the squad size defaults to 22, which matches the board UI's default.

### Risk 3: The `else { return }` in `handleDragEnd` could break future reorder features
- If a "swap" or "reorder" feature is desired later, this is the exact location where that logic would be re-introduced. The spec explicitly removes it per user testing feedback.

### Risk 4: `clubSettings` added to dependency array could cause unnecessary re-renders
- `clubSettings` is fetched once and memoized by `useClubSettings`, so this is safe. The `assignPlayer` callback will only be recreated if club settings actually change.

---

*Spec created: 2026-04-30*
*Target: Selection Board drag-and-drop only accepts empty slots; "+" button respects squad capacity with backfill and overflow protection*
