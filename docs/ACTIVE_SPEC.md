# ACTIVE SPEC: Phase 12.6 Implementation — UI Polish, Grid Foundation & Bug Fixes

**Status:** Ready for Implementation  
**Target:** Implement all Phase 12.6 features from completed specification  
**Priority:** High — Critical UX improvements and new coach view  
**Context-Free:** ✅ All decisions made in completed spec  
**Preserves All Features:** ✅ No existing functionality removed or broken
**Implementation Start:** 2026-04-08
**Reference Spec:** `/docs/phase-specs/12.6_COMPLETED_SPEC.md`

---

## 🎯 Implementation Overview

Phase 12.6 implementation includes four major components:

1. **Filter Consistency:** "Show Retired Players" toggle needs to match existing filter UX
2. **Overlay Scroll Fixes:** Fix "horizontal jiggle" and "scroll chaining" in modals
3. **Master Availability Grid:** Bird's-eye view of availability across all upcoming weeks
4. **Branding Features:** Club name, colors, logo customization, default teams, game notes

---

## 📋 Implementation Tasks

### Task 1: Database Migration
- **File:** `supabase/migrations/013_phase_12_6.sql`
- **Content:** From completed spec (lines 143-171)
- **Action:** Create and apply migration
- **Verify:** Check constraints exist after migration

### Task 2: Color Utilities
- **File:** `src/lib/colorUtils.ts` — NEW
- **Content:** From completed spec (lines 173-196)
- **Functions:** `getContrastColor()`, `isValidHexColor()`

### Task 3: Master Grid Data Hook
- **File:** `src/hooks/useGrid.ts` — NEW
- **Functionality:** Fetch active players, open/future weeks, availability responses
- **Transform:** Map into efficient 2D dictionary using `useMemo`
- **Performance:** No virtualization needed for 60×10 matrix

### Task 4: Master Grid UI
- **File:** `src/pages/Grid.tsx` — NEW
- **Layout:** Sticky left column (players), sticky top row (weeks)
- **CSS:** Three-layer z-index system for iOS Safari compatibility
- **Cells:** Color-coded availability badges
- **Routing:** Add `/grid` route to `App.tsx` and `Sidebar.tsx`

### Task 5: Club Settings Page
- **File:** `src/pages/ClubSettings.tsx` — COMPLETE REWRITE
- **Current:** Placeholder "Coming Soon" page
- **New:** Full branding UI with:
  - Brand color picker with contrast validation
  - Logo URL input with "Try to Load" validation
  - Default teams array input (add/remove, max 10)
  - Save/validation logic

### Task 6: Filter Consistency
- **Files:** `src/pages/Roster.tsx`, `src/pages/DepthChart.tsx`
- **Goal:** Ensure "Retired" handled consistently across all filter implementations
- **Action:** Audit filter implementations, integrate "Show Retired Players" toggle if separate exists

### Task 7: Overlay Scroll Fixes
- **Files:** `PlayerOverlay.tsx`, `SelectionBoard.tsx`, `PlayerFormSheet.tsx`, `DeletePlayerDialog.tsx`, modal overlays
- **Fix 1:** Add `overscroll-behavior: contain` to overlay containers
- **Fix 2:** Lock body scroll when modals open
- **Fix 3:** Use `100%` instead of `100vw` for viewport calculations

### Task 8: Integration Updates
- **File:** `src/hooks/useClubSettings.ts` — Add `default_teams` to interface
- **File:** `src/hooks/useWeeks.ts` — Update `CreateWeekParams` with `teamNames` and `notes`
- **File:** `src/pages/Weeks.tsx` — Add game notes, pre-populate teams from defaults
- **File:** `src/pages/AvailabilityForm.tsx` — Display club branding and week notes
- **File:** `src/pages/ResultDetail.tsx` — Add opponent input per team
- **File:** `src/lib/supabase.ts` — Add new column types
- **File:** `src/App.tsx` — Inject CSS variable for `--primary`

---

## 🏗️ Critical Implementation Details

### Database Schema (Already in Spec)
- `club_settings.default_teams`: `TEXT[]` (nullable)
- `weeks.notes`: `TEXT` (nullable, max 1000 chars)
- `week_teams.opponent`: `TEXT` (nullable, max 100 chars)

