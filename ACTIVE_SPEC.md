# ACTIVE SPEC: Phase 15.2 — Availability Form Data Collection Mode

**Status:** Ready for Implementation  
**Target:** Enable manual data collection via availability form with master toggles  
**Priority:** High — Roster building enhancement  
**Context-Free:** ✅ All decisions locked below  
**Preserves All Features:** ✅ No existing functionality removed or broken

---

## 🎯 Why
To create a "Data Collection Mode" that allows coaches to harvest player contact information and birthdates through the existing availability form workflow. Coaches can turn these fields on for a few weeks to build out their roster database, then flip them off once information is collected.

---

## 🏗️ Architecture Decisions (Locked)

### Database Schema (Migration 017)
```sql
-- Add to club_settings
ALTER TABLE club_settings 
  ADD COLUMN IF NOT EXISTS require_contact_info BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_birthday BOOLEAN DEFAULT false;

-- Note: require_positions_in_form already exists from Migration 015
```

### TypeScript Interfaces (`src/lib/supabase.ts`)
```typescript
export interface ClubSettings {
  // ... existing fields
  require_positions_in_form?: boolean
  require_contact_info?: boolean      // NEW
  require_birthday?: boolean          // NEW
  training_days?: { id: string; label: string }[] | null
}
```

### Form State Expansion (`AvailabilityForm.tsx`)
```typescript
interface FormState {
  name: string
  phone: string
  email: string           // NEW
  birthday: string        // NEW (YYYY-MM-DD format)
  availability: Availability | ''
  primaryPosition: Position | ''
  secondaryPositions: Position[]
  availabilityNote: string
}

const EMPTY_FORM: FormState = {
  name: '',
  phone: '',
  email: '',              // NEW
  birthday: '',           // NEW
  availability: '',
  primaryPosition: '',
  secondaryPositions: [],
  availabilityNote: '',
}
```

### Conditional Field Logic
Simple "If/Then" based solely on club settings:
- If `require_contact_info` is true → Show Email and Phone inputs
- If `require_birthday` is true → Show Birthday date picker
- If `require_positions_in_form` is true → Show position fields (existing)

### Submission Logic
When player hits Submit:
1. **Primary Action**: Save availability status to `availability_responses` (unchanged)
2. **Secondary Action**: Update player's profile in `players` table with:
   - `email` (if provided and `require_contact_info` is true)
   - `phone` (already updates)
   - `date_of_birth` (if provided and `require_birthday` is true)

---

## 📁 Files to Touch (Exact Paths)

1. **`supabase/migrations/017_phase_15_2.sql`** — NEW
   - SQL from Architecture section
   - Include RLS policy updates if needed

2. **`src/lib/supabase.ts`** — UPDATE
   - Add `require_contact_info` and `require_birthday` to `ClubSettings` interface

3. **`src/pages/ClubSettings.tsx`** — UPDATE
   - Create "Availability Form" section after "Training Schedule"
   - Group three toggles under this header
   - Move existing "Ask for positions" toggle under this header
   - Add "Ask for Email and Phone" toggle
   - Add "Ask for Birthday" toggle

4. **`src/pages/AvailabilityForm.tsx`** — UPDATE
   - Add `email` and `birthday` to `FormState` interface
   - Update `EMPTY_FORM` with new fields
   - Add conditional rendering for email field (when `require_contact_info` is true)
   - Add date picker for birthday (when `require_birthday` is true)
   - Update validation to include email validation
   - Update submission logic to save email/birthday to player profile

---

## 🎨 UI Implementation (Tailwind Signatures)

### Club Settings Availability Form Section
- **Location**: After "Training Schedule" section in `ClubSettings.tsx`
- **Header**: `<h3 className="text-lg font-semibold text-gray-900 mb-3">Availability Form</h3>`
- **Container**: `space-y-4` for toggle items
- **Toggle Item**: Reuse existing toggle pattern from "Ask for positions"
- **Layout**: Three toggles stacked vertically with consistent spacing

### Availability Form Email Field
- **Condition**: Show when `clubSettings?.require_contact_info` is true
- **Input Type**: `type="email"`
- **Validation**: Basic email format (`@` and `.`)
- **Placeholder**: `"you@example.com"`
- **Auto-complete**: `autoComplete="email"`

### Availability Form Birthday Field
- **Condition**: Show when `clubSettings?.require_birthday` is true
- **Input Type**: `type="date"`
- **Format**: YYYY-MM-DD (native date picker)
- **Mobile UX**: Native date picker on iOS/Android
- **Validation**: Ensure valid date format

