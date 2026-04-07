# UAT Test Cases: Phase 12.1 — Sidebar Navigation Refactor & Global White-labeling

## Overview
**Phase:** 12.1 — UI Pivot  
**Test Date:** 7 April 2026  
**Tester:** [Your Name]  
**Environment:** Production (Vercel) / Staging  
**Build:** Commit 9428a5d

## Test Objective
Verify that the sidebar navigation refactor and dynamic club branding work correctly across all devices and user flows.

---

## Section 1: Branding & Logo Implementation

### Test Case 1.1: Dynamic Club Name Display
**Objective:** Verify club name loads dynamically from database
**Steps:**
1. Navigate to `/login` page
2. Observe the club name displayed below the logo
3. Log in and navigate to any protected page (Roster, Depth Chart, etc.)
4. Check sidebar header for club name
5. Check mobile header for club name

**Expected Results:**
- Club name displays as "ARM" (fallback) or actual club name from `club_settings`
- No hardcoded "Belsize Park RFC" appears anywhere
- Loading state handled gracefully

**Pass Criteria:** ✅ Dynamic club name displays correctly on all screens

### Test Case 1.2: Logo Rendering
**Objective:** Verify logo appears in all required locations
**Steps:**
1. Check `/login` page - logo should be visible
2. Check `/availability/:token` page - logo should be visible
3. Check offline page (`/offline.html`) - logo should be visible
4. Check sidebar - logo should be visible in header
5. Verify logo is `/icons/Logo.png` (not purple ARM box)

**Expected Results:**
- Logo displays with proper sizing and aspect ratio
- Alt text "ARM Logo" present
- No broken image icons

**Pass Criteria:** ✅ Logo appears in all 4 locations with correct styling

### Test Case 1.3: Meta Descriptions
**Objective:** Verify updated meta descriptions
**Steps:**
1. View page source of deployed application
2. Check `<meta name="description">` in index.html
3. Check `manifest.json` description field

**Expected Results:**
- Both descriptions: "Team selection and player management"
- No references to old descriptions

**Pass Criteria:** ✅ Descriptions updated correctly

---

## Section 2: Sidebar Navigation Component

### Test Case 2.1: Responsive Behavior (Desktop/Tablet ≥768px)
**Objective:** Verify sidebar is always visible on larger screens
**Steps:**
1. Open app on desktop/tablet (or simulate ≥768px width)
2. Navigate to any protected page
3. Observe sidebar position and visibility

**Expected Results:**
- Sidebar fixed on left, 260px width
- Main content area adjusts to remaining width
- No hamburger menu visible in header
- Sidebar cannot be closed on desktop

**Pass Criteria:** ✅ Sidebar always visible on ≥768px screens

### Test Case 2.2: Responsive Behavior (Mobile <768px)
**Objective:** Verify mobile hamburger menu works correctly
**Steps:**
1. Open app on mobile (or simulate <768px width)
2. Verify sidebar is hidden initially
3. Tap hamburger menu (☰) in header
4. Verify sidebar slides in from left
5. Tap overlay or close button (X) to close
6. Tap navigation link - sidebar should auto-close

**Expected Results:**
- Sidebar hidden by default on mobile
- Hamburger menu visible in header
- Sidebar slides in smoothly (80% width)
- Dark overlay appears behind sidebar
- Navigation taps close sidebar on mobile
- Close button works

**Pass Criteria:** ✅ Mobile sidebar opens/closes correctly with all interactions

### Test Case 2.3: Navigation Links
**Objective:** Verify all navigation links work correctly
**Steps:**
1. From sidebar, click each navigation item:
   - "Roster" → `/roster`
   - "Depth Chart" → `/depth`
   - "Weeks" → `/weeks`
   - "Results" → `/board`
2. Verify active state styling (border-left, bold)
3. Test on both mobile and desktop

**Expected Results:**
- All links navigate to correct pages
- Active page highlighted in sidebar
- "Depth Chart" label used (not "Chart")
- "Results" links to `/board` (not Archive)

**Pass Criteria:** ✅ All navigation links work with correct active states

### Test Case 2.4: Sidebar Footer
**Objective:** Verify user email and sign out work
**Steps:**
1. Log in with test account
2. Check sidebar footer for user email display
3. Click "Sign Out" button
4. Verify redirected to login page

**Expected Results:**
- User email displays in sidebar footer
- Email truncated if too long
- Sign out button works and redirects
- Session properly cleared

**Pass Criteria:** ✅ User info displays and sign out works

---

## Section 3: Layout & Routing

### Test Case 3.1: Bottom Navigation Removal
**Objective:** Verify old bottom tab bar is completely removed
**Steps:**
1. Navigate through all protected pages
2. Check for any bottom navigation bar
3. Verify no tab bar appears on any screen

**Expected Results:**
- No bottom navigation bar visible
- No tab indicators or icons at bottom
- Layout uses full height with sidebar

**Pass Criteria:** ✅ Bottom navigation completely removed

### Test Case 3.2: Archive Route Removal
**Objective:** Verify Archive functionality is deprecated
**Steps:**
1. Try to navigate to `/archive` directly
2. Check if Archive appears in navigation
3. Verify "Results" links to `/board` not Archive

**Expected Results:**
- `/archive` route redirects or shows 404
- No Archive tab in sidebar navigation
- "Results" goes to Board page

**Pass Criteria:** ✅ Archive route removed as specified in v2.0

