# PERFECT CLAUDE CODE PROMPT TEMPLATE
## Based on `.clinerules` for ARM Project Tech Lead/Developer Workflow

---

## 🎯 WHEN TO USE THIS TEMPLATE
Use this template **every time** you need to create an `ACTIVE_SPEC.md` for Claude (the Developer). This ensures consistency, clarity, and zero ambiguity.

---

## 📋 TEMPLATE STRUCTURE (Copy and Fill)

```markdown
# ACTIVE SPEC: Phase [X.Y] — [Brief Descriptive Title]

## Overview
**Phase:** [X.Y] — [Category: Polish & Performance / New Feature / Bug Fix]  
**Priority:** [High / Medium / Low]  
**Target:** [1-2 sentence summary of what this phase accomplishes]  
**Status:** Ready for Implementation  
**Previous Phase:** [X.Y-1] ([Previous Phase Title])

## 🎯 Why (1‑2 sentences)
[Explain the user need or problem being solved. Keep it concise and focused.]

## 🏗️ Architecture Decisions (Locked)
[Bullet points of irreversible technical decisions. Developer MUST implement exactly as specified.]

1. **Decision 1:** [Specific technical choice with rationale]
2. **Decision 2:** [Another locked decision]
3. **Decision 3:** [Database, UI, or logic decision]

## 📁 Files to Touch (Exact paths + what to do)
[List every file that needs modification. Be specific about what changes are needed.]

### 1. `path/to/file.tsx`
- [Specific action 1]
- [Specific action 2]
- [Specific action 3]

### 2. `path/to/another/file.ts`
- [Specific action 1]
- [Specific action 2]

## 🎨 UI Implementation (Exact Tailwind/JSX - copy-paste ready)
[Provide EXACT code snippets that Developer can copy-paste. Include:
- Complete function implementations
- Exact Tailwind CSS classes
- Proper TypeScript types
- No placeholders like "..." or "[fill this in]"]

### 1. `ComponentName.tsx` Updates
```typescript
// EXACT code to copy-paste
// Include imports if needed
// Show before/after if helpful
```

### 2. `AnotherComponent.tsx` Updates
```jsx
// EXACT JSX with Tailwind classes
// Use design tokens from architecture.md
```

## ✅ Acceptance Criteria (Checklist format, binary pass/fail)
[Binary yes/no criteria. Developer should be able to check each box when done.]

### Feature Category 1
- [ ] [Specific, testable requirement 1]
- [ ] [Specific, testable requirement 2]
- [ ] [Specific, testable requirement 3]

### Feature Category 2
- [ ] [Specific, testable requirement 1]
- [ ] [Specific, testable requirement 2]

## ⚠️ Edge Cases (Already Handled)
[List edge cases that the implementation must handle. Show they're already accounted for.]

1. **Edge Case 1:** [Description of edge case and how it's handled]
2. **Edge Case 2:** [Another edge case with solution]
3. **Edge Case 3:** [Mobile/desktop/browser-specific consideration]

## 🚀 Implementation Order (Step-by-Step)
[Recommended order for Developer to follow. Use bash-style comments.]

### Step 1: [First logical step]
```bash
# 1. [Specific action]
# 2. [Specific action]
# 3. [Specific action]
```

### Step 2: [Second logical step]
```bash
# 1. [Specific action]
# 2. [Specific action]
```

## 📝 Notes for Tech Lead (Not for Developer)
- **Reference Documents:** [List relevant docs like `/.docs/architecture.md`, `/.docs/ARM-TRACKER.md`]
- **Database Impact:** [Note if migration needed or schema changes]
- **Mobile Testing:** [Any mobile-specific testing requirements]
- **Session Log Entry:** [What to log in SESSION_LOG.md]

## 🚨 Post-Implementation Documentation (Tech Lead Responsibility)
After Developer completes implementation, Tech Lead MUST:

1. **Update `/.docs/SESSION_LOG.md`** with new entry using exact format
2. **Update `/.docs/ARM-TRACKER.md`** - move task to "Done" section  
3. **Update `/.docs/architecture.md`** with any new UI patterns if established
4. **Update `/.docs/database_schema.md`** with any database changes
5. **Move this `ACTIVE_SPEC.md` to `/.docs/phase-specs/`** as `[X.Y]_[Task_Name]_COMPLETED_SPEC.md`
```

