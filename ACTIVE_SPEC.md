# ACTIVE_SPEC: Phase 19.2 — Availability Form Profile Update (Phone Sync for Onboarding)

## 📋 Metadata
- **Status**: ACTIVE
- **Priority**: Medium (Data Integrity / Player Profile Accuracy)
- **Phase**: 19.2
- **Estimated Effort**: 1-2 hours
- **Dependencies**: None
- **Related Specs**: 15.2 (Availability Form Data Collection Mode), 19.0 (Player Merge)
- **Target Users**: Players submitting availability forms, Coaches managing rosters
- **Implementation Date**: Pending

## 🎯 Why This Matters
When players submit the public availability form, the system attempts to match them to an existing player record and update their profile data. However, there are gaps in what gets updated:

1. **Phone numbers are never updated** — If a player gets a new phone and submits the form with their name + new number, the name match finds them, but their phone record stays as the old number. This creates a mismatch where the next submission with the new phone won't match by phone (since the DB still has the old number), forcing a name-only lookup every time.

2. **Birthday is unconditionally overwritten** — If a player fat-fingers their birthday on one submission, it permanently overwrites whatever was stored before. There's no guard like "only update if empty or default."

This spec addresses both issues to ensure player profile data stays accurate and consistent.

## 🧠 Current State Analysis

