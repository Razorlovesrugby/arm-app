# ACTIVE SPEC: Phase 13 Implementation — Professional Team Sheet PDF Export

**Status:** Ready for Implementation  
**Target:** Implement production-ready TeamSheetPDF component using @react-pdf/renderer  
**Priority:** High — Legal match-day document for referees and tactical guide for coaches  
**Context-Free:** ✅ All decisions made in this spec  
**Preserves All Features:** ✅ No existing functionality removed or broken  
**Implementation Start:** 2026-04-08  
**Reference:** Phase 13 in ARM-TRACKER.md (Exports — jsPDF PDF + plain text, native OS share sheet)

---

## 🎯 Why This Matters

The team sheet is a **legal document** for rugby match officials and a **tactical guide** for coaches. It must be:
- **Legible** in low-light changing rooms
- **Durable** for pitch-side use in all weather conditions
- **Professional** for presentation to referees and opposition
- **Accurate** with proper shirt numbering and captain designation

---

## 🏗️ Architecture Decisions (Locked)

1. **Library:** Use `@react-pdf/renderer` (not jsPDF) for React-native PDF generation with proper styling support
2. **Data Structure:** Accept `teams[]` array prop where each team has `teamName`, `players[]` (1-23), and `matchNotes`
3. **Simple Numbering:** List players in shirt number order 1-23 (or however many were selected) without categorization into Forwards/Backs/Finishers
4. **Missing Players:** If a shirt number is missing in data, render empty underlined row (`_______`) for coach to hand-write
5. **Captain Designation:** Append `(C)` suffix to player name when `isCaptain` is true
6. **Multi-Team Support:** One team per page when multiple teams provided
7. **Brand Integration:** Accept `brandColor` prop for headers and borders

---

## 📁 Files to Touch

### New Files:
1. **`src/components/TeamSheetPDF.tsx`** — Main PDF component with TypeScript interface
2. **`src/components/PDFDownloadLink.tsx`** — Wrapper component with download trigger UI

### Updated Files:
3. **`package.json`** — Add `@react-pdf/renderer` dependency
4. **`src/pages/Board.tsx`** — Add PDF export button to Selection Board
5. **`src/pages/ResultDetail.tsx`** — Add PDF export button to Results view

### Integration Points:
6. **`src/hooks/useSelectionBoard.ts`** — Export function to transform team data for PDF
7. **`src/lib/supabase.ts`** — Add TypeScript interfaces for PDF data structure

---

## 🎨 UI Implementation (Exact Code Snippets)

### 1. TypeScript Interface (TeamSheetPDF.tsx)
```typescript
export interface PDFPlayer {
  id: string
  shirtNumber: number
  fullName: string
  isCaptain: boolean
  position?: string
}

export interface PDFTeam {
  teamName: string
  players: PDFPlayer[]
  matchNotes?: string
  matchDate?: string
  opponent?: string
  venue?: string
  kickoffTime?: string
}

export interface TeamSheetPDFProps {
  teams: PDFTeam[]
  brandColor?: string
  clubName?: string
  coachName?: string
}
```

### 2. Player Numbering Logic
```typescript
const organizePlayersByNumber = (players: PDFPlayer[]) => {
  // Create array for numbers 1-23
  const result: (PDFPlayer | null)[] = Array(23).fill(null)
  
  // Place players in their shirt number positions (1-based index)
  players.forEach(player => {
    if (player.shirtNumber >= 1 && player.shirtNumber <= 23) {
      result[player.shirtNumber - 1] = player
    }
  })
  
  return result
}

const getPlayerDisplayName = (player: PDFPlayer | null) => {
  if (!player) return null
  return player.isCaptain ? `${player.fullName} (C)` : player.fullName
}
```

### 3. PDF Styling (React-PDF StyleSheet)
```typescript
import { StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#000000'
  },
  header: {
    backgroundColor: '#1e40af', // Default blue, overridden by brandColor
    color: '#ffffff',
    padding: 20,
    marginBottom: 30,
    borderRadius: 4
  },
  teamName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  matchInfo: {
    fontSize: 12,
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
    paddingBottom: 4
  },
  twoColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30
  },
  column: {
    width: '48%'
  },
  playerRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center'
  },
  shirtNumber: {
    width: 30,
    fontWeight: 'bold',
    fontSize: 12
  },
  playerName: {
    flex: 1,
    fontSize: 11
  },
  captainBadge: {
    fontSize: 9,
    color: '#dc2626',
    marginLeft: 4
  },
  emptySlot: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    borderBottomStyle: 'dashed',
    height: 14,
    marginLeft: 4
  },
  finishersSection: {
    backgroundColor: '#f3f4f6',
    padding: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginBottom: 30
  },
  notesSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb'
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8
  },
  notesContent: {
    fontSize: 10,
    lineHeight: 1.5
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#6b7280'
  }
})
```

### 4. PDFDownloadLink Wrapper Component
```typescript
import { PDFDownloadLink } from '@react-pdf/renderer'
import { Download } from 'lucide-react'

export function PDFDownloadButton({ teams, brandColor, fileName = 'team-sheet.pdf' }: {
  teams: PDFTeam[]
  brandColor?: string
  fileName?: string
}) {
  return (
    <PDFDownloadLink
      document={<TeamSheetPDF teams={teams} brandColor={brandColor} />}
      fileName={fileName}
      style={{ textDecoration: 'none' }}
    >
      {({ loading }) => (
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          <Download size={18} />
          {loading ? 'Generating PDF...' : 'Download Team Sheet'}
        </button>
      )}
    </PDFDownloadLink>
  )
}
```

