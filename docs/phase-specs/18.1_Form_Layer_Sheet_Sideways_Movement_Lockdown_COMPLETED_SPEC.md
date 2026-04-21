# ACTIVE_SPEC: Phase 18.1 — Form Layer Sheet Sideways Movement Lockdown

## 📋 Metadata
- **Status**: ACTIVE  
- **Priority**: High (User Experience / Touch Interaction)
- **Phase**: 18.1
- **Estimated Effort**: 15 minutes
- **Dependencies**: Phase 18.0 (Touch Zoom & Movement Lockdown)
- **Related Specs**: 18.0 (Touch Zoom & Movement Lockdown), 14.1 (Native App Shell Layout)
- **Target Devices**: iPhone 11 and newer, modern Android devices
- **Browser Support**: iOS Safari 12+, Chrome for Android, Safari for iPad
- **Implementation Date**: Pending

## 🎯 Why This Matters
When users interact with the PlayerFormSheet (add/edit player form) on touch devices, they can accidentally swipe horizontally, causing unwanted sideways movement. This breaks the native app illusion and creates a less polished experience. Users expect bottom sheets to stay fixed horizontally while allowing vertical scrolling for form content.

## 🧠 Current State Analysis

### 1. PlayerFormSheet Touch Behavior
- **Current**: No `touch-action` CSS property set
- **Impact**: Browser default touch behaviors apply (allows horizontal swiping)
- **Location**: `src/components/PlayerFormSheet.tsx` lines 240-265

### 2. Comparison with PlayerOverlay
- **PlayerOverlay**: Has `touchAction: 'pan-y'` (line 221)
- **Result**: Restricts touch to vertical panning only
- **Consistency**: PlayerFormSheet lacks this restriction

### 3. Technical Analysis
```tsx
// PlayerFormSheet current styling (lines 240-255):
<div style={{
  position: 'fixed',
  zIndex: 51,
  background: '#FFFFFF',
  bottom: 0, left: 0, right: 0,
  borderTopLeftRadius: '20px',
  borderTopRightRadius: '20px',
  maxHeight: '92dvh',
  overflowY: 'auto',
  overscrollBehavior: 'contain', // <-- Only prevents scroll chaining
  // Missing: touch-action property
}}
```

## 🏗️ Architecture Decisions

### 1. **Touch-Action Strategy**
We'll implement `touch-action: pan-y` to:
- **Allow vertical scrolling**: Essential for long form content
- **Block horizontal movement**: Prevents unwanted sideways swiping
- **Maintain consistency**: Match PlayerOverlay implementation

### 2. **Implementation Approach**
- Single property addition to existing style object
- No structural changes to component
- Preserves all existing functionality
- Minimal risk of regression

### 3. **Consistency Principle**
- Match PlayerOverlay's `touch-action: pan-y` implementation
- Maintain uniform touch behavior across all bottom sheets/modals
- Follow established patterns in the codebase

## 📝 Implementation Plan

### **Single Step: Add Touch-Action Property (15 minutes)**
1. **Open `PlayerFormSheet.tsx`** - Navigate to `src/components/PlayerFormSheet.tsx`
2. **Locate sheet container** - Find main div with `position: 'fixed'` (lines 240-265)
3. **Add `touchAction: 'pan-y'`** - Insert after `overscrollBehavior: 'contain',`
4. **Verify syntax** - Ensure proper JSON formatting and trailing comma
5. **Test** - Verify no horizontal movement, vertical scrolling preserved

## 🔧 Files to Modify

### 1. `src/components/PlayerFormSheet.tsx` (Lines 240-265)
```diff
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
+ touchAction: 'pan-y', // <-- ADD THIS LINE
  // Tablet+: centred modal
  // (override via media query below)
}}
  className="player-sheet"
>
```

## 🧪 Testing Strategy

### **Test Cases**
1. **Horizontal Swipe Prevention**
   - Open PlayerFormSheet on touch device
   - Try to swipe left/right on the sheet
   - Expected: No horizontal movement occurs

2. **Vertical Scrolling Preservation**
   - Open PlayerFormSheet with long form content
   - Scroll up/down through the form
   - Expected: Smooth vertical scrolling works

3. **Form Interaction Integrity**
   - Tap all form inputs, buttons, selects
   - Expected: All elements respond normally
   - Expected: No visual or functional regressions

4. **Cross-Device Consistency**
   - Test on iPhone, Android, iPad
   - Expected: Consistent behavior across devices

### **Test Devices**
- iPhone 11 (iOS 14+)
- iPad (latest iOS)
- Android Chrome
- Desktop browsers (should be unaffected)

## ⚠️ Risk Assessment & Rollback Plan

### **Potential Risks**
1. **Over-restriction**: Might accidentally disable legitimate touch interactions
2. **Browser Compatibility**: Some older browsers may ignore `touch-action`
3. **Regression**: Could affect other touch behaviors unintentionally

### **Risk Mitigation**
1. **Targeted change**: Only affects PlayerFormSheet container
2. **Proven pattern**: Uses same `touch-action: pan-y` as PlayerOverlay (already working)
3. **Minimal scope**: Single property addition

### **Rollback Procedure**
If issues arise:
1. **Remove `touchAction: 'pan-y'`** from PlayerFormSheet.tsx
2. **All changes are isolated** and easily reversible

## 📊 Success Metrics
- ✅ No horizontal movement on PlayerFormSheet when swiped left/right
- ✅ Vertical scrolling preserved for form content
- ✅ All form inputs, buttons, and interactions work normally
- ✅ No visual changes to the sheet appearance
- ✅ Consistent with PlayerOverlay touch behavior
- ✅ No regression in existing functionality

## 🚀 Implementation Status
- [ ] Add `touch-action: pan-y` to PlayerFormSheet
- [ ] Test horizontal swipe prevention
- [ ] Test vertical scrolling preservation
- [ ] Test form interaction integrity
- [ ] Test cross-device consistency
- [ ] Mark as COMPLETED

---

*This spec follows the established ARM project specification format and addresses a specific touch interaction issue affecting the PlayerFormSheet component as part of the broader Phase 18 touch lockdown initiative.*