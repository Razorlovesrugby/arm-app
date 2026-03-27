// Phase 3 — Roster tab
// Full implementation coming in Phase 3:
// - Player cards with search + filter
// - Add Player bottom sheet / modal
// - Edit Player on card tap
// - Delete with confirmation
// - CSV export

export default function Roster() {
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
      <span style={{ fontSize: '40px' }}>🏉</span>
      <p style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: 0 }}>
        No players yet
      </p>
      <p style={{ fontSize: '14px', margin: 0 }}>
        Roster coming in Phase 3
      </p>
    </div>
  )
}
