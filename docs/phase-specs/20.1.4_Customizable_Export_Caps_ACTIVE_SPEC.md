# 🎯 ACTIVE_SPEC: 20.1.4 — Customizable Export Caps Setting

## 📋 Metadata
- **Status**: ACTIVE
- **Priority**: Medium (UX Polish)
- **Phase**: 20.1.4
- **Estimated Effort**: 30 minutes
- **Dependencies**: Phase 19.3 (Export Functions Include Player Caps) — already COMPLETED
- **Related Specs**: 19.3 (caps on exports), 14.4 (Club Settings expansion)
- **Target Users**: Coaches / Club Admins

---

## 🎯 Why

Phase 19.3 hardcoded player caps (`(91)`) onto both the WhatsApp Copy Text and PDF Export. User feedback confirms this needs to be optional — casual teams (e.g., 3rd XV) don't want caps cluttering their WhatsApp messages. We are adding a new boolean toggle `show_caps_on_exports` to `ClubSettings` so each club can opt-in or opt-out.

---

## 🏗️ Architecture Decisions (Locked)

1. **Database column**: `club_settings.show_caps_on_exports boolean DEFAULT true`
   - **`DEFAULT true`** preserves existing behavior for all clubs (non-breaking). Clubs that don't want caps toggle OFF.
2. **ClubSettings TypeScript interface**: Add `show_caps_on_exports?: boolean` field
3. **ClubSettings UI**: New toggle under the "Availability Form" section, alongside the existing toggles
4. **WhatsApp export**: Modify the existing `formatPlayerLine` helper in `SelectionBoard.tsx` to conditionally append caps
5. **PDF export**: Add `showCaps` prop to `TeamSheetPDFProps`, flow it through `PDFDownloadButton` → `TeamSheetPDF`
6. **No new imports needed**: `useClubSettings` is already imported in `SelectionBoard.tsx` (line 34)

---

## 📁 Files to Modify (in order)

### File 1: `supabase/migrations/035_add_show_caps_setting.sql` — **CREATE NEW FILE**

```sql
ALTER TABLE public.club_settings 
ADD COLUMN show_caps_on_exports boolean DEFAULT true;
```

### File 2: `src/lib/supabase.ts` — Add field to `ClubSettings` interface

**Target:** The `ClubSettings` interface (lines 192-208).

**Action:** Add `show_caps_on_exports?: boolean` to the interface.

**Exact change — add this line after line 205 (`require_birthday?: boolean`):**
```typescript
  show_caps_on_exports?: boolean
```

### File 3: `src/pages/ClubSettings.tsx` — Add toggle + state

**Target 1 — State variable (after line 23, `const [requireBirthday, setRequireBirthday] = useState(false)`):**
```typescript
const [showCapsOnExports, setShowCapsOnExports] = useState(true)
```

**Target 2 — Sync from loaded settings (inside the `useEffect`, after line 65 `setRequireBirthday(clubSettings.require_birthday ?? false)`):**
```typescript
setShowCapsOnExports(clubSettings.show_caps_on_exports ?? true)
```

**Target 3 — Persist in `persistSettings` (inside the `updateClubSettings` call, after line 229 `require_birthday: requireBirthday,`):**
```typescript
show_caps_on_exports: showCapsOnExports,
```

**Target 4 — UI toggle (add after the "Ask for Birthday" toggle block, after line 570, before the closing `</div>` of the Availability Form section):**

```tsx
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Show Player Caps on Team Exports</label>
                <p className="text-xs text-gray-500">Include the player's total caps next to their name when copying the team sheet or exporting to PDF</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCapsOnExports(v => !v)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${showCapsOnExports ? 'bg-purple-700' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={showCapsOnExports}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${showCapsOnExports ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
```

### File 4: `src/components/TeamSheetPDF.tsx` — Add `showCaps` prop

**Target 1 — Props interface (lines 9-14):**
```typescript
export interface TeamSheetPDFProps {
  teams: PDFTeam[]
  brandColor?: string
  clubName?: string
  coachName?: string
  showCaps?: boolean
}
```

**Target 2 — Component destructuring (lines 146-151):**
```typescript
export default function TeamSheetPDF({
  teams,
  brandColor = '#1e40af',
  clubName,
  coachName,
  showCaps = true,
}: TeamSheetPDFProps) {
```

**Target 3 — `getPlayerDisplayName` function (lines 28-33):**
**Current:**
```typescript
const getPlayerDisplayName = (player: PDFPlayer | null): string | null => {
  if (!player) return null
  const caps = player.totalCaps ?? 0
  const base = player.isCaptain ? `${player.fullName} (C)` : player.fullName
  return `${base} (${caps})`
}
```
**New — add `showCaps` parameter:**
```typescript
const getPlayerDisplayName = (player: PDFPlayer | null, showCaps: boolean): string | null => {
  if (!player) return null
  const base = player.isCaptain ? `${player.fullName} (C)` : player.fullName
  if (!showCaps) return base
  const caps = player.totalCaps ?? 0
  return `${base} (${caps})`
}
```

**Target 4 — Call site (line 192, inside the render loop):**
**Current:** `const displayName = getPlayerDisplayName(player)`
**New:** `const displayName = getPlayerDisplayName(player, showCaps)`

### File 5: `src/components/PDFDownloadLink.tsx` — Pass `showCaps` through

