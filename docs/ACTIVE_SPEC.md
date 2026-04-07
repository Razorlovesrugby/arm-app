# ACTIVE SPEC: Phase 12.1 — Sidebar Navigation Refactor & Global White-labeling

## Overview
**Phase:** 12.1 — UI Pivot  
**Priority:** Must Build Now  
**Target:** Refactor Layout.tsx to responsive sidebar navigation with dynamic club branding  
**Status:** Ready for Implementation

## Context
The ARM application currently uses bottom-tab navigation with hardcoded "Belsize Park RFC" branding. Phase 12.1 transitions to:
1. **Responsive sidebar navigation** (mobile hamburger, tablet/desktop fixed sidebar)
2. **Dynamic club branding** from `club_settings` database table
3. **Logo implementation** replacing purple ARM boxes
4. **Navigation restructuring** for v2.0 architecture (Archive → Results Mode)

## Current State Analysis
- ✅ `club_settings` table exists (Migration 011_v2_pivot.sql)
- ✅ `ClubSettings` interface defined in `supabase.ts`
- ✅ `useClubSettings` hook implemented
- ✅ Logo exists at `/public/icons/Logo.png`
- ❌ Hardcoded "Belsize Park RFC" in multiple files
- ❌ Bottom-tab navigation with Archive tab (deprecated in v2.0)
- ❌ No dynamic branding integration

## Specification

### 1. Branding & Logo Implementation
**Files to modify:**
- `index.html` (line 20): Update meta description to "Team selection and player management"
- `manifest.json` (line 4): Update description to "Team selection and player management"
- `public/offline.html` (lines 24-37): Replace purple ARM box with logo image
- `src/pages/Login.tsx` (lines 56-80): Replace purple ARM box with logo + dynamic club name
- `src/pages/AvailabilityForm.tsx` (lines 504-519): Replace purple ARM box with logo + dynamic club name
- `src/pages/Weeks.tsx` (line 47): Update `shareMessage` function to use `clubSettings?.club_name`

**Logo Implementation:**
```tsx
// Replace <div style={{...}}>ARM</div> with:
<img 
  src="/icons/Logo.png" 
  alt="ARM Logo" 
  style={{ 
    maxHeight: '56px', 
    width: 'auto', 
    objectFit: 'contain' 
  }} 
/>
```

**Dynamic Club Name:**
```tsx
// In Login.tsx and AvailabilityForm.tsx
const { clubSettings, loading } = useClubSettings()
// Display: clubSettings?.club_name || 'ARM'
```

### 2. Sidebar Navigation Component (`src/components/Sidebar.tsx`)
**Design Tokens & Tailwind Classes:**
- Background: `bg-purple-900` (dark purple, `#4C1D95`)
- Text: `text-white` for active, `text-purple-200` for inactive
- Active indicator: `border-l-4 border-white`
- Hover: `hover:bg-purple-800`
- Spacing: `gap-2`, `mt-8`, `pt-4`

**Component Structure:**
```tsx
// Mobile: ~80% width slide-out with dark overlay
// Tablet/Desktop: Fixed 260px width
function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { clubSettings } = useClubSettings()
  const location = useLocation()
  const { user, signOut } = useAuth()
  
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />}
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-50
        bg-purple-900 text-white
        ${isOpen ? 'w-4/5' : 'w-64'}
        transition-transform duration-300
        md:relative md:translate-x-0 md:w-64
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="p-6 border-b border-purple-800">
          <div className="flex items-center justify-between">
            <img src="/icons/Logo.png" alt="ARM Logo" className="h-10" />
            {/* Mobile close button */}
            <button onClick={onClose} className="md:hidden text-white">
              <X size={24} />
            </button>
          </div>
          <div className="mt-2">
            <div className="text-xs uppercase tracking-wider text-purple-300">
              ATHLETE RELATIONSHIP MANAGEMENT
            </div>
            <div className="text-lg font-bold mt-1">
              {clubSettings?.club_name || 'ARM'}
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 flex flex-col gap-2 mt-4">
          {[
            { path: '/roster', label: 'Roster' },
            { path: '/depth', label: 'Depth Chart' },
            { path: '/weeks', label: 'Weeks' },
            { path: '/board', label: 'Results' },
          ].map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 768) onClose()
              }}
              className={`
                px-4 py-3 rounded-lg transition-colors
                ${location.pathname.startsWith(item.path)
                  ? 'bg-purple-800 border-l-4 border-white font-bold'
                  : 'text-purple-200 hover:bg-purple-800'
                }
              `}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        
        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-purple-800/50">
          <div className="text-sm text-purple-300 mb-2">
            {user?.email}
          </div>
          <button
            onClick={() => signOut()}
            className="w-full py-2 px-4 bg-purple-800 hover:bg-purple-700 rounded-lg text-white"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
```

### 3. Layout Refactor (`src/components/Layout.tsx`)
**Remove:** Bottom navigation completely
**Add:** Responsive header + sidebar integration

```tsx
function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="text-lg font-semibold">
            {clubSettings?.club_name || 'ARM'}
          </div>
          <div className="w-6" /> {/* Spacer for balance */}
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

### 4. Routing Updates (`src/App.tsx`)
**Remove:** Archive route (deprecated in v2.0)
**Keep:** All existing routes (Roster, Depth Chart, Weeks, Board)

### 5. Database Verification
**Check:** Migration 011_v2_pivot.sql has been applied to Supabase
**Verify:** `club_settings` table exists with at least one row
**Test:** `useClubSettings` hook fetches data correctly

## Acceptance Criteria
- [ ] `club_settings` table accessible via `useClubSettings` hook
- [ ] "Belsize Park RFC" removed from all hardcoded locations
- [ ] `/icons/Logo.png` renders on Login, Availability, Offline, and Sidebar
- [ ] WhatsApp Share message uses dynamic `club_name`
- [ ] Sidebar visible on tablet/desktop (≥768px), hidden on mobile
- [ ] Mobile hamburger menu opens/closes sidebar with dark overlay
- [ ] Navigation links close sidebar on mobile tap
- [ ] Sidebar footer shows user email + working Sign Out
- [ ] Bottom tab bar completely removed
- [ ] Archive tab removed from navigation
- [ ] "Depth Chart" label used instead of "Chart"
- [ ] "Results" navigation item links to `/board`
- [ ] iOS safe-area-inset-top preserved

## Files to Modify
1. `index.html` - Update meta description
2. `public/manifest.json` - Update description  
3. `public/offline.html` - Replace logo
4. `src/pages/Login.tsx` - Logo + dynamic club name
5. `src/pages/AvailabilityForm.tsx` - Logo + dynamic club name
6. `src/pages/Weeks.tsx` - Update shareMessage function
7. `src/components/Sidebar.tsx` - New component
8. `src/components/Layout.tsx` - Complete refactor
9. `src/App.tsx` - Remove Archive route

## Implementation Order
1. **Branding updates** (logo + dynamic club name)
2. **Create Sidebar component** 
3. **Refactor Layout component**
4. **Update routing**
5. **Test responsive behavior**
6. **Verify database integration**

## Notes
- Archive functionality deprecated in v2.0 (replaced by Results Mode in Board)
- Board accessed via "Open Board" button in Weeks or "Results" in sidebar
- Selection/Results mode toggle will be implemented in Phase 12.2
- Maintain PWA compatibility throughout changes