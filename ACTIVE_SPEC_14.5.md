# ACTIVE SPEC: Phase 14.5 — Export UX, Career Stats & Lightweight Polish

## Overview
**Phase:** 14.5 — Polish & Performance  
**Priority:** High  
**Target:** Close out Phase 14 by realigning Kicking % to career Roster view, fixing PDF export to respect custom squad sizes, adding clean WhatsApp text export, and introducing fast, lightweight UX polish (Roster empty state CTA & copy toast).  
**Status:** Ready for Implementation  
**Previous Phase:** 14.4 (Club Settings Expansion & Critical Bug Fixes)

## 🎯 Why (1‑2 sentences)
To close out Phase 14 by realigning the Kicking % to the career Roster view, fixing the PDF export to respect custom squad sizes, adding a clean WhatsApp text export, and introducing fast, lightweight UX polish (Roster empty state CTA & copy toast).

## 🏗️ Architecture Decisions (Locked)
1. **Career Stats:** Kicking % logic is removed from `PlayerOverlay.tsx` and moved entirely to `PlayerFormSheet.tsx` (Roster).
2. **PDF Fix:** The PDF logic (`SelectionBoard.tsx`) must dynamically read `clubSettings?.default_squad_size ?? 23` to generate the correct number of rows.
3. **WhatsApp Export:** A new copy button will generate a clipboard string formatted strictly as `Number. Full Name` (no positions, no emojis).
4. **Lightweight Toast:** A simple local state `showToast` will be used in `SelectionBoard.tsx` to show a "Copied to clipboard" pill for 2.5 seconds. No heavy external libraries.
5. **UX Empty States:** The Roster page gets an empty state with a direct call-to-action button to add a player. The Weeks page gets a standard text empty state.

## 📁 Files to Touch (Exact paths + what to do)

### 1. `src/components/PlayerOverlay.tsx`
- Strip Kicking % fetch logic and UI completely.
- Remove the `kickingPct` state and associated `useEffect`.
- Update the 2x2 info grid to fill the empty cell appropriately.

### 2. `src/components/PlayerFormSheet.tsx`
- Add Kicking % fetch logic to load career kicking stats.
- Display Kicking % in the Career Stats section alongside other stats.
- Calculate percentage: `Math.round((makes / total) * 100)` where `total > 0`.

### 3. `src/components/SelectionBoard.tsx` (Bug Fix & WhatsApp Export)
- **PDF Squad Size:** Ensure the mapping array for the PDF export respects `squadSize` (e.g., if set to 22, do not map 23 rows).
- **Export UI:** Next to the PDF button, add a clean Copy Button (e.g., `📋`).
- **Export Logic:** Implement WhatsApp text export with proper formatting.
- **Toast UI:** Add local state for toast message and render toast component.

### 4. `src/pages/Roster.tsx` (Empty State)
- Replace basic "No players" text with action-oriented empty state UI.
- Include a working "+ Add First Player" button that triggers the add player flow.

### 5. `src/pages/Weeks.tsx` (Empty State)
- Implement a similar UI to Roster, but without the CTA button.
- Show "No weeks created yet" and "Tap + to start a new match week."

## 🎨 UI Implementation (Exact Tailwind/JSX - copy-paste ready)

### 1. `src/components/PlayerOverlay.tsx` - Remove Kicking %
```typescript
// Remove these lines from the component (around lines 260-295):
const [kickingPct, setKickingPct] = useState<number | null>(null)

// Remove the entire useEffect for fetching kicking stats

// Update the 2x2 grid (around line 186):
// REPLACE:
<InfoCell label="Kicking %" value={kickingPct !== null ? `${kickingPct}%` : '—'} />

// WITH:
<InfoCell label="Last Played" value={lastPlayed || '—'} />
// Note: This assumes Last Played was moved to the empty cell
```

### 2. `src/components/PlayerFormSheet.tsx` - Add Kicking %
```typescript
// Add to the existing stats fetching logic (around line 80-100):
useEffect(() => {
  async function fetchKickingStats() {
    if (!player) return
    
    const { data } = await supabase
      .from('match_events')
      .select('event_type')
      .eq('player_id', player.id)
      .in('event_type', ['Conversion', 'Penalty', 'Conversion Miss', 'Penalty Miss'])
    
    if (data) {
      let makes = 0
      let total = 0
      
      data.forEach(event => {
        if (event.event_type === 'Conversion' || event.event_type === 'Penalty') {
          makes++
          total++
        } else if (event.event_type === 'Conversion Miss' || event.event_type === 'Penalty Miss') {
          total++
        }
      })
      
      if (total > 0) {
        // Add kicking percentage to stats or create separate state
        setKickingPercentage(Math.round((makes / total) * 100))
      }
    }
  }
  
  fetchKickingStats()
}, [player])

// Add to the Career Stats display (around line 350-380):
{kickingPercentage !== null && (
  <StatCard value={`${kickingPercentage}%`} label="Kicking %" />
)}
```