**Target 1 — `PDFDownloadButtonProps` interface (lines 9-17):**
```typescript
interface PDFDownloadButtonProps {
  teams: PDFTeam[]
  brandColor?: string
  clubName?: string
  coachName?: string
  fileName?: string
  showCaps?: boolean
  /** Dark variant for use on dark backgrounds (SelectionBoard header) */
  dark?: boolean
}
```

**Target 2 — Component destructuring (line 19):**
```typescript
export function PDFDownloadButton({
  teams,
  brandColor,
  clubName,
  coachName,
  fileName = 'team-sheet.pdf',
  showCaps = true,
  dark = false,
}: PDFDownloadButtonProps) {
```

**Target 3 — The `<TeamSheetPDF>` inside `<PDFDownloadLink>` (lines 64-69):**
**Current:**
```tsx
<TeamSheetPDF
  teams={teams}
  brandColor={brandColor}
  clubName={clubName}
  coachName={coachName}
/>
```
**New:**
```tsx
<TeamSheetPDF
  teams={teams}
  brandColor={brandColor}
  clubName={clubName}
  coachName={coachName}
  showCaps={showCaps}
/>
```

### File 6: `src/components/SelectionBoard.tsx` — Wire up both exports

**Target 1 — PDF Download (lines 893-907):**
**Current:**
```tsx
<PDFDownloadButton
  teams={selectionTeamsToPDF(
    teams.map(t => ({
      ...t,
      players: t.players.slice(0, clubSettings?.default_squad_size ?? 23),
    })),
    {
      matchDate: activeWeek ? formatWeekDate(activeWeek.start_date) : undefined,
    }
  )}
  brandColor={clubSettings?.primary_color ?? '#1e40af'}
  clubName={clubSettings?.club_name}
  fileName="team-sheet.pdf"
  dark
/>
```
**New — add `showCaps` prop:**
```tsx
<PDFDownloadButton
  teams={selectionTeamsToPDF(
    teams.map(t => ({
      ...t,
      players: t.players.slice(0, clubSettings?.default_squad_size ?? 23),
    })),
    {
      matchDate: activeWeek ? formatWeekDate(activeWeek.start_date) : undefined,
    }
  )}
  brandColor={clubSettings?.primary_color ?? '#1e40af'}
  clubName={clubSettings?.club_name}
  fileName="team-sheet.pdf"
  showCaps={clubSettings?.show_caps_on_exports ?? true}
  dark
/>
```

**Target 2 — WhatsApp export `formatPlayerLine` (lines 817-822):**
**Current:**
```typescript
const formatPlayerLine = (p: Player | null, slot: number, captainId: string | null): string => {
  if (!p) return `${slot}. Unfilled`
  const captainBadge = captainId === p.id ? ' (C)' : ''
  const caps = p.total_caps ?? 0
  return `${slot}. ${p.name}${captainBadge} (${caps})`
}
```
**New — conditionally include caps:**
```typescript
const formatPlayerLine = (p: Player | null, slot: number, captainId: string | null): string => {
  if (!p) return `${slot}. Unfilled`
  const captainBadge = captainId === p.id ? ' (C)' : ''
  const showCaps = clubSettings?.show_caps_on_exports ?? true
  const capsString = showCaps ? ` (${p.total_caps ?? 0})` : ''
  return `${slot}. ${p.name}${captainBadge}${capsString}`
}
```

---

## ✅ Acceptance Criteria

- [ ] Migration `035_add_show_caps_setting.sql` exists and adds `show_caps_on_exports boolean DEFAULT true` to `club_settings`
- [ ] `ClubSettings` TypeScript interface includes `show_caps_on_exports?: boolean`
- [ ] Club Settings page shows a new toggle "Show Player Caps on Team Exports" under the Availability Form section
- [ ] Toggle state persists on save and survives page refresh
- [ ] When toggled OFF, WhatsApp export shows: `1. Jonny Wilkinson` (no caps)
- [ ] When toggled ON, WhatsApp export shows: `1. Jonny Wilkinson (91)`
- [ ] When toggled OFF, PDF export shows: `Jonny Wilkinson` (no caps)
- [ ] When toggled ON, PDF export shows: `Jonny Wilkinson (91)`
- [ ] Captain badge `(C)` still appears regardless of caps toggle
- [ ] Empty slots still show "Unfilled" regardless of caps toggle
- [ ] `npm run build` passes with zero TypeScript errors

---

## ⚠️ Edge Cases (Already Handled)

1. **`clubSettings` not loaded yet**: Fallback `?? true` in both exports ensures caps still show by default during loading
2. **`total_caps` is null/undefined**: `?? 0` fallback already exists in the 19.3 code — unchanged
3. **Captain + caps**: `(C)` always appears before caps — unchanged from 19.3
4. **No active team**: `handleWhatsAppExport` returns early at line 809 — unchanged
5. **Migration on existing clubs**: `DEFAULT true` means no club loses caps on deploy

---

## 🚀 Implementation Order

1. Create `supabase/migrations/035_add_show_caps_setting.sql`
2. Update `ClubSettings` interface in `src/lib/supabase.ts`
3. Add toggle to `src/pages/ClubSettings.tsx` (state + sync + persist + UI)
4. Add `showCaps` prop to `src/components/TeamSheetPDF.tsx`
5. Add `showCaps` prop to `src/components/PDFDownloadLink.tsx`
6. Wire up both exports in `src/components/SelectionBoard.tsx`
7. Run `npm run build` to verify zero TypeScript errors
8. Run migration against local/remote database
