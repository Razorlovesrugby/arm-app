// Phase 4 — Depth Chart tab
// Full implementation coming in Phase 4:
// - Vertical position columns (Prop → Unspecified)
// - Drag-to-reorder within columns (dnd-kit)
// - Compact player cards
// - Tapping a card opens Edit Player form
// - Order persisted in depth_chart_order table

export default function DepthChart() {
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
      <span style={{ fontSize: '40px' }}>📊</span>
      <p style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: 0 }}>
        Depth Chart
      </p>
      <p style={{ fontSize: '14px', margin: 0 }}>
        Coming in Phase 4
      </p>
    </div>
  )
}
