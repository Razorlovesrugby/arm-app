// Phase 6 — Availability Form (public, no auth)
// Full implementation coming in Phase 6:
// - Public page accessible via /availability/:token
// - Player name + availability + note
// - Matching logic: phone lookup, auto-create if unmatched
// - Real-time subscription updates

export default function AvailabilityForm() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        minHeight: '100dvh',
        padding: '32px 24px',
        background: '#F8F8F8',
        color: '#6B7280',
        textAlign: 'center',
        gap: '8px',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          background: '#6B21A8',
          borderRadius: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          fontWeight: '700',
          fontSize: '18px',
          marginBottom: '8px',
        }}
      >
        ARM
      </div>
      <p style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: 0 }}>
        Availability Form
      </p>
      <p style={{ fontSize: '14px', margin: 0 }}>
        Coming in Phase 6
      </p>
    </div>
  )
}
