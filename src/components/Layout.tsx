import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Users, Calendar, Archive, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import InstallPrompt from './InstallPrompt'

const NAV_ITEMS = [
  { to: '/players', label: 'Players', icon: Users },
  { to: '/weeks',   label: 'Weeks',   icon: Calendar },
  { to: '/archive', label: 'Archive', icon: Archive },
]

export default function Layout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>

      {/* ── Sidebar (tablet/desktop ≥ 768px) ── */}
      <aside
        style={{
          display: 'none',       // hidden on mobile; shown via media query below
          width: '220px',
          flexShrink: 0,
          background: '#FFFFFF',
          borderRight: '1px solid #E5E7EB',
          flexDirection: 'column',
          padding: '24px 0',
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100%',
          zIndex: 40,
        }}
        className="sidebar"
      >
        {/* ARM wordmark */}
        <div style={{ padding: '0 20px 28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                background: '#6B21A8',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '700',
                letterSpacing: '-0.3px',
              }}
            >
              ARM
            </div>
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
              Belsize Park RFC
            </span>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '0 12px' }}>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: isActive ? '600' : '500',
                color: isActive ? '#6B21A8' : '#6B7280',
                background: isActive ? '#F3E8FF' : 'transparent',
                marginBottom: '2px',
                minHeight: '44px',
              })}
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '0 12px' }}>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: '#6B7280',
              minHeight: '44px',
            }}
          >
            <LogOut size={20} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <main
        className="main-content"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100dvh',
          // Leave room for bottom tab bar on mobile
          paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
          overflow: 'hidden',
        }}
      >
        <InstallPrompt />
        <Outlet />
      </main>

      {/* ── Bottom tab bar (mobile < 768px) ── */}
      <nav
        className="bottom-tabs"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#FFFFFF',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          paddingBottom: 'env(safe-area-inset-bottom)',
          zIndex: 40,
        }}
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '10px 0',
              textDecoration: 'none',
              color: isActive ? '#6B21A8' : '#6B7280',
              minHeight: '56px',
              fontSize: '11px',
              fontWeight: isActive ? '600' : '400',
              borderTop: isActive ? '2px solid #6B21A8' : '2px solid transparent',
            })}
            aria-label={label}
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Responsive styles ── */}
      <style>{`
        @media (min-width: 768px) {
          .sidebar       { display: flex !important; }
          .bottom-tabs   { display: none !important; }
          .main-content  {
            margin-left: 220px;
            padding-bottom: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
