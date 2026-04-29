
# ACTIVE_SPEC: Phase 18.1 — Form Layer Sheet Sideways Movement Lockdown

## 📋 Quick Summary
- **Priority**: High (User Experience / Touch Interaction)
- **Problem**: PlayerFormSheet allows horizontal swiping/movement on touch devices
- **Solution**: Add `touch-action: pan-y` to restrict touch to vertical scrolling only
- **Target**: iPhone 11+ and modern Android devices
- **Files**: `src/components/PlayerFormSheet.tsx`

### 🎯 Why This Matters
Users can accidentally swipe horizontally on the PlayerFormSheet (add/edit player form), causing unwanted movement and breaking the native app feel. This spec eliminates sideways movement while preserving vertical scrolling for form content, creating a more polished touch experience.

---

## 🏗️ Architecture Decisions

### 1. **Touch-Action Strategy**
- Use `touch-action: pan-y` (same as PlayerOverlay implementation)
- Allows vertical scrolling (needed for long forms)
- Blocks horizontal swiping/movement
- Consistent with Phase 18.0 touch lockdown principles

### 2. **Implementation Approach**
- Single property addition to existing style object
- No structural changes to component
- Preserves all existing functionality
- Minimal risk of regression

### 3. **Consistency Principle**
- Match PlayerOverlay's `touch-action: pan-y` implementation
- Maintain uniform touch behavior across all bottom sheets/modals
- Follow established patterns in the codebase

## 📁 Files to Touch

### 1. `src/components/PlayerFormSheet.tsx`
**Location**: Main sheet container (lines 240-265)
**Change**: Add `touchAction: 'pan-y'` to style object

## 🎨 UI Implementation

### Exact Code Change

**Current code** (lines 240-255):
```tsx
<div style={{
  position: 'fixed',
  zIndex: 51,
  background: '#FFFFFF',
  // Mobile: bottom sheet ~85% height
  bottom: 0, left: 0, right: 0,
  borderTopLeftRadius: '20px',
  borderTopRightRadius: '20px',
  maxHeight: '92dvh',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  // Tablet+: centred modal
  // (override via media query below)
}}
  className="player-sheet"
>
```

**New code** (add `touchAction: 'pan-y'`):
```tsx
<div style={{
  position: 'fixed',
  zIndex: 51,
  background: '#FFFFFF',
  // Mobile: bottom sheet ~85% height
  bottom: 0, left: 0, right: 0,
  borderTopLeftRadius: '20px',
  borderTopRightRadius: '20px',
  maxHeight: '92dvh',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  touchAction: 'pan-y', // <-- ADD THIS LINE
  // Tablet+: centred modal
  // (override via media query below)
}}
  className="player-sheet"
>
```

## ✅ Acceptance Criteria

- [ ] PlayerFormSheet no longer moves horizontally when swiped left/right
- [ ] Form content still scrolls vertically (preserves existing functionality)
- [ ] All form inputs, buttons, and interactions work normally
- [ ] No visual changes to the sheet appearance
- [ ] Consistent with PlayerOverlay touch behavior
- [ ] Works on iPhone, Android, and iPad touch devices

## ⚠️ Edge Cases & Special Handling

### Already Handled:
- **Vertical scrolling preserved**: `touch-action: pan-y` allows vertical movement
- **Form interactions**: Inputs, buttons, selects remain fully functional
- **Responsive design**: Media query overrides for tablet/desktop unaffected
- **Accessibility**: No impact on screen readers or keyboard navigation

### Not Applicable:
- **Zoom prevention**: Handled by Phase 18.0 viewport meta changes
- **Other overlays**: PlayerOverlay already has `touch-action: pan-y`
- **Browser compatibility**: Modern browsers support `touch-action` CSS property

## 🚀 Implementation Order

1. **Locate PlayerFormSheet**: Open `src/components/PlayerFormSheet.tsx`
2. **Find sheet container**: Lines 240-265 (main div with `position: 'fixed'`)
3. **Add touch-action**: Insert `touchAction: 'pan-y',` after `overscrollBehavior: 'contain',`
4. **Verify syntax**: Ensure trailing comma and proper JSON formatting
5. **Test**: Open PlayerFormSheet on touch device/emulator, verify:
   - No horizontal movement
   - Vertical scrolling works
   - All form elements functional

## 📋 Files Requiring Updates

1. `src/components/PlayerFormSheet.tsx` - Single line addition

## 🧪 Testing Strategy

### Manual Testing Checklist:
1. **Horizontal swipe test**: Try to swipe left/right on PlayerFormSheet
   - Expected: Sheet doesn't move horizontally
2. **Vertical scroll test**: Scroll through form content
   - Expected: Smooth vertical scrolling
3. **Form interaction test**: Tap all inputs, buttons, selects
   - Expected: All elements respond normally
4. **Cross-device test**: iPhone, Android, iPad
   - Expected: Consistent behavior across devices
5. **Regression test**: Open/close sheet multiple times
   - Expected: No visual or functional regressions

### Device Coverage:
- iPhone 11+ (iOS Safari)
- Modern Android (Chrome)
- iPad (Safari)
- Desktop browsers (should be unaffected)

---

**Task Progress Update:**
- [x] Read and analyze Phase 18.0 spec
- [x] Examine PlayerFormSheet component for sideways movement issues
- [x] Check current touch-action implementations in codebase
- [x] Analyze PlayerOverlay for comparison
- [x] Review clinerules for spec format requirements
- [x] Create comprehensive plan for Phase 18.1
- [x] Write Phase 18.1 spec document

