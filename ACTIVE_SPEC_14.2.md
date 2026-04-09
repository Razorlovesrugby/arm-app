# ACTIVE_SPEC: Phase 14.2 — Depth Chart UX, Selection Board Light Mode & Bulk Add

## Overview
**Phase:** 14.2 — Polish & Performance  
**Priority:** High  
**Target:** Improve team selection experience with Light Mode conversion, bulk add functionality, and depth chart layout fixes  
**Status:** Ready for Implementation  
**Previous Phase:** 14.1 (Native App Shell Layout)

## 🎯 Why
To vastly improve the team selection experience, the Selection Board must be converted from Dark Mode to Light Mode (matching the app's global theme) while retaining the primary purple buttons. The Add Player sheet must stay open after a selection to allow bulk-adding players. The Depth Chart must stack vertically, and aggressive name truncation must be removed across both screens.

## 🏗️ Architecture Decisions (Locked)
1. **Depth Chart Layout:** Columns stack vertically (`flexDirection: 'column'`) taking `100%` width.
2. **Selection Board Light Mode:** Hardcoded `#000` / `#111` backgrounds and `#fff` text must be replaced with global design tokens.
3. **Design Tokens:** Use Background (`#F8F8F8`), Surface (`#FFFFFF`), Text Primary (`#111827`), Text Secondary (`#6B7280`), Borders (`#E5E7EB`).
4. **Danger Colors:** Replace all temporary reds (`#ef4444`) with global secondary (`#DC2626`).
5. **Bulk Add UX:** The `onAssign` callback will no longer trigger `setPoolOpen(false)`, allowing multiple player selections without closing sheet.
6. **Text Truncation:** Remove `whiteSpace: 'nowrap'` and `textOverflow: 'ellipsis'` from player names so they wrap naturally.

## 📁 Files to Touch (Exact paths + what to do)

### 1. `src/pages/DepthChart.tsx`
- Update main scrollable container to stack vertically
- Replace column container inline styles (`minWidth: '172px'` and `width: '172px'`) with `width: '100%'`
- Update `SortablePlayerChip` name button styles to allow text wrapping

### 2. `src/components/SelectionBoard.tsx`
- Sweep entire file for Light Mode color conversions
- Update `onAssign` callback to remove `setPoolOpen(false)` for bulk add functionality
- Update text wrapping styles for player names
- Replace danger colors (`#ef4444`) with `#DC2626`

## 🎨 UI Implementation (Exact Tailwind/JSX - copy-paste ready)

### 1. `src/pages/DepthChart.tsx` Updates

**Main scrollable container replacement:**
```jsx
// REPLACE the overflowX container (lines 295-315) WITH:
<div style={{
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
}}>
  {columns.map((col) => (
    <Column
      key={col.position}
      col={col}
      onTap={handleTap}
      onReorder={updateOrder}
    />
  ))}
</div>
```

**Column container inline styles update:**
```jsx
// REPLACE `minWidth: '172px'` and `width: '172px'` (lines 151-154) WITH:
width: '100%',
```

**SortablePlayerChip name button styles update:**
```jsx
// REPLACE overflow/textOverflow/whiteSpace (lines 98-101) WITH:
whiteSpace: 'normal',
wordBreak: 'break-word',
```

### 2. `src/components/SelectionBoard.tsx` Updates

**Bulk Add & Truncation - Fix PoolSheet rendering block:**
```jsx
// REPLACE THIS (around line 522):
onAssign={(pid) => { assignPlayer(activeTeam.weekTeam.id, pid); setPoolOpen(false) }}

// WITH THIS:
onAssign={(pid) => { assignPlayer(activeTeam.weekTeam.id, pid); }}
```

**FilledRow player name span update:**
```jsx
// REPLACE overflow/textOverflow/whiteSpace (around line ~135) WITH:
whiteSpace: 'normal', wordBreak: 'break-word'
```

### 3. `src/components/SelectionBoard.tsx` Light Mode Conversions

**Main Wrapper:** `background: '#000'` → `background: '#F8F8F8'`

**Header & Sheets:** `background: '#111'` or `#000` → `background: '#FFFFFF'`

**Text Colors:** `color: '#fff'` → `color: '#111827'`, and `color: 'rgba(255,255,255,0.4)'` → `color: '#6B7280'`

**Borders:** `borderBottom: '1px solid #111'` or `#0f0f0f` → `1px solid #E5E7EB`

**FilledRow:** `background: '#000'` → `background: '#FFFFFF'`

**RemoveButton:**
```jsx
// EXACT STYLES TO USE:
border: pressed ? '1px solid rgba(220,38,38,0.5)' : '1px solid #E5E7EB',
background: pressed ? 'rgba(220,38,38,0.15)' : '#FFFFFF',
color: pressed ? '#DC2626' : '#6B7280',
```

**SaveBadge / Errors:** `color: '#ef4444'` → `color: '#DC2626'`

**Add Players Pill Wrapper gradient:** `linear-gradient(to top, #000 55%, transparent)` → `linear-gradient(to top, #F8F8F8 55%, transparent)`

## ✅ Acceptance Criteria (Checklist format, binary pass/fail)

### Depth Chart
- [ ] Depth Chart positions are stacked vertically and take full width
- [ ] Column containers use `width: '100%'` instead of fixed `172px`
- [ ] Player names wrap naturally with `whiteSpace: 'normal'` and `wordBreak: 'break-word'`
- [ ] Vertical layout maintains proper spacing and visual hierarchy

### Selection Board Light Mode
- [ ] Selection Board is entirely Light Mode (white surfaces, light gray backgrounds, dark text)
- [ ] "Add Players" button remains purple (`#6B21A8`)
- [ ] All hardcoded dark colors replaced with design tokens
- [ ] Bottom gradient fades into Light Mode background (`#F8F8F8`)

### Bulk Add Functionality
- [ ] Tapping the "+" button on an unassigned player adds them to the board BUT leaves the Pool Sheet open
- [ ] User can tap multiple players rapidly without sheet closing
- [ ] `setPoolOpen(false)` removed from `onAssign` callback

### Text Truncation
- [ ] Full player names are visible and wrap naturally in both Depth Chart and Selection Board
- [ ] `whiteSpace: 'nowrap'` and `textOverflow: 'ellipsis'` removed from player name elements
- [ ] Names use `whiteSpace: 'normal'` and `wordBreak: 'break-word'` where needed

### Danger Colors
- [ ] Selection Board 'Remove' buttons (✕) use `#DC2626` when pressed
- [ ] All instances of `#ef4444` replaced with `#DC2626`
- [ ] Error states and save badges use consistent danger color

## ⚠️ Edge Cases (Already Handled)
1. **Bottom Gradient:** Ensure the fade above the fixed "Add Players" button fades into the new Light Mode background (`#F8F8F8`), not black
2. **Drag & Drop:** Light Mode conversion must not break drag-and-drop functionality
3. **Player Overlay:** Ensure PlayerOverlay component remains functional with Light Mode changes
4. **Mobile vs Desktop:** All changes must work on both mobile and desktop layouts
5. **Accessibility:** Maintain sufficient color contrast in Light Mode (text on backgrounds)

## 🚀 Implementation Order (Step-by-Step)

### Step 1: Update `DepthChart.tsx` layout and text wrapping
```bash
# 1. Replace horizontal scroll container with vertical flex column
# 2. Update column width to 100%
# 3. Update player name text wrapping styles
```

### Step 2: Sweep `SelectionBoard.tsx` for Light Mode color conversions
```bash
# 1. Replace all hardcoded dark colors with design tokens
# 2. Update gradients, borders, backgrounds, and text colors
```

### Step 3: Remove `setPoolOpen(false)` from the `onAssign` prop
```bash
# 1. Locate onAssign callback in PoolSheet rendering
# 2. Remove setPoolOpen(false) call
```

### Step 4: Update text wrapping and danger colors in `SelectionBoard.tsx`
```bash
# 1. Update player name text wrapping in FilledRow
# 2. Replace all #ef4444 instances with #DC2626
```

### Step 5: Test all changes
```bash
# 1. Verify Depth Chart vertical layout
# 2. Verify Selection Board Light Mode appearance
# 3. Test bulk add functionality
# 4. Check text wrapping across both components
```

## 📝 Notes for Tech Lead (Not for Developer)
- **Reference Documents:** `/.docs/architecture.md`, `/.docs/ARM-TRACKER.md`, `src/index.css`
- **UX Consistency:** Follow existing design token system from architecture.md
- **Database Impact:** No database changes required - pure frontend UX improvements
- **Session Log Entry:** Update SESSION_LOG.md after completion with "Depth Chart UX & Selection Board Light Mode"

## 🚨 Post-Implementation Documentation (Tech Lead Responsibility)
After Developer completes implementation, Tech Lead MUST:

1. **Update `/.docs/SESSION_LOG.md`** with new entry using exact format
2. **Update `/.docs/ARM-TRACKER.md`** - move task to "Done" section  
3. **Update `/.docs/architecture.md`** with any new UI patterns if established
4. **Update `/.docs/database_schema.md`** - no changes needed
5. **Move this `ACTIVE_SPEC.md` to `/.docs/phase-specs/`** as `14.2_Depth_Chart_UX_Selection_Board_Light_Mode_COMPLETED_SPEC.md`