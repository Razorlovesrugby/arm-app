// src/pages/Grid.tsx
// Master Availability Grid — Phase 12.6

import { memo } from 'react'
import { useGrid, GridPlayer, GridWeek, AvailabilityMatrix } from '../hooks/useGrid'
import type { Availability } from '../lib/supabase'

// ─── Cell Badge ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Availability, { bg: string; color: string; label: string }> = {
  Available:   { bg: '#DCFCE7', color: '#15803D', label: '✓' },
  TBC:         { bg: '#FEF3C7', color: '#B45309', label: '?' },
  Unavailable: { bg: '#FEE2E2', color: '#B91C1C', label: '✕' },
}

function AvailabilityBadge({ status }: { status: Availability | null | undefined }) {
  if (!status) {
    return (
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: '#F3F4F6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, color: '#9CA3AF', fontWeight: 700,
      }}>
        –
      </div>
    )
  }
  const cfg = STATUS_CONFIG[status]
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: cfg.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, color: cfg.color, fontWeight: 700,
    }}>
      {cfg.label}
    </div>
  )
}

// ─── Memoised Row ─────────────────────────────────────────────────────────────

interface RowProps {
  player: GridPlayer
  weeks: GridWeek[]
  matrix: AvailabilityMatrix
  isOdd: boolean
}

const GridRow = memo(function GridRow({ player, weeks, matrix, isOdd }: RowProps) {
  return (
    <tr style={{ background: isOdd ? '#F9FAFB' : '#FFFFFF' }}>
      {/* Sticky player name cell */}
      <td style={{
        position: 'sticky', left: 0, zIndex: 10,
        background: isOdd ? '#F9FAFB' : '#FFFFFF',
        borderRight: '1px solid #E5E7EB',
        borderBottom: '1px solid #E5E7EB',
        padding: '10px 14px',
        minWidth: 140, maxWidth: 180,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
          {player.name}
        </span>
      </td>

      {/* Availability cells */}
      {weeks.map(week => (
        <td
          key={`${player.id}-${week.id}`}
          style={{
            borderBottom: '1px solid #E5E7EB',
            borderRight: '1px solid #F3F4F6',
            padding: '10px 12px',
            textAlign: 'center',
            minWidth: 60,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <AvailabilityBadge status={matrix[player.id]?.[week.id]} />
          </div>
        </td>
      ))}
    </tr>
  )
})

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {(Object.entries(STATUS_CONFIG) as [Availability, typeof STATUS_CONFIG[Availability]][]).map(([key, cfg]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: cfg.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: cfg.color, fontWeight: 700,
          }}>
            {cfg.label}
          </div>
          <span style={{ fontSize: 12, color: '#6B7280' }}>{key}</span>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          background: '#F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#9CA3AF', fontWeight: 700,
        }}>–</div>
        <span style={{ fontSize: 12, color: '#6B7280' }}>No response</span>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function formatWeekDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export default function Grid() {
  const { players, weeks, matrix, loading, error, refetch } = useGrid()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <div style={{
          width: 36, height: 36,
          border: '3px solid #E5E7EB',
          borderTopColor: '#6B21A8',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '24px 16px' }}>
        <div style={{
          background: '#FEE2E2', color: '#B91C1C',
          borderRadius: 10, padding: '16px', fontSize: 14,
        }}>
          Failed to load grid: {error}
          <button
            onClick={refetch}
            style={{
              marginLeft: 12, padding: '4px 10px', borderRadius: 6,
              border: '1px solid #B91C1C', background: 'transparent',
              color: '#B91C1C', fontSize: 13, cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (weeks.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', gap: 12, textAlign: 'center' }}>
        <span style={{ fontSize: 40 }}>📅</span>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>No upcoming weeks</p>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
          Create open weeks with future dates to see the availability grid.
        </p>
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', gap: 12, textAlign: 'center' }}>
        <span style={{ fontSize: 40 }}>🏉</span>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>No active players</p>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
          Add players to the roster to see them in the grid.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F8F8F8' }}>
      {/* Page header */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '14px 16px',
        flexShrink: 0,
      }}>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>
          Master Availability Grid
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6B7280' }}>
          {players.length} players · {weeks.length} upcoming week{weeks.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Legend */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '10px 16px',
        flexShrink: 0,
      }}>
        <Legend />
      </div>

      {/* Scrollable table container */}
      <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto' }}>
          <thead>
            <tr>
              {/* Top-left intersection cell — highest z-index */}
              <th style={{
                position: 'sticky', top: 0, left: 0, zIndex: 30,
                background: '#FFFFFF',
                borderRight: '1px solid #E5E7EB',
                borderBottom: '2px solid #E5E7EB',
                padding: '10px 14px',
                minWidth: 140,
                textAlign: 'left',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Player</span>
              </th>

              {/* Week column headers */}
              {weeks.map(week => (
                <th
                  key={week.id}
                  style={{
                    position: 'sticky', top: 0, zIndex: 20,
                    background: '#FFFFFF',
                    borderBottom: '2px solid #E5E7EB',
                    borderRight: '1px solid #F3F4F6',
                    padding: '10px 12px',
                    minWidth: 60,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    {formatWeekDate(week.start_date)}
                  </div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {week.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {players.map((player, idx) => (
              <GridRow
                key={player.id}
                player={player}
                weeks={weeks}
                matrix={matrix}
                isOdd={idx % 2 === 1}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