---

## 🎯 CRITICAL RULES FROM `.CLINERULES`

### 1. **Tech Lead vs Developer Roles**
- **Tech Lead (You):** Architect, spec writer, documentation guardian. NO CODE.
- **Developer (Claude):** Senior Frontend Developer. Executes specs exactly.

### 2. **Spec Creation Rules**
- **Keep under 500 words** but prioritize clarity over brevity
- **Make specs self-contained:** Claude should not need to read other docs
- **Front-load decisions:** Architectural choices must be locked upfront
- **Use emoji sections** for scannability (🎯 🏗️ 📁 🎨 ✅ ⚠️ 🚀)

### 3. **UX Guardianship**
- **NEVER** tell Developer to "match the existing style"
- **ALWAYS** extract exact Tailwind classes from `architecture.md`
- **WRITE THEM DIRECTLY** into spec as copy-paste code snippets

### 4. **Claude Optimization**
- Provide **exact code snippets** for complex logic
- Create **binary acceptance criteria** (checkboxes)
- Ensure **zero ambiguity** - Developer should not need clarification questions

### 5. **Implementation Protocol**
1. **Spec complete** before Developer begins
2. **All decisions locked** in Architecture Decisions section
3. Developer executes exactly as specified
4. **Tech Lead reviews** against acceptance criteria

---

## 📝 EXAMPLE USAGE

### Before (Bad):
"Update the roster page to show player stats better."

### After (Good - using template):
```markdown
# ACTIVE SPEC: Phase 14.5 — Export UX, Career Stats & Lightweight Polish

## Overview
**Phase:** 14.5 — Polish & Performance  
**Priority:** High  
**Target:** Close out Phase 14 by realigning Kicking % to career Roster view, fixing PDF export to respect custom squad sizes, adding clean WhatsApp text export, and introducing fast, lightweight UX polish.  
**Status:** Ready for Implementation  
**Previous Phase:** 14.4 (Club Settings Expansion & Critical Bug Fixes)

## 🎯 Why (1‑2 sentences)
To close out Phase 14 by realigning the Kicking % to the career Roster view, fixing the PDF export to respect custom squad sizes, adding a clean WhatsApp text export, and introducing fast, lightweight UX polish.

## 🏗️ Architecture Decisions (Locked)
1. **Career Stats:** Kicking % logic is removed from `PlayerOverlay.tsx` and moved entirely to `PlayerFormSheet.tsx` (Roster).
2. **PDF Fix:** The PDF logic (`SelectionBoard.tsx`) must dynamically read `clubSettings?.default_squad_size ?? 23` to generate correct rows.
3. **WhatsApp Export:** New copy button generates clipboard string formatted as `Number. Full Name` (no positions, no emojis).
4. **Lightweight Toast:** Simple local state `showToast` shows "Copied to clipboard" pill for 2.5 seconds.
5. **UX Empty States:** Roster page gets empty state with CTA button; Weeks page gets text empty state.

[Continue with full template...]
```

---

## ✅ QUALITY CHECKLIST (Before Handing to Developer)

- [ ] **Word Count:** Under 500 words (prioritize clarity)
- [ ] **Architecture Decisions:** All technical choices locked upfront
- [ ] **Files to Touch:** Every file listed with specific actions
- [ ] **UI Implementation:** Exact copy-paste code provided
- [ ] **Acceptance Criteria:** Binary checkboxes, testable requirements
- [ ] **Edge Cases:** All handled and documented
- [ ] **Implementation Order:** Logical step-by-step guide
- [ ] **Self-Contained:** Claude doesn't need other docs
- [ ] **Zero Ambiguity:** No "figure it out" or "match existing style"
- [ ] **Emoji Sections:** Used for scannability (🎯 🏗️ 📁 🎨 ✅ ⚠️ 🚀)

---

## 🚀 QUICK START COMMANDS FOR DEVELOPER

```bash
# Developer should use these to verify implementation
npm run dev          # Start development server
npm run type-check   # Verify TypeScript compilation
# Test on mobile viewport (Chrome DevTools)
# Test PDF export functionality
# Verify clipboard API works
```

---

**Remember:** The better the spec, the faster and more accurate the implementation. Invest time in writing perfect specs to save time on corrections and clarifications.