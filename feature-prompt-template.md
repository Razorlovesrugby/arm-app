# ARM Feature Prompt Template (Clinerules Compliant)

**Use this template to generate feature specifications that follow the strict Tech Lead/Developer workflow defined in `.clinerules`.**

## When to Use This Template
- For any new feature or significant enhancement
- When you need to create an `ACTIVE_SPEC.md` for the Developer (Claude)
- Before handing any task to the Developer for implementation

## How to Use This Template
1. Fill in all bracketed `[ ]` sections with specific details
2. Keep the total spec under 500 words (prioritize clarity over brevity)
3. Ensure all architectural decisions are locked upfront
4. Provide exact code snippets for UI implementation
5. Make the spec self-contained - Developer should not need to read other docs

---

## 🎯 Why (1-2 sentences)
[Explain why this feature matters to the coach/user. What problem does it solve? What value does it deliver?]

Example: "Apple & Android Home Screen Logos ensure the app looks professional when installed on mobile devices, increasing engagement and making it easier for coaches to access the app quickly from their home screen."

## 🏗️ Architecture Decisions (Locked)
[Bullet points listing all architectural choices that are final and cannot be changed by Developer]

1. **[Decision 1]** - e.g., "Use existing `public/icons/` directory structure"
2. **[Decision 2]** - e.g., "Follow PWA icon standards with multiple sizes"
3. **[Decision 3]** - e.g., "Use `maskable` icon format for Android adaptive icons"
4. **[Decision 4]** - e.g., "Primary color: `#6B21A8` (from architecture.md)"
5. **[Decision 5]** - e.g., "No changes to existing authentication or data flow"

## 📁 Files to Touch (Exact paths + what to do)
[List every file that needs to be created, modified, or referenced]

### New Files:
1. **`[path/to/new/file]`** - [Brief description of what this file does]

### Updated Files:
2. **`[path/to/existing/file]`** - [What changes need to be made]
3. **`[path/to/another/file]`** - [What changes need to be made]

### Integration Points:
4. **`[hook/component/context]`** - [How it integrates with existing code]

## 🎨 UI Implementation (Exact Tailwind/JSX - copy-paste ready)
[Provide complete, copy-paste-ready code snippets. Extract exact Tailwind classes from architecture.md. Never say "match existing style".]

```tsx
// Example component implementation
export function [ComponentName]() {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Feature Title
      </h2>
      <p className="text-gray-600">
        Feature description goes here.
      </p>
    </div>
  )
}
```

## ✅ Acceptance Criteria (Checklist format, binary pass/fail)
[Binary criteria that must all pass. Write as testable statements.]

### Core Functionality
- [ ] [Criterion 1 - e.g., "Icon displays correctly on iOS home screen"]
- [ ] [Criterion 2 - e.g., "Icon displays correctly on Android home screen"]
- [ ] [Criterion 3 - e.g., "App name appears below icon without truncation"]

### Integration
- [ ] [Criterion 4 - e.g., "PWA manifest includes all required icon sizes"]
- [ ] [Criterion 5 - e.g., "No console errors during installation"]

### Edge Cases
- [ ] [Criterion 6 - e.g., "Works on both light and dark mode system themes"]
- [ ] [Criterion 7 - e.g., "Fallback to default icon if custom icon fails"]

## ⚠️ Edge Cases (Already Handled)
[List edge cases that are explicitly handled in the design]

1. **[Edge Case 1]** - e.g., "Users with old iOS versions get fallback icon"
2. **[Edge Case 2]** - e.g., "Android devices with custom launchers display correctly"
3. **[Edge Case 3]** - e.g., "Browser cache cleared after icon update"

## 🚀 Implementation Order (Step-by-Step)
[Step-by-step instructions for Developer to follow]

### Step 1: [First action]
```bash
[Command or action to take]
```

### Step 2: [Second action]
```bash
[Command or action to take]
```

### Step 3: [Third action]
```bash
[Command or action to take]
```

### Step 4: [Integration]
[Description of how to integrate with existing code]

### Step 5: [Testing]
[Description of testing requirements]

---

## 📝 Notes for Tech Lead (Not for Developer)
- **Reference Documents:** [List which docs to read before creating spec, e.g., `/.docs/ARM-TRACKER.md`, `/.docs/architecture.md`]
- **UX Consistency:** [Note any UX patterns to follow from architecture.md]
- **Database Impact:** [Note if database changes are needed]
- **Session Log Entry:** [Reminder to update SESSION_LOG.md after completion]

## 🚨 Post-Implementation Documentation (Tech Lead Responsibility)
After Developer completes implementation, Tech Lead MUST:

1. **Update `/.docs/SESSION_LOG.md`** with new entry using exact format
2. **Update `/.docs/ARM-TRACKER.md`** - move task to "Done" section
3. **Update `/.docs/architecture.md`** if new UI components or colors added
4. **Update `/.docs/database_schema.md`** if database changes made
5. **Move `ACTIVE_SPEC.md` to `/.docs/phase-specs/`** as `[TaskName]_COMPLETED_SPEC.md`

---

## Example Filled Template for "Apple & Android Home Screen Logos"

### 🎯 Why
Professional home screen logos increase app engagement and make it easier for coaches to access ARM quickly from their mobile devices.

### 🏗️ Architecture Decisions (Locked)
1. Use existing `public/icons/` directory structure
2. Follow PWA icon standards with 192x192, 512x512, and maskable formats
3. Primary color: `#6B21A8` (from architecture.md)
4. Club logo from `public/icons/Logo.png` as source
5. No changes to authentication or existing functionality

### 📁 Files to Touch
1. **`public/icons/icon-192.png`** - Create 192x192 icon
2. **`public/icons/icon-512.png`** - Create 512x512 icon  
3. **`public/icons/icon-maskable.png`** - Create maskable icon for Android
4. **`public/manifest.json`** - Update icon references
5. **`src/components/InstallPrompt.tsx`** - Ensure proper PWA installation

### 🎨 UI Implementation
```json
// public/manifest.json updates
{
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### ✅ Acceptance Criteria
- [ ] Icon displays on iOS home screen with proper sizing
- [ ] Icon displays on Android home screen with adaptive icon support
- [ ] App name appears below icon without truncation
- [ ] PWA manifest includes all required icon sizes
- [ ] No console errors during PWA installation

### ⚠️ Edge Cases (Already Handled)
1. Old iOS versions get fallback icon
2. Android custom launchers display correctly
3. Browser cache cleared after icon update

### 🚀 Implementation Order
1. Generate icon assets in required sizes
2. Update manifest.json with new icon references
3. Test PWA installation on iOS and Android
4. Verify icon appearance in different themes