# 🏗️ ARM App — Full Repository Audit

**Date:** 2026-04-28  
**Reviewer:** Principal Architect (AI-assisted)  
**Language/Framework:** React 18 + TypeScript + Vite + Tailwind CSS  
**Backend:** Supabase (PostgreSQL + RLS + RPCs)  
**Domain:** Rugby club management — roster, availability, selection board, depth chart, attendance, match results, RDO command center  
**Phase:** ~19 active phases, multi-tenant architecture, RDO layer

---

## 1. Architectural Score: **6.5 / 10**

**Why not higher?** The codebase has strong domain modeling and thoughtful UX patterns, but suffers from **inconsistent styling paradigms**, **duplicated logic across pages**, **no shared component library**, and **tight coupling between hooks and Supabase queries**. The RDO/coach routing is clever but fragile.

---

## 2. High-Priority Refactors

### 🔴 Priority 1: Unify Styling — Inline Styles vs. Tailwind
**Problem:** The codebase uses **three different styling approaches** inconsistently:
- **Inline `style={}` objects** — used in `SelectionBoard.tsx`, `PlayerFormSheet.tsx`, `MergePlayerModal.tsx`, `Grid.tsx`, `Attendance.tsx`, `AvailabilityForm.tsx`
- **Tailwind `className` strings** — used in `ReadinessMatrix.tsx`, `RDOSettings.tsx`, `RfcPlayerPool.tsx`, `ClubSettings.tsx`, `Results.tsx`
- **Mixed inline + Tailwind** — `Attendance.tsx` uses both `className` and `style` on the same elements (line 344-349)

**Impact:** ~2x maintenance burden. New devs must learn both paradigms. Tailwind purges via PostCSS may strip inline styles' class-based variants.

**Recommendation:** Pick one (Tailwind is already configured) and migrate. Start with the most-used components: `SelectionBoard.tsx` (1096 lines, all inline) → `PlayerFormSheet.tsx` (631 lines, all inline) → `Grid.tsx` → `Attendance.tsx`.

### 🔴 Priority 2: Extract Shared UI Primitives
**Problem:** The following are **duplicated across multiple files**:
- **Spinner component** — defined inline in `Roster.tsx`, `DepthChart.tsx`, `Grid.tsx`, `Attendance.tsx`, `Weeks.tsx`, `ClubSettings.tsx`, `Archive.tsx`, `AvailabilityForm.tsx` (each with its own `@keyframes spin` style tag)
- **Bottom sheet pattern** — duplicated in `PlayerFormSheet.tsx`, `MergePlayerModal.tsx`, `SelectionBoard.tsx` (PoolSheet, TeamManagementSheet, WeekPickerSheet), `Weeks.tsx` (CreateWeekForm)
- **Status badges** — `StatusBadge` defined in `ReadinessMatrix.tsx`, `RfcPlayerPool.tsx`, `Grid.tsx`, `Archive.tsx` with near-identical color maps
- **`inputStyle()` helper** — duplicated in `PlayerFormSheet.tsx` and `AvailabilityForm.tsx`
- **`formatWeekDate()`** — duplicated in `SelectionBoard.tsx`, `Grid.tsx`, `Attendance.tsx`

**Recommendation:** Create `src/components/ui/` with `Spinner.tsx`, `BottomSheet.tsx`, `Badge.tsx`, `Toggle.tsx`, `FormField.tsx`. Extract date utils to `src/lib/dateUtils.ts`.

### 🔴 Priority 3: Decouple Hooks from Direct Supabase Calls
**Problem:** Hooks like `useGrid.ts`, `useAttendance.ts` (inferred from page code), and `useSelectionBoard.ts` make **direct Supabase queries inside the hook**, mixing data-fetching concern with state management. This makes:
- Testing impossible without mocking Supabase
- Caching/offline support difficult to add later
- Error handling inconsistent (some hooks return `{error}`, others throw)

**Recommendation:** Introduce a thin data-access layer (`src/services/` or `src/api/`) that wraps Supabase calls. Hooks call services, services call Supabase. This enables future migration to React Query or SWR for caching.

---

## 3. File-by-File Specifics

### `src/lib/supabase.ts` (333 lines)
- **Good:** Well-organized type definitions with phase annotations. Single source of truth for types.
- **Issue:** `PlayerType = string` is too loose — should be a branded type or constrained to club settings values.
- **Issue:** `normalisePhone()` is a utility function living in a file called `supabase.ts` — should be in `src/lib/phoneUtils.ts`.
- **Issue:** `PLAYER_TYPES` is a stale re-export of `DEFAULT_PLAYER_TYPES` — player types are now dynamic per club, so this constant is misleading.