### CSS & Layout (Critical for iOS)
- **Sticky Headers:** Three-layer z-index system
- **Intersection Cell:** First `<th>` in `<thead>` with highest z-index
- **Background Colors Mandatory:** Prevents bleed-through on mobile WebKit
- **Test on iOS Safari:** Mandatory acceptance criteria

### Performance Optimizations
- **`useMemo` for Matrix:** Memoize 2D availability dictionary
- **`React.memo` for Rows:** Prevent unnecessary re-renders
- **No Virtualization:** 60 players × 10 weeks = 600 DOM nodes → standard React sufficient

### Fallbacks & Edge Cases
- **Empty `default_teams`:** Fallback to `["1st XV", "2nd XV"]`
- **Invalid Brand Color:** Show error, prevent save, suggest accessible alternatives
- **Network Failures:** Preserve form data, show retry toast
- **PWA Updates:** Update `theme_color` meta tag with brand color

---

## ✅ Acceptance Criteria (From Completed Spec)

### Filter Consistency
- [ ] "Retired" handled consistently across all filter implementations
- [ ] No separate full-width toggle for retired players
- [ ] Matches existing roster UX patterns exactly

### Overlay Scroll Fixes  
- [ ] No "horizontal jiggle" when scrolling overlays
- [ ] Background locked when modals open (`document.body.style.overflow = 'hidden'`)
- [ ] Smooth scrolling on iOS Safari and Chrome Android
- [ ] `overscroll-behavior: contain` implemented in overlay containers

### Master Availability Grid
- [ ] `useGrid.ts` efficiently fetches and transforms data (players, weeks, responses)
- [ ] Grid renders players vertically, weeks horizontally
- [ ] Sticky left column and top row work correctly on iOS Safari
- [ ] Top-left cell intersection overlaps correctly with highest `z-index`
- [ ] Cells show correct availability status with brand colors
- [ ] `/grid` route added to `App.tsx` and `Sidebar.tsx`

### Branding Features
- [ ] `club_settings.default_teams` column exists as `TEXT[]` (nullable)
- [ ] `weeks.notes` column exists as `TEXT` (nullable, max 1000 chars)
- [ ] `week_teams.opponent` column exists as `TEXT` (nullable, max 100 chars)
- [ ] Club settings page with brand color picker, logo URL, default teams
- [ ] Create week form pre-populates teams from `club_settings.default_teams` (COPY)
- [ ] Week cards display and allow editing of game notes
- [ ] Availability form displays club branding and week notes
- [ ] Result detail page has opponent input per team
- [ ] Dynamic contrast-aware text colors based on brand color luminance
- [ ] `theme_color` meta tag updates with brand color for PWA

### Database Constraints
- [ ] `CHECK (array_length(default_teams, 1) <= 10)` constraint exists
- [ ] `CHECK (length(notes) <= 1000)` constraint exists  
- [ ] `CHECK (length(opponent) <= 100)` constraint exists

---

## 📁 Implementation Order (Recommended)

1. **Database Migration** (Task 1) — Foundation for all features
2. **Color Utilities** (Task 2) — Required for branding
3. **Club Settings Page** (Task 5) — Core branding feature
4. **Integration Updates** (Task 8) — Connect branding to existing features
5. **Master Grid** (Tasks 3-4) — New feature
6. **Filter Consistency** (Task 6) — UX polish
7. **Overlay Scroll Fixes** (Task 7) — Mobile UX improvement
8. **Testing** — All features on iOS Safari

---

## 🚀 Quick Start Commands

```bash
# Create migration file
touch supabase/migrations/013_phase_12_6.sql

# Apply migration (in Supabase SQL editor)
# Copy content from phase-specs/12.6_COMPLETED_SPEC.md lines 143-171

# Create new files
touch src/lib/colorUtils.ts
touch src/hooks/useGrid.ts
touch src/pages/Grid.tsx

# Update existing files
# See Task 8 for list of files to update
```

---

## 📝 Notes

- **Reference:** Full implementation details in `/docs/phase-specs/12.6_COMPLETED_SPEC.md`
- **Testing:** Mandatory iOS Safari testing for overlay scroll fixes and sticky grid
- **Backward Compatibility:** All existing functionality must be preserved
- **Performance:** Client-side data transformation only (no RPC needed)

**Deliverable:** Fully implemented Phase 12.6 with all features working on iOS Safari.