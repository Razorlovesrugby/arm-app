// Phase 11 — Archive
// Full implementation coming in Phase 11:
// - Read-only list of Closed weeks
// - Reverse chronological order
// - Historical team names and selections
// - No exports from archive

export default function Archive() {
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
      <span style={{ fontSize: '40px' }}>🗄️</span>
      <p style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: 0 }}>
        Archive
      </p>
      <p style={{ fontSize: '14px', margin: 0 }}>
        Coming in Phase 11
      </p>
    </div>
  )
}