### 1. The Matching Flow (src/pages/AvailabilityForm.tsx, lines 159-184)

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Phone Match (exact match on normalised phone)      │
│  └─ If found → playerId = matched player                    │
│                                                             │
│  Step 2: Name Match (case-insensitive ilike, fallback)      │
│  └─ If phone didn't match → try name match                  │
│                                                             │
│  Step 3: Auto-create (if neither matched)                   │
│  └─ Creates new player with all form data                   │
└─────────────────────────────────────────────────────────────┘
```

### 2. Current Profile Update Logic (lines 212-223)

```typescript
if (!isNewPlayer) {
  const profileUpdate: Record<string, unknown> = {}
  if (requireContactInfo && form.email) profileUpdate.email = form.email
  if (requireBirthday && form.birthday) profileUpdate.date_of_birth = form.birthday
  // ⚠️ phone is NOT included here
  if (Object.keys(profileUpdate).length > 0) {
    await supabase.from('players').update({ ...profileUpdate, club_id: week.club_id })
      .eq('id', playerId).eq('club_id', week.club_id)
  }
}
```

### 3. What Gets Updated vs What Doesn't

| Field | Updated on existing player? | Condition |
|-------|---------------------------|-----------|
| **Phone** | ❌ Never | Only set on initial creation |
| **Email** | ✅ Yes | If `require_contact_info` is enabled AND email is provided |
| **Birthday** | ✅ Yes (unconditional overwrite) | If `require_birthday` is enabled AND birthday is provided |
| **Primary Position** | ✅ Yes | If player selected "Available" AND provided a position |
| **Secondary Positions** | ✅ Yes | If player selected "Available" AND provided positions |

### 4. The Phone Update Gap — Detailed Scenario

**Scenario: Player gets a new phone number**

| Step | What happens currently |
|------|----------------------|
| 1. Player submits with **new phone** + their name | Phone match fails (no one has new number). Name match succeeds. |
| 2. Profile update runs | Phone is **NOT updated** — player's record still has old number |
| 3. Player submits again with new phone | Phone match **still fails** (DB has old number). Name match succeeds again. |
| 4. Perpetual state | Phone match never works for this player until a coach manually updates it |

**The fix:** Add phone to the profile update block so it gets updated when the player is found by name match.

### 5. The Birthday Overwrite Issue — Detailed Scenario

**Scenario: Player accidentally enters wrong birthday**

| Step | What happens currently |
|------|----------------------|
| 1. Player has correct birthday "1990-05-15" in DB | — |
| 2. Player submits form, accidentally enters "2000-01-01" | Birthday is **unconditionally overwritten** to "2000-01-01" |
| 3. Player's correct birthday is lost | No recovery unless coach manually fixes it |

**The fix:** Only update birthday if the player's current `date_of_birth` is the default value (`2000-01-01`) or empty. This prevents accidental overwrites while still allowing the form to fill in missing data.

## 🏗️ Architecture Decisions

### 1. **Phone Number Update — Simple Addition**
Add `phone` to the existing `profileUpdate` object in the existing player update block. No new database changes needed — the `phone` column already exists on the `players` table.

**Why this is safe:**
- If player was found by **phone match** (same number), the update is a no-op (same value)
- If player was found by **name match** (new number), the phone gets updated to the new number
- If player is **new** (auto-created), phone is already set during creation (line 193)
- No uniqueness constraint on phone, so no collision issues

### 2. **Birthday Update — Conditional Guard**
Add a check before updating `date_of_birth` to only overwrite if the current value is the default placeholder (`2000-01-01`).

**Why this approach:**
- Preserves manually-set birthdays from coaches
- Still fills in missing birthdays from the form
- Prevents accidental overwrites from fat-finger submissions
- Simple to implement — no new database fields or migrations needed

### 3. **No Database Changes Required**
Both fixes are purely frontend logic changes in `src/pages/AvailabilityForm.tsx`. The `phone` and `date_of_birth` columns already exist on the `players` table.

## 📁 Files to Modify

### 1. Modified Files
- `src/pages/AvailabilityForm.tsx` — Update the existing player profile update block (lines 212-223)

## 🎨 Logic Implementation

### 1. Phone Update — Add to Profile Update Block

**Current code (lines 212-223):**
```typescript
if (!isNewPlayer) {
  const profileUpdate: Record<string, unknown> = {}
  if (requireContactInfo && form.email) profileUpdate.email = form.email
  if (requireBirthday && form.birthday) profileUpdate.date_of_birth = form.birthday
  if (Object.keys(profileUpdate).length > 0) {
    await supabase
      .from('players')
      .update({ ...profileUpdate, club_id: week.club_id })
      .eq('id', playerId)
      .eq('club_id', week.club_id)
  }
}
```

**Proposed code:**
```typescript
if (!isNewPlayer) {
  const profileUpdate: Record<string, unknown> = {}
  if (requireContactInfo && form.email) profileUpdate.email = form.email
  if (requireBirthday && form.birthday) profileUpdate.date_of_birth = form.birthday
  if (normPhone) profileUpdate.phone = normPhone  // ← NEW: always update phone
  if (Object.keys(profileUpdate).length > 0) {
    await supabase
      .from('players')
      .update({ ...profileUpdate, club_id: week.club_id })
      .eq('id', playerId)
      .eq('club_id', week.club_id)
  }
}
```

**Note:** `normPhone` is already computed at line 155 (`const normPhone = normalisePhone(form.phone)`), so no additional variable declarations are needed.

### 2. Birthday Update — Add Conditional Guard

**Current code (line 215):**
```typescript
if (requireBirthday && form.birthday) profileUpdate.date_of_birth = form.birthday
```

**Proposed code:**
```typescript
if (requireBirthday && form.birthday) {
  // Only update birthday if player doesn't already have a real one set
  // Fetch current player data to check
  const { data: currentPlayer } = await supabase
    .from('players')
    .select('date_of_birth')
    .eq('id', playerId)
    .single()
  
  const defaultBirthday = '2000-01-01'
  if (!currentPlayer?.date_of_birth || currentPlayer.date_of_birth === defaultBirthday) {
    profileUpdate.date_of_birth = form.birthday
  }
}
```

**Alternative approach (simpler, no extra query):**
```typescript
if (requireBirthday && form.birthday) {
  // Always pass birthday to update — the conditional logic is handled
  // by fetching current value first (see full implementation below)
  profileUpdate.date_of_birth = form.birthday
}
```

**Recommended approach — batch the fetch with the existing match query:**

Instead of making a separate query for the birthday check, we can modify the existing match queries to also fetch `date_of_birth`. This is more efficient.

**Option A — Modify the name match query to include date_of_birth:**
```typescript
// Line 178 — expand the select
const { data: byName } = await supabase
  .from('players')
  .select('id, name, date_of_birth')  // ← added date_of_birth
  .ilike('name', form.name.trim())
  .limit(1)
  .single()