### `src/App.tsx` (154 lines)
- **Good:** Clean routing with `ProtectedShell` pattern. RDO vs Coach routing is well-thought-out.
- **Issue:** `ProtectedShell` manually maps paths to components (lines 77-83) instead of using nested `<Route>` elements with `<Outlet>`. This bypasses React Router's rendering and makes it harder to add nested routes.
- **Issue:** `BrandInjector` is a component that mutates `document.head` — should be a `useEffect` inside `Layout` or a custom hook.

### `src/contexts/AuthContext.tsx` (217 lines)
- **Good:** Multi-tab sync via `focus` event listener. Airlock pattern for unlinked accounts.
- **Issue:** `switchTenant` uses a `setTimeout(100ms)` hack to force remount — fragile. Should use React's `key` prop properly (already done in `ProtectedShell` with `key={activeClubId}`).
- **Issue:** `fetchProfile` is called on every auth state change AND on mount — potential double-fetch on initial load.

### `src/components/SelectionBoard.tsx` (1096 lines)
- **Largest file in the project.** Contains 10+ sub-components (`PoolSheet`, `TeamManagementSheet`, `WeekPickerSheet`, `BoardContent`, `FilledRow`, `DroppableGhostRow`, `Toggle`, `RemoveButton`, `BenchDivider`, `SectionHeader`, `SaveBadge`).
- **Issue:** All inline styles — zero Tailwind usage. Makes the file ~40% larger than necessary.
- **Issue:** `RUGBY_POSITIONS` constant (line 40-46) duplicates `POSITIONS` from `supabase.ts` with display labels. Should be a shared mapping.
- **Issue:** `PoolSheet` props type uses `ReturnType<typeof useSelectionBoard>` — fragile coupling to hook shape.
- **Issue:** `handleDragEnd` (line 758) is 45 lines of inline logic — should be extracted to a custom hook or utility.

### `src/components/PlayerFormSheet.tsx` (631 lines)
- **Good:** Clean form state management, validation, and error handling.
- **Issue:** Career stats fetching (lines 102-149) duplicates logic that should live in `usePlayerDetails` hook. The hook already has `fetchPlayerStats`, but kicking percentage is computed inline.
- **Issue:** `court_fines` field with 1000 char limit — consider if this belongs in a separate CRM-like table rather than the player record.

### `src/pages/Roster.tsx` (453 lines)
- **Good:** Clean filter/sort/search pattern. CSV export is a nice touch.
- **Issue:** `exportCSV` function (line 84) creates and clicks a DOM element — should use a library like `papaparse` or a utility function.
- **Issue:** `showRetired` state is redundant with `showArchived` — both control visibility of non-active statuses. Could be unified.

### `src/pages/Grid.tsx` (393 lines) & `src/pages/Attendance.tsx` (371 lines)
- **High duplication:** Both fetch players, weeks, and club_settings in nearly identical `useEffect` blocks. Both have the same spinner, error, and empty states.
- **Issue:** `Grid.tsx` uses `is_retired` filter (line 87) while `Attendance.tsx` does not — inconsistency in player filtering.
- **Issue:** Both use `WebkitOverflowScrolling: 'touch' as any` — type cast hiding a missing CSS property type.

### `src/pages/AvailabilityForm.tsx` (696 lines)
- **Good:** Excellent UX — token resolution, closed week handling, auto-match by phone/name, position sync.
- **Issue:** `handleSubmit` is 110 lines long with 5 distinct steps (match, create, update profile, sync positions, insert response). Should be broken into smaller functions or a service.
- **Issue:** `requireContactInfo` and `requireBirthday` are read from `clubSettings` but used in `validate()` — if clubSettings hasn't loaded yet, these default to `false`, potentially allowing submissions without required fields.

### `src/pages/Archive.tsx` (711 lines)
- **Good:** Deep-link support with URL params. Debounced search. Back navigation preservation.
- **Issue:** `loadWeekNotes` uses a `useRef` set to track loaded weeks — this is a side effect stored in a ref, which is fragile. Should use React Query or a simple state set.
- **Issue:** `handleSaveNote` silently fails if `activeClubId` is null — no user feedback.

### `src/pages/Weeks.tsx` (1003 lines)
- **Second largest file.** Contains `CreateWeekForm`, `WeekCard`, and the main page.
- **Issue:** `CreateWeekForm` uses `window.innerWidth < 768` for responsive layout (line 147) — this won't update on resize. Should use CSS media queries (the `className="player-sheet"` pattern used in `PlayerFormSheet.tsx` is better).