### Field Grouping in Availability Form
- **Contact Information Section**: When `require_contact_info` is true, group Email and Phone under subheading
- **Personal Details Section**: When `require_birthday` is true, show Birthday field
- **Visual Separation**: Use `mt-6` spacing between sections

---

## ✅ Acceptance Criteria (Binary Pass/Fail)

### Database Migration
- [ ] Migration 017 adds `require_contact_info` and `require_birthday` columns to `club_settings`
- [ ] Columns default to `false` for backward compatibility
- [ ] Existing data remains unchanged

### Club Settings UI
- [ ] "Availability Form" section visible after Training Schedule
- [ ] Three toggles grouped under this header:
  - "Ask for positions" (moved from previous location)
  - "Ask for Email and Phone" (new)
  - "Ask for Birthday" (new)
- [ ] Toggle states persist to `club_settings` table
- [ ] All three toggles work independently

### Availability Form Conditional Fields
- [ ] Email field appears only when `require_contact_info` is true
- [ ] Birthday date picker appears only when `require_birthday` is true
- [ ] Position fields appear only when `require_positions_in_form` is true (existing)
- [ ] Fields validate appropriately (email format, date format)

### Submission Logic
- [ ] Email saved to player profile when provided and `require_contact_info` is true
- [ ] Birthday saved to player profile when provided and `require_birthday` is true
- [ ] Phone continues to save as before (existing logic)
- [ ] Availability still saves to `availability_responses` (primary action)
- [ ] Player matching logic unchanged (phone → name → create new)

### Data Integrity
- [ ] Existing players updated with new email/birthday when provided
- [ ] New players created with email/birthday when provided
- [ ] Placeholder values used for missing required fields on new players
- [ ] No data loss when toggles are turned off

---

## ⚠️ Edge Cases (Already Handled)

### Empty Field Values
- When `require_contact_info` is false, email field hidden and not validated
- When `require_birthday` is false, birthday field hidden and not validated
- Form submission works with partial data collection

### Existing Player Updates
- Email updates only if new value provided (preserves existing email)
- Birthday updates only if new value provided (preserves existing birthday)
- Phone updates as before (normalized)

### New Player Creation
- Email set to empty string if not collected
- Birthday set to '2000-01-01' placeholder if not collected
- Phone set to normalized value or empty string

### Toggle State Changes
- Turning off `require_contact_info` hides email field in future forms
- Turning off `require_birthday` hides birthday field in future forms
- Historical submissions retain whatever data was collected at the time

### Mobile Date Picker
- iOS Safari shows native date picker for `type="date"`
- Android shows appropriate date picker
- Fallback to text input with validation if needed

---

## 🚀 Implementation Order

1. **Database Migration 017 & Types** — Foundation
   - Create `017_phase_15_2.sql`
   - Update `src/lib/supabase.ts` types

2. **Club Settings UI Grouping** — Configuration
   - Update `ClubSettings.tsx` with "Availability Form" section
   - Add new toggles and move existing position toggle

3. **Availability Form Field Expansion** — Core Feature
   - Update `FormState` interface in `AvailabilityForm.tsx`
   - Add conditional email field with validation
   - Add date picker for birthday

4. **Submission Logic Update** — Data Flow
   - Update player profile update logic
   - Handle email and birthday fields in submission

5. **Testing** — iOS Safari verification
   - Test all toggle combinations
   - Verify date picker works on iOS Safari
   - Test submission with various field combinations

---

## 📝 Quick Start Commands

```bash
# Create migration file
touch supabase/migrations/017_phase_15_2.sql

# Apply migration in Supabase SQL editor
# Copy content from migration file
```

**Deliverable:** Fully functional "Data Collection Mode" with three master toggles in Club Settings, conditional fields in Availability Form, and automatic player profile updates, working on iOS Safari.

---

## 🔄 Data Flow Summary

1. **Coach**: Turns on toggles in Club Settings
2. **Player**: Opens availability form, sees additional fields
3. **Form**: Validates and submits data
4. **System**: 
   - Saves availability to `availability_responses`
   - Updates player profile with collected data
5. **Result**: Roster database gradually populated through normal availability workflow

**The Result**: Manual "Data Collection Mode" that can be turned on for a few weeks to harvest info from everyone, then flipped off once roster is fully built out.