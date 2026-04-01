// src/components/Layout.tsx
// CP7A.1 — Three-tab bottom navigation: Roster · Board · Weeks
// Replaces previous nav shell (Players · Weeks · Archive)
// Archive route is preserved in routing but not surfaced in nav until Phase 11

import { useLocation, useNavigate, Outlet } from 'react-router-dom'

// No children prop — uses React Router Outlet for nested routes

const NAV_TABS = [
  { path: '/roster',  label: 'Roster', icon: '👥' },
  { path: '/board',   label: 'Board',  icon: '🏉' },
  { path: '/weeks',   label: 'Weeks',  icon: '📅' },
] as const

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()

  const activeTab = NAV_TABS.find(t => location.pathname.startsWith(t.path))?.path ?? '/roster'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#000', color: '#fff' }}>

      {/* ── Main content area ─────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
        <Outlet />
      </div>

      {/* ── Bottom navigation bar ─────────────────────────────────────── */}
      {/* Height: 72px (64px bar + 8px safe-area padding). Fixed to bottom. */}
      <nav
        style={{
          flexShrink: 0,
          height: 72,
          paddingBottom: 8,
          background: '#0a0a0a',
          borderTop: '1px solid #1a1a1a',
          display: 'flex',
          alignItems: 'stretch',
        }}
      >
        {NAV_TABS.map(tab => {
          const isActive = activeTab === tab.path
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 0 0 0',
                WebkitTapHighlightColor: 'transparent',
                // Touch target minimum 44px — flex item fills full 64px bar height
              }}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  lineHeight: 1,
                  color: isActive ? '#6B21A8' : 'rgba(255,255,255,0.35)',
                  transition: 'color 0.15s',
                }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>

    </div>
  )
}