### Test Case 3.3: iOS Safe Area
**Objective:** Verify iOS notch/safe area handling
**Steps:**
1. Test on iOS device or simulator
2. Check if content respects safe-area-inset-top
3. Verify no content hidden behind notch

**Expected Results:**
- Main content has `padding-top: env(safe-area-inset-top)`
- No UI elements hidden behind iOS notch
- Proper spacing on all iOS devices

**Pass Criteria:** ✅ iOS safe areas respected

---

## Section 4: Database Integration

### Test Case 4.1: Club Settings Hook
**Objective:** Verify `useClubSettings` hook works
**Steps:**
1. Monitor network requests in DevTools
2. Check if `club_settings` table query succeeds
3. Verify data loads without errors
4. Test loading and error states

**Expected Results:**
- Single query to `club_settings` table
- Data cached appropriately
- Loading state shown when fetching
- Error handled gracefully

**Pass Criteria:** ✅ Club settings fetched correctly from database

### Test Case 4.2: WhatsApp Share Message
**Objective:** Verify dynamic club name in share messages
**Steps:**
1. Navigate to Weeks page
2. Open an "Open" week
3. Click "Share" button
4. Check share message content

**Expected Results:**
- Share message includes dynamic club name
- Format: `{Club Name} — {Week Label}. Please submit...`
- Fallback to "ARM" if no club settings

**Pass Criteria:** ✅ Share message uses dynamic club name

---

## Section 5: Cross-Browser & Device Testing

### Test Case 5.1: Browser Compatibility
**Objective:** Verify functionality across browsers
**Browsers to Test:**
- Chrome (latest)
- Safari (iOS/Mac)
- Firefox
- Edge

**Steps:**
1. Test all major functionality in each browser
2. Verify no JavaScript errors in console
3. Check CSS rendering consistency

**Expected Results:**
- Consistent behavior across browsers
- No console errors
- Responsive design works everywhere

**Pass Criteria:** ✅ Works correctly in all major browsers

### Test Case 5.2: Device Testing Matrix
**Devices to Test:**
- iPhone (various sizes)
- iPad (portrait/landscape)
- Android phones
- Desktop (various resolutions)

**Steps:**
1. Test responsive breakpoints (768px)
2. Verify touch interactions work
3. Check orientation changes

**Expected Results:**
- Proper responsive behavior on all devices
- Touch targets appropriate size (≥44px)
- Orientation changes handled

**Pass Criteria:** ✅ Works correctly on all target devices

---

## Section 6: Performance & PWA

### Test Case 6.1: Build & Performance
**Objective:** Verify build succeeds and performance acceptable
**Steps:**
1. Run `npm run build` locally
2. Check for TypeScript errors
3. Verify bundle size warnings
4. Test Lighthouse scores

**Expected Results:**
- Build succeeds without errors
- No TypeScript compilation errors
- Bundle size within acceptable limits
- Lighthouse performance ≥80

**Pass Criteria:** ✅ Build succeeds with acceptable performance

### Test Case 6.2: PWA Functionality
**Objective:** Verify PWA still works after changes
**Steps:**
1. Install as PWA on mobile device
2. Test offline functionality
3. Verify manifest and service worker

**Expected Results:**
- App installable as PWA
- Offline page shows logo (not purple box)
- Service worker registers correctly

**Pass Criteria:** ✅ PWA functionality maintained

---

## Test Summary

### Acceptance Criteria Verification
- [x] `club_settings` table accessible via `useClubSettings` hook
- [x] "Belsize Park RFC" removed from all hardcoded locations
- [x] `/icons/Logo.png` renders on Login, Availability, Offline, and Sidebar
- [x] WhatsApp Share message uses dynamic `club_name`
- [x] Sidebar visible on tablet/desktop (≥768px), hidden on mobile
- [x] Mobile hamburger menu opens/closes sidebar with dark overlay
- [x] Navigation links close sidebar on mobile tap
- [x] Sidebar footer shows user email + working Sign Out
- [x] Bottom tab bar completely removed
- [x] Archive tab removed from navigation
- [x] "Depth Chart" label used instead of "Chart"
- [x] "Results" navigation item links to `/board`
- [x] iOS safe-area-inset-top preserved

### Test Results Summary
**Total Test Cases:** 15  
**Passed:** [ ] / 15  
**Failed:** [ ] / 15  
**Blocked:** [ ] / 15  

**Overall Status:** [ ] READY FOR PRODUCTION  
**Tester Sign-off:** ________________________  
**Date:** ________________________

---

## Issues & Observations
[Document any issues found during testing]

1. **Issue:** [Description]
   - **Severity:** High/Medium/Low
   - **Steps to Reproduce:** 
   - **Expected Behavior:**
   - **Actual Behavior:**
   - **Screenshot:** [if applicable]

2. **Issue:** [Description]
   - **Severity:** High/Medium/Low
   - **Steps to Reproduce:**
   - **Expected Behavior:**
   - **Actual Behavior:**
   - **Screenshot:** [if applicable]

---

## Deployment Verification
- [ ] Changes committed to git: ✅ Commit 9428a5d
- [ ] Changes pushed to GitHub: ✅ Pushed to main
- [ ] Vercel auto-deploy triggered: [Check Vercel dashboard]
- [ ] Production URL: [Insert Vercel URL]
- [ ] Database migration applied: ✅ 011_v2_pivot.sql
- [ ] Club settings table has data: [Verify in Supabase]

**Deployment Sign-off:** ________________________  
**Date:** ________________________