---

## ✅ Acceptance Criteria (Binary Pass/Fail)

### Core Functionality
- [ ] `@react-pdf/renderer` installed and working
- [ ] `TeamSheetPDF.tsx` component renders PDF document
- [ ] Accepts `teams[]` array with `teamName`, `players[]`, `matchNotes`
- [ ] Lists players in shirt number order 1-23 (or however many selected)
- [ ] Renders empty underlined row (`_______`) for missing shirt numbers
- [ ] Appends `(C)` suffix to captain names
- [ ] One team per page when multiple teams provided

### Layout & Design
- [ ] Full-width brand-colored header block with club name and match metadata
- [ ] Single-column list of players 1-23 in shirt number order
- [ ] Clear visual separation between players (adequate spacing)
- [ ] High-contrast sans-serif typography (Helvetica stack)
- [ ] Bold, prominent shirt numbers for match officials
- [ ] "Coach's Notes" section with adequate line-height for readability
- [ ] Page numbering and "Generated by ARM" timestamp in footer
- [ ] `brandColor` prop controls header and border colors

### Integration
- [ ] `PDFDownloadButton` component with loading state
- [ ] PDF export button added to Selection Board (`Board.tsx`)
- [ ] PDF export button added to Results view (`ResultDetail.tsx`)
- [ ] Native OS share sheet integration works on mobile devices
- [ ] File downloads as `team-sheet.pdf` with proper naming

### Edge Cases Handled
- [ ] Empty team (no players) renders template with all empty slots
- [ ] Missing shirt numbers 1-23 filled with empty rows
- [ ] Very long player names truncate gracefully
- [ ] Long match notes wrap properly within page bounds
- [ ] Dark brand colors maintain text contrast (white text on dark backgrounds)
- [ ] Multiple teams generate multi-page PDF correctly

---

## ⚠️ Edge Cases (Already Handled)

1. **Missing Players:** Empty underlined slots allow coach handwriting
2. **Invalid Shirt Numbers:** Numbers outside 1-23 filtered out with warning
3. **Duplicate Shirt Numbers:** First occurrence used, subsequent duplicates ignored
4. **Long Text:** Player names and notes truncate with ellipsis
5. **Dark Brand Colors:** Automatic white text for contrast on dark backgrounds
6. **Empty Teams:** Renders template with all 23 empty slots
7. **No Brand Color:** Defaults to professional blue (`#1e40af`)
8. **Mobile Devices:** PDF opens in browser with download/share options

---

## 🚀 Implementation Order (Step-by-Step)

### Step 1: Setup Dependencies
```bash
npm install @react-pdf/renderer
```

### Step 2: Create Core PDF Component
1. Create `src/components/TeamSheetPDF.tsx` with TypeScript interfaces
2. Implement player numbering logic (organize by shirt number 1-23)
3. Create React-PDF StyleSheet with simplified single-column layout
4. Build PDF document structure with:
   - Header (brand-colored)
   - Match metadata
   - Single-column player list 1-23
   - Coach's notes section
   - Footer with timestamp and page numbers

### Step 3: Create Download Wrapper
1. Create `src/components/PDFDownloadLink.tsx` wrapper
2. Implement loading state and error handling
3. Add native share sheet integration for mobile

### Step 4: Data Transformation
1. Add export function to `useSelectionBoard.ts` hook
2. Transform team selection data to `PDFTeam[]` format
3. Include match metadata from week/team data

### Step 5: UI Integration
1. Add PDF button to `Board.tsx` (Selection Board)
2. Add PDF button to `ResultDetail.tsx` (Results view)
3. Style buttons to match existing UI patterns

### Step 6: Testing
1. Test with complete team (23 players)
2. Test with partial team (missing players)
3. Test with multiple teams
4. Test on mobile devices
5. Verify PDF quality and print readiness

### Step 7: Polish
1. Add loading spinners during PDF generation
2. Add success/error toasts
3. Ensure accessibility (ARIA labels)
4. Update documentation

---

## 🚀 Quick Start Commands

```bash
# Install dependency
npm install @react-pdf/renderer

# Create component files
touch src/components/TeamSheetPDF.tsx
touch src/components/PDFDownloadLink.tsx

# Update existing files
# 1. Add PDF export button to Board.tsx
# 2. Add PDF export button to ResultDetail.tsx
# 3. Add data transformation to useSelectionBoard.ts
```

---

## 📝 Notes

- **Print Quality:** PDF must be print-ready at A4 size (210mm × 297mm)
- **Legal Document:** Team sheet is official match document - accuracy is critical
- **Simple Numbering:** List players 1-23 in shirt number order without categorization
- **Accessibility:** High contrast essential for low-light changing rooms
- **Performance:** PDF generation should complete within 3 seconds for typical teams
- **Fallback:** If @react-pdf fails, show error with alternative text export option

**Deliverable:** Production-ready TeamSheetPDF component integrated into Selection Board and Results views, generating professional A4 team sheets for rugby match officials.