### 3. `src/components/SelectionBoard.tsx` - WhatsApp Export & Toast
```typescript
// Add state at the top of the component (with other state declarations):
const [toastMessage, setToastMessage] = useState<string | null>(null)

// WhatsApp export function:
const handleWhatsAppExport = () => {
  if (!activeTeam || !activeWeek) return
  
  const starters = activeTeam.starters
  const bench = activeTeam.bench
  const startersCount = activeTeam.weekTeam.starters_count ?? 15
  const weekLabel = formatWeekDate(activeWeek.start_date)
  
  const text = `FIRST XV - SQUAD LIST\nWeek of ${weekLabel}\n\nSTARTERS\n` +
    starters.map((p, i) => `${i + 1}. ${p ? p.name : 'Unfilled'}`).join('\n') +
    `\n\nBENCH\n` +
    bench.map((p, i) => `${startersCount + i + 1}. ${p ? p.name : 'Unfilled'}`).join('\n')

  navigator.clipboard.writeText(text)
    .then(() => {
      setToastMessage('Copied to clipboard')
      setTimeout(() => setToastMessage(null), 2500)
    })
    .catch(() => {
      setToastMessage('Failed to copy')
      setTimeout(() => setToastMessage(null), 2500)
    })
}

// Add Copy button next to PDF button (around line 520-540):
{teams.length > 0 && (
  <>
    <PDFDownloadButton
      teams={selectionTeamsToPDF(teams, {
        matchDate: activeWeek ? formatWeekDate(activeWeek.start_date) : undefined,
        clubName: clubSettings?.club_name
      })}
      fileName="team-sheet.pdf"
      dark
    />
    <button
      onClick={handleWhatsAppExport}
      style={{
        background: '#F3F4F6',
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 14,
        fontWeight: 600,
        color: '#374151',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}
    >
      📋 Copy Text
    </button>
  </>
)}

// Add Toast UI at the bottom of the component (before the closing div):
{toastMessage && (
  <div style={{
    position: 'fixed',
    bottom: 100,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#111827',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    zIndex: 100,
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  }}>
    {toastMessage}
  </div>
)}
```

### 4. `src/pages/Roster.tsx` - Empty State
```jsx
// Replace the "No players yet" section (find around line 150-180):
{filteredPlayers.length === 0 && (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 16px',
    textAlign: 'center'
  }}>
    <div style={{
      width: 64,
      height: 64,
      borderRadius: '50%',
      background: '#F3F4F6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 24,
      marginBottom: 16
    }}>
      📋
    </div>
    <h3 style={{
      fontSize: 16,
      fontWeight: 600,
      color: '#111827',
      marginBottom: 4
    }}>
      No players yet
    </h3>
    <p style={{
      fontSize: 14,
      color: '#6B7280',
      marginBottom: 24
    }}>
      Build your squad to get started.
    </p>
    <button
      onClick={() => setAddingPlayer(true)}
      style={{
        background: '#6B21A8',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '10px 20px',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer'
      }}
    >
      + Add First Player
    </button>
  </div>
)}
```

### 5. `src/pages/Weeks.tsx` - Empty State
```jsx
// Add empty state for weeks (find appropriate location):
{weeks.length === 0 && (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 16px',
    textAlign: 'center'
  }}>
    <div style={{
      width: 64,
      height: 64,
      borderRadius: '50%',
      background: '#F3F4F6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 24,
      marginBottom: 16
    }}>
      📅
    </div>
    <h3 style={{
      fontSize: 16,
      fontWeight: 600,
      color: '#111827',
      marginBottom: 4
    }}>
      No weeks created yet
    </h3>
    <p style={{
      fontSize: 14,
      color: '#6B7280'
    }}>
      Tap + to start a new match week.
    </p>
  </div>
)}
```

## ✅ Acceptance Criteria (Checklist format, binary pass/fail)

### Career Stats Realignment
- [ ] Kicking % removed from Match Overlay (`PlayerOverlay.tsx`)
- [ ] Kicking % added to Roster Form (`PlayerFormSheet.tsx`)
- [ ] Career kicking percentage calculated correctly across all matches
- [ ] Shows `—` when no kicking data exists