```

Then in the profile update block:
```typescript
if (requireBirthday && form.birthday) {
  const defaultBirthday = '2000-01-01'
  const currentDob = byName?.date_of_birth || byPhone?.date_of_birth
  if (!currentDob || currentDob === defaultBirthday) {
    profileUpdate.date_of_birth = form.birthday
  }
}
```

**Option B — Simpler, just always update (current behavior but document the risk):**
Keep the current unconditional update, but add a comment documenting the behavior. This is the simplest approach but doesn't fix the fat-finger problem.

**Recommendation: Option A** — It's clean, avoids an extra query, and properly guards against accidental overwrites.

### 3. Full Updated Profile Update Block

```typescript
// 2c. Update existing player profile with collected contact/birthday/phone data
if (!isNewPlayer) {
  const profileUpdate: Record<string, unknown> = {}
  
  // Email — only if club requires contact info
  if (requireContactInfo && form.email) profileUpdate.email = form.email
  
  // Birthday — only overwrite if player doesn't already have a real birthday
  // (prevents fat-finger overwrites of manually-set birthdays)
  if (requireBirthday && form.birthday) {
    const defaultBirthday = '2000-01-01'
    const currentDob = byName?.date_of_birth || byPhone?.date_of_birth
    if (!currentDob || currentDob === defaultBirthday) {
      profileUpdate.date_of_birth = form.birthday
    }
  }
  
  // Phone — always update so the player's number stays current
  // This ensures future submissions can match by phone
  if (normPhone) profileUpdate.phone = normPhone
  
  if (Object.keys(profileUpdate).length > 0) {
    await supabase
      .from('players')
      .update({ ...profileUpdate, club_id: week.club_id })
      .eq('id', playerId)
      .eq('club_id', week.club_id)
  }
}
```

## ✅ Acceptance Criteria

### Phone Update
- [ ] Existing player found by **name match** gets their phone updated to the new number
- [ ] Existing player found by **phone match** (same number) — no-op, no error
- [ ] New player (auto-created) — phone is set during creation as before
- [ ] Subsequent submissions with the same new phone now match by phone (not just name)

### Birthday Update (Conditional Guard)
- [ ] Player with **default birthday** (`2000-01-01`) gets it updated when they submit a real birthday
- [ ] Player with a **real birthday already set** does NOT get it overwritten by a form submission
- [ ] Player with **no birthday** (null/empty) gets it filled in from the form
- [ ] Club setting `require_birthday = false` — no birthday updates happen (existing behavior)

### General
- [ ] No regressions in existing form submission flow
- [ ] All existing validation still works (name required, availability required, etc.)
- [ ] Position sync still works (only on "Available" submissions)
- [ ] Availability response insertion still works

## 🚨 Edge Cases & Error Handling

1. **Player enters empty phone**: `normPhone` will be empty string, so `if (normPhone)` guard prevents updating phone to empty
2. **Player enters same phone**: Update is a no-op — same value written to same field
3. **Phone match finds wrong player** (e.g., shared phone): This is an existing issue with the phone-match-first approach, not introduced by this change
4. **Birthday guard with `byName`/`byPhone` null**: The optional chaining (`?.`) handles this safely — if neither match variable has `date_of_birth`, the guard treats it as "no existing birthday" and allows the update
5. **Club_id mismatch**: The existing `.eq('club_id', week.club_id)` filter already prevents cross-club updates

## 📊 Success Metrics
- **Phone match rate increases** over time as player phone numbers stay current
- **Zero instances** of coach-reported "wrong birthday" from form submissions
- **Player profile accuracy** improves as contact data stays in sync

## 🔄 Rollback Plan
If issues arise:
1. **Revert the code change**: Restore the original profile update block in `AvailabilityForm.tsx`
2. **No database changes** to roll back — this is purely a frontend logic change

---

**Ready for Implementation**: This spec provides complete technical requirements for fixing the phone update gap and adding a birthday overwrite guard in the availability form submission flow. Both changes are contained to a single file with no database migrations needed.

**Next Step**: Toggle to Act mode to begin implementation.