### `src/pages/RDOSettings.tsx` (393 lines)
- **Good:** Clean tab pattern. Facility CRUD is well-structured.
- **Issue:** `ManagedTeamsTab` and `AppPreferencesTab` are empty placeholders — dead code that will confuse new devs.

---

## 4. Dead Code Detection

| File | Dead Code | Notes |
|------|-----------|-------|
| `src/lib/supabase.ts` | `PLAYER_TYPES` (line 175) | Stale re-export of `DEFAULT_PLAYER_TYPES` — player types are now dynamic |
| `src/lib/supabase.ts` | `PLAYER_TYPE_ORDER` (line 71) | Never referenced in any component |
| `src/pages/RDOSettings.tsx` | `ManagedTeamsTab`, `AppPreferencesTab` | Placeholder components with no implementation |
| `src/App.tsx` | `Route path="depth"` (line 123) | Duplicate of `depth-chart` — legacy redirect |
| `src/App.tsx` | `Route path="players"` (line 144) | Legacy redirect to `/roster` |
| Root | `006_cp7a.sql`, `011_v2_pivot.rtf`, `arm-poc.html`, `arm-screens.html`, `main` (binary), `FETCH_HEAD` | Orphaned files at project root — should be cleaned up |
| Root | `OLD CLAUDE ARTIFACTS/` | Entire directory of old artifacts — should be archived or deleted |

---

## 5. Security & Optimization Audit

### Security
- **✅ Good:** Supabase RLS is used (migrations show RLS policies). Environment variables via `VITE_` prefix.
- **⚠️ Moderate:** `AvailabilityForm.tsx` auto-creates players with `club_id` from the week token (line 201) — a malicious user could craft a token for another club's week and create players there. Mitigated by Supabase RLS on the `players` table.
- **⚠️ Moderate:** `MergePlayerModal.tsx` calls `supabase.rpc('merge_players')` — ensure this RPC has proper RLS checks and is not callable by unauthorized roles.
- **✅ Good:** Airlock pattern prevents unlinked accounts from accessing protected routes.

### Performance
- **🔴 Issue:** `RfcPlayerPool.tsx` loads ALL players across ALL managed clubs into memory, then filters client-side. For an RDO managing 10+ clubs with 50+ players each, this could be 500+ rows. Should use server-side filtering via the RPC.
- **🔴 Issue:** `Archive.tsx` loads ALL closed weeks and ALL their notes upfront. As the app grows, this will become slow. Should paginate or lazy-load.
- **⚠️ Moderate:** `SelectionBoard.tsx` re-renders the entire board on every drag event because `BoardContent` is not memoized.
- **⚠️ Moderate:** Multiple components inject `<style>` tags for `@keyframes spin` — each one adds a DOM node. A shared CSS class would be more efficient.
- **✅ Good:** `useMemo` and `useCallback` are used appropriately in most filter/search scenarios.

### Secrets Leak Check
- **✅ No hardcoded secrets found.** All Supabase credentials are in `VITE_` env vars.
- **⚠️** Ensure `.env.example` does not contain real values (it shouldn't based on the code check).

---

## 6. Environment & Config Review

### `package.json`
- **Missing:** `lint` script (only `tsc` for type-checking). No `prettier` or `eslint` config.
- **Missing:** `engines` field to pin Node version.
- **Missing:** `browserslist` for Tailwind/CSS compatibility.

### `tsconfig.json`
- **Missing:** `baseUrl` and `paths` for `@/` imports — currently using deep relative imports like `../../lib/supabase`.
- **Missing:** `noUnusedLocals` and `noUnusedParameters` to catch dead code at compile time.

### `vite.config.ts`
- **Missing:** `resolve.alias` for `@/` path mapping.
- **Missing:** PWA plugin configuration (the `public/manifest.json` and service worker suggest PWA, but Vite isn't configured for it).

### `.gitignore`
- **Should include:** `.env` (already likely there), `*.rtf`, `*.docx` (binary artifacts), `OLD CLAUDE ARTIFACTS/`

### README.md
- **Not reviewed** — file not found in the project root. **This is a critical gap.** There should be a README with setup instructions, architecture overview, and environment variable documentation.

---

## 7. Summary: Top 3 Actions

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | **Unify styling (Tailwind everywhere)** | 2-3 days | High — reduces file sizes 30-40%, improves maintainability |
| 2 | **Extract shared UI primitives** | 1 day | High — eliminates 50+ lines of duplicated spinner/badge/sheet code |
| 3 | **Add README + path aliases + lint config** | 0.5 day | Medium — improves DX for new contributors |
