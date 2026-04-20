# ACTIVE_SPEC: Phase 18.0 — Touch Zoom & Movement Lockdown for Native PWA Experience

## 📋 Metadata
- **Status**: ACTIVE  
- **Priority**: High (User Experience / Native App Feel)
- **Phase**: 18.0
- **Estimated Effort**: 1-2 hours
- **Dependencies**: None
- **Related Specs**: 14.1 (Native App Shell Layout), 16.5 (Logo Consistency & iOS Home Screen)
- **Target Devices**: iPhone 11 and newer, modern Android devices
- **Browser Support**: iOS Safari 12+, Chrome for Android, Safari for iPad
- **Implementation Date**: Pending

## 🎯 Why This Matters
When users interact with the ARM PWA on touch devices, they expect:
- **No accidental zooming** from pinch gestures
- **No unwanted panning/scrolling** on fixed overlays (like Player Overlay)
- **Consistent native app behavior** across all screens
- **Professional, polished touch interactions**

Currently, users can pinch-to-zoom on any screen and may experience unwanted movement on overlays, breaking the native app illusion we've worked hard to create.

## 🧠 Current State Analysis

### 1. Viewport Configuration (`index.html`)
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```
- **Issue**: Missing `user-scalable=no` and `maximum-scale=1.0` parameters
- **Impact**: Allows pinch-to-zoom on iOS and Android

### 2. CSS Touch Controls
- **Current**: No global touch-action restrictions
- **Impact**: Browser default touch behaviors apply (zoom, pan)

### 3. Player Overlay & Modal Screens
- **Observation**: Users can "move around certain screens like the player overlay"
- **Root Cause**: Missing `touch-action: none` or `overflow: hidden` on overlay containers
- **Impact**: Users can drag/scroll content that should be fixed

### 4. iOS Auto-Zoom Prevention
- **Found in `AvailabilityForm.tsx`**:
  ```typescript
  fontSize: '16px', // 16px prevents iOS auto-zoom
  ```
- **Good Practice**: This should be extended to all form inputs

## 🏗️ Architecture Decisions

### 1. **Multi-Layer Defense Strategy**
We'll implement three complementary layers for maximum compatibility:

#### **Layer 1: HTML Meta Tag (Primary Defense)**
Update viewport meta tag to explicitly disable scaling:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

#### **Layer 2: CSS Touch-Action (Modern Standard)**
Add global CSS to restrict touch behaviors:
```css
html, body {
  touch-action: pan-x pan-y;
  -ms-touch-action: pan-x pan-y;
}

/* Prevent zoom on specific interactive elements */
input, textarea, select {
  touch-action: manipulation;
}
```

#### **Layer 3: Critical Screen Lockdown**
Add specific rules for overlays and modals:
```css
/* Player overlay and other modal containers */
.fixed-overlay, .modal-container, [data-prevent-touch-move] {
  touch-action: none;
  overscroll-behavior: contain;
}
```

### 2. **iOS-Specific Considerations**
- iPhone 11 (iOS 14+) has good support for `touch-action`
- `user-scalable=no` still works but is deprecated - we'll use it as fallback
- Maintain `font-size: 16px` on all form inputs to prevent auto-zoom

### 3. **Backward Compatibility**
- Keep existing `viewport-fit=cover` for notch support
- Use vendor prefixes where needed
- Test on actual iPhone 11 (or simulator)

## 📝 Implementation Plan

### **Phase 1: Core Viewport & CSS Updates (30 minutes)**
1. **Update `index.html`** - Modify viewport meta tag
2. **Create/Update Global CSS** - Add touch-action rules to `src/index.css`
3. **Verify iOS Form Inputs** - Ensure all inputs have minimum 16px font size

### **Phase 2: Screen-Specific Fixes (45 minutes)**
1. **Identify Problem Screens** - Player overlay and other movable screens
2. **Add CSS Classes** - Apply `touch-action: none` to overlay containers
3. **Test Touch Interactions** - Verify no unwanted movement remains

### **Phase 3: Testing & Validation (30 minutes)**
1. **Device Testing** - Test on iPhone 11 simulator/device
2. **Browser Testing** - Safari, Chrome, Firefox
3. **Interaction Testing** - Verify normal scrolling still works where needed

## 🔧 Files to Modify

### 1. `index.html` (Line 5)
```diff
- <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
+ <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

### 2. `src/index.css` (Add to end of file)
```css
/* Touch behavior control */
html, body {
  touch-action: pan-x pan-y;
  -ms-touch-action: pan-x pan-y;
}

/* Prevent zoom on form elements */
input, textarea, select {
  touch-action: manipulation;
  font-size: 16px !important; /* Prevent iOS auto-zoom */
}

/* Lock overlays and modals in place */
.fixed-overlay, .modal-container, [data-prevent-touch-move] {
  touch-action: none;
  overscroll-behavior: contain;
}
```

### 3. **Player Overlay Component** (`src/components/PlayerOverlay.tsx`)
Add CSS class or data attribute to root container:
```tsx
// Add className or data attribute to prevent touch movement
<div className="fixed-overlay" data-prevent-touch-move>
  {/* Existing overlay content */}
</div>
```

## 🧪 Testing Strategy

### **Test Cases**
1. **Pinch-to-Zoom Prevention**
   - Try to zoom on any screen using two-finger pinch
   - Expected: No zoom occurs

2. **Overlay Movement Prevention**
   - Open Player Overlay
   - Try to drag/swipe the overlay content
   - Expected: Overlay stays fixed, no movement

3. **Normal Scrolling Preservation**
   - Scroll through player lists, roster, etc.
   - Expected: Normal vertical scrolling works

4. **Form Input Accessibility**
   - Tap on form fields
   - Expected: No iOS auto-zoom, keyboard appears normally

### **Test Devices**
- iPhone 11 (iOS 14+)
- iPad (latest iOS)
- Android Chrome
- Desktop browsers (should be unaffected)

## ⚠️ Risk Assessment & Rollback Plan

### **Potential Risks**
1. **Over-restriction**: Might accidentally disable legitimate scrolling
2. **Browser Compatibility**: Some older browsers may ignore `touch-action`
3. **Accessibility**: Must ensure zoom accessibility features still work via browser menus

### **Rollback Procedure**
If issues arise:
1. **Revert `index.html`** to original viewport tag
2. **Remove CSS additions** from `index.css`
3. **Remove overlay classes** from components
4. **All changes are isolated** and easily reversible

## 📊 Success Metrics
- ✅ No pinch-to-zoom on any screen
- ✅ Player overlay and modals don't move when touched
- ✅ Normal scrolling still works everywhere else
- ✅ Form inputs work without iOS auto-zoom
- ✅ No regression in existing functionality

## 🚀 Implementation Status
- [ ] Phase 1: Core Viewport & CSS Updates
- [ ] Phase 2: Screen-Specific Fixes  
- [ ] Phase 3: Testing & Validation
- [ ] Mark as COMPLETED

---
*This spec follows the established ARM project specification format and addresses a critical user experience issue affecting the native PWA feel on touch devices.*