### PDF Export Fix
- [ ] PDF export respects custom `default_squad_size` from club settings
- [ ] Does not exceed the custom squad size in row mapping
- [ ] Team sheet PDF shows correct number of bench slots

### WhatsApp Text Export
- [ ] Copy button appears next to PDF button in Selection Board
- [ ] Button copies clean list of numbers and names only
- [ ] Format: `Number. Full Name` (no positions, no emojis)
- [ ] Includes "STARTERS" and "BENCH" sections with proper numbering

### Toast Notification
- [ ] Dark toast pill appears saying "Copied to clipboard"
- [ ] Toast vanishes after 2.5 seconds
- [ ] Shows "Failed to copy" on clipboard error
- [ ] No external libraries used (pure React state)

### Roster Empty State
- [ ] Roster empty state includes working "+ Add First Player" button
- [ ] Button triggers the add player flow (`setAddingPlayer(true)`)
- [ ] UI matches design with icon, heading, and description

### Weeks Empty State
- [ ] Weeks empty state shows "No weeks created yet"
- [ ] Includes instructional text "Tap + to start a new match week"
- [ ] Consistent styling with Roster empty state

## ⚠️ Edge Cases (Already Handled)
1. **Async Clipboard:** `navigator.clipboard` errors handled with fallback toast message
2. **Empty Teams:** Export buttons only show when teams exist
3. **No Kicking Data:** Shows `—` when `totalAttempts === 0`
4. **Mobile Safari:** Toast positioned with `fixed` and `transform` for centering
5. **PDF Row Mapping:** Dynamically calculates rows based on `squadSize` not hardcoded 23

## 🚀 Implementation Order (Step-by-Step)

### Step 1: Migrate Kicking % logic from Match Overlay to Roster Form
```bash
# 1. Remove kickingPct state and useEffect from PlayerOverlay.tsx
# 2. Update 2x2 grid to fill empty cell
# 3. Add kicking percentage fetch to PlayerFormSheet.tsx
# 4. Display in Career Stats section
```

### Step 2: Fix PDF row mapping in SelectionBoard.tsx
```bash
# 1. Ensure PDF export respects clubSettings?.default_squad_size
# 2. Verify row mapping doesn't exceed custom squad size
# 3. Test with different squad sizes (22, 23, etc.)
```

### Step 3: Build WhatsApp text export function, Copy button, and Toast UI
```bash
# 1. Add toastMessage state to SelectionBoard.tsx
# 2. Implement handleWhatsAppExport function
# 3. Add Copy button next to PDF button
# 4. Implement Toast UI component
# 5. Test clipboard functionality
```

### Step 4: Apply empty state to Weeks page
```bash
# 1. Add empty state UI to Weeks.tsx
# 2. Match styling with Roster empty state
# 3. Test when no weeks exist
```

### Step 5: Apply action-oriented empty state to Roster page
```bash
# 1. Replace basic "No players" text with enhanced UI
# 2. Add "+ Add First Player" button with working onClick
# 3. Test empty state appearance and functionality
```

### Step 6: Test all changes
```bash
# 1. Verify Kicking % moved correctly
# 2. Test PDF export with custom squad sizes
# 3. Test WhatsApp text export and toast
# 4. Verify empty states work correctly
# 5. Ensure no regression in existing functionality
```

## 📝 Notes for Tech Lead (Not for Developer)
- **Reference Documents:** `/.docs/architecture.md`, `/.docs/ARM-TRACKER.md`, `ACTIVE_SPEC_14.4.md`
- **Database Impact:** No database changes required - pure frontend UX improvements
- **Mobile Testing:** Test toast positioning on mobile devices
- **Clipboard API:** Requires secure context (HTTPS) - works in production
- **Session Log Entry:** Update SESSION_LOG.md after completion with "Export UX, Career Stats & Lightweight Polish"

## 🚨 Post-Implementation Documentation (Tech Lead Responsibility)
After Developer completes implementation, Tech Lead MUST:

1. **Update `/.docs/SESSION_LOG.md`** with new entry using exact format
2. **Update `/.docs/ARM-TRACKER.md`** - move task to "Done" section  
3. **Update `/.docs/architecture.md`** with any new UI patterns if established
4. **Update `/.docs/database_schema.md`** - no changes needed
5. **Move this `ACTIVE_SPEC.md` to `/.docs/phase-specs/`** as `14.5_Export_UX_Career_Stats_Lightweight_Polish_COMPLETED_SPEC.md`