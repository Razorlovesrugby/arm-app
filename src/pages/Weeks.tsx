// Phase 5 — Weeks
// Full implementation coming in Phase 5:
// - Create week (date range + label + auto 5 teams)
// - Week dropdown switcher
// - Shareable availability link
// - Week status badge (Open / Closed)

export default function Weeks() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        padding: '32px 24px',
        color: '#6B7280',
        textAlign: 'center',
        gap: '8px',
      }}
    >
      <span style={{ fontSize: '40px' }}>📅</span>
      <p style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: 0 }}>
        Weeks
      </p>
      <p style={{ fontSize: '14px', margin: 0 }}>
        Coming in Phase 5
      </p>
    </div>
  )
}
