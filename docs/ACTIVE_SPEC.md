# ACTIVE_SPEC: 16.3 Database Lockdown, Resilience & Edge Case Sweep

### 🎯 Why
Final "Contract" phase of multi-tenant migration. Frontend now passes `club_id` payloads. Must lock database with NOT NULL constraints and RLS, deploy frontend resilience, and sweep edge cases for 100% tenant isolation and zero crashes.

### 🏗️ Architecture Decisions
- **Database Lockdown**: Alter 10 core tables to make `club_id NOT NULL`. Enable RLS on all tables.
- **Coach RLS Policies**: Authenticated users get CRUD access ONLY to rows matching their `profiles.club_id`.
- **Public Link RLS Policies**: Specific anonymous SELECT/INSERT/UPDATE policies for AvailabilityForm.
- **Global Error Boundary**: Wrap App.tsx in React Error Boundary for graceful render failure handling.
- **Auth Airlock**: Block rendering of protected routes if authenticated user lacks `club_id`.
- **Defensive Hooks**: Convert `.single()` to `.maybeSingle()` where missing rows are valid.
- **Race Condition Defense**: Hooks must guard with `if (!activeClubId) return` to prevent null fetches.
- **Multi-Tab Sync**: Add window focus listener to refresh on auth state changes.
- **Data Integrity**: Include pre-flight orphan check in migration.
- **Performance**: Index all `club_id` columns.
- **Super Admin**: Add service_role bypass in RLS policies.

### 📁 Files to Touch
1. `supabase/migrations/020_phase_16_3_lockdown.sql` — Create new migration
2. `src/components/ErrorBoundary.tsx` — Create new component
3. `src/App.tsx` — Wrap routes in ErrorBoundary
4. `src/contexts/AuthContext.tsx` — Add Airlock UI, Public Route bypass, and multi-tab sync
5. `src/hooks/useClubSettings.ts` — Convert `.single()` to `.maybeSingle()`, add activeClubId guard
6. `src/hooks/useWeeks.ts` — Convert `.single()` to `.maybeSingle()`, add activeClubId guard
7. All other data hooks — Add `if (!activeClubId) return` guard at top of fetch functions

### 🎨 UI Implementation

**ErrorBoundary.tsx (Branded Fallback UI):**
```tsx
<div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
  <div className="w-16 h-16 mb-4 text-yellow-500">
    <WarningIcon />
  </div>
  <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops, something went wrong</h1>
  <p className="text-gray-600 mb-6 text-center">The app encountered an unexpected error.</p>
  <button 
    onClick={() => window.location.reload()}
    className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition"
  >
    Reload App
  </button>
</div>
```

**Auth Airlock UI (Account Not Linked):**
```tsx
<div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
  <div className="w-16 h-16 mb-4 text-red-500">
    <AlertIcon />
  </div>
  <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Not Linked</h1>
  <p className="text-gray-600 mb-4 text-center">Your account is not associated with any club.</p>
  <p className="text-gray-500 text-sm mb-6 text-center">Please contact your administrator.</p>
  <button 
    onClick={() => supabase.auth.signOut()}
    className="px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition"
  >
    Sign Out
  </button>
</div>
```

### ✅ Acceptance Criteria
- [ ] Database applies NOT NULL constraints to all 10 core tables
- [ ] RLS policies enforce tenant isolation without Postgres recursion errors
- [ ] Public availability link works (Anon policies for weeks, club_settings, players, availability_responses)
- [ ] Error Boundary UI triggers on forced errors
- [ ] Auth airlock blocks users without club_id from protected routes
- [ ] `.single()` calls converted to `.maybeSingle()` with null checks
- [ ] All hooks guard with `if (!activeClubId) return` to prevent race condition
- [ ] Multi-tab sync implemented via window focus listener
- [ ] Migration includes pre-flight orphan check
- [ ] All `club_id` columns indexed for RLS performance
- [ ] Service_role bypass included in RLS policies

### ⚠️ Edge Cases (Already Handled)
- **Infinite Recursion**: Profiles RLS uses `auth.uid() = id`, not `(SELECT club_id FROM profiles...)`
- **Public Form**: AvailabilityForm needs club_settings SELECT access (Anon policy included)
- **Stale Cache**: Developer must hard refresh after migration
- **Race Condition**: Hooks guard against null activeClubId during login
- **Multi-Tab Desync**: Window focus listener refreshes on auth changes
- **Orphan Data**: Migration includes pre-flight check for NULL club_id rows
- **RLS Performance**: All club_id columns indexed
- **Super Admin**: Service_role bypass in RLS policies for support access
- **Foreign Key Integrity**: club_id is immutable after creation
- **Realtime**: No realtime channels found in codebase

### 🚀 Implementation Order
1. Execute `020_phase_16_3_lockdown.sql` migration (with orphan check, indexes, service_role bypass)
2. Create `ErrorBoundary.tsx` and wrap App.tsx routes
3. Implement Auth Airlock in `AuthContext.tsx` (bypass for public routes, add multi-tab sync)
4. Convert `.single()` to `.maybeSingle()` in hooks
5. Add `if (!activeClubId) return` guard to all data hook fetch functions