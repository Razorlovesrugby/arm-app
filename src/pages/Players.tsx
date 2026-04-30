import { NavLink, Outlet } from 'react-router-dom'

const SUB_TABS = [
  { to: '/players/roster',      label: 'Roster' },
  { to: '/players/depth-chart', label: 'Depth Chart' },
]

export default function Players() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sticky sub-tab bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          zIndex: 30,
          padding: '0 16px',
        }}
      >
        {SUB_TABS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              padding: '14px 16px',
              fontSize: '14px',
              fontWeight: isActive ? '600' : '500',
              color: isActive ? '#0062F4' : '#6B7280',
              textDecoration: 'none',
              borderBottom: isActive ? '2px solid #0062F4' : '2px solid transparent',
              whiteSpace: 'nowrap',
              minHeight: '48px',
              display: 'flex',
              alignItems: 'center',
            })}
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Sub-page content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </div>
    </div>
  )
}
