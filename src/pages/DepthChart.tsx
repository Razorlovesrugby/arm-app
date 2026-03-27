import { useState } from 'react'
import { useDepthChart, PositionColumn } from '../hooks/useDepthChart'
import { Player } from '../lib/supabase'
import PlayerFormSheet from '../components/PlayerFormSheet'

// ─── Badge colours (mirrors Section B design tokens) ────────────────────────
const STATUS_COLOUR: Record<string, { bg: string; text: string }> = {
  Active:      { bg: '#DCFCE7', text: '#15803D' },
  Injured:     { bg: '#FEF3C7', text: '#B45309' },
  Unavailable: { bg: '#FEE2E2', text: '#B91C1C' },
  Retired:     { bg: '#F3F4F6', text: '#4B5563' },
}

// ─── Compact player chip used inside each column ─────────────────────────────
interface ChipProps {
  player: Player
  onTap: (player: Player) => void
}

function PlayerChip({ player, onTap }: ChipProps) {
  const badge = STATUS_COLOUR[player.status] ?? { bg: '#F3F4F6', text: '#4B5563' }
  return (
    <button
      onClick={() => onTap(player)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '8px 10px',
        marginBottom: '6px',
        cursor: 'pointer',
        textAlign: 'left',
        gap: '8px',
        minHeight: '44px',
      }}
    >
      <span style={{
        fontSize: '13px',
        fontWeight: '500',
        color: '#111827',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {player.name}
      </span>
      <span style={{
        fontSize: '10px',
        fontWeight: '600',
        borderRadius: '4px',
        padding: '2px 6px',
        background: badge.bg,
        color: badge.text,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
      }}>
        {player.status}
      </span>
    </button>
  )
}

// ─── Single position column ───────────────────────────────────────────────────
interface ColumnProps {
  col: PositionColumn
  onTap: (player: Player) => void
}

function Column({ col, onTap }: ColumnProps) {
  return (
    <div style={{
      minWidth: '172px',
      width: '172px',
      background: '#F8F8F8',
      borderRadius: '12px',
      padding: '12px 10px',
      flexShrink: 0,
    }}>
      {/* Column header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
        gap: '6px',
      }}>
        <span style={{
          fontSize: '12px',
          fontWeight: '700',
          color: '#6B21A8',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {col.position}
        </span>
        <span style={{
          fontSize: '11px',
          fontWeight: '600',
          background: '#F3E8FF',
          color: '#6B21A8',
          borderRadius: '10px',
          padding: '1px 7px',
          flexShrink: 0,
        }}>
          {col.players.length}
        </span>
      </div>

      {/* Player chips */}
      {col.players.length === 0 ? (
        <p style={{
          fontSize: '12px',
          color: '#9CA3AF',
          textAlign: 'center',
          margin: '16px 0',
        }}>
          No players
        </p>
      ) : (
        col.players.map((player) => (
          <PlayerChip key={player.id} player={player} onTap={onTap} />
        ))
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DepthChart() {
  const { columns, loading, error, refetch } = useDepthChart()
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)

  const handleTap = (player: Player) => setEditingPlayer(player)
  const handleClose = () => setEditingPlayer(null)
  const handleSaved = () => { setEditingPlayer(null); refetch() }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        flexDirection: 'column',
        gap: '12px',
        color: '#6B7280',
      }}>
        <div style={{
          width: '32px', height: '32px',
          border: '3px solid #E5E7EB',
          borderTopColor: '#6B21A8',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: '14px', margin: 0 }}>Loading depth chart…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        margin: '24px 16px',
        padding: '16px',
        background: '#FEE2E2',
        borderRadius: '10px',
        color: '#B91C1C',
        fontSize: '14px',
      }}>
        <strong>Error loading depth chart:</strong> {error}
      </div>
    )
  }

  // ── Main layout ──────────────────────────────────────────────────────────
  return (
    <>
      {/* Page header */}
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{
          fontSize: '20px',
          fontWeight: '700',
          color: '#111827',
          margin: 0,
        }}>
          Depth Chart
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0' }}>
          Tap a player to edit · Drag to reorder
        </p>
      </div>

      {/* Scrollable columns board */}
      <div style={{
        overflowX: 'auto',
        overflowY: 'visible',
        padding: '16px',
        display: 'flex',
        gap: '10px',
        WebkitOverflowScrolling: 'touch',
        scrollSnapType: 'x mandatory',
      }}>
        {columns.map((col) => (
          <div key={col.position} style={{ scrollSnapAlign: 'start' }}>
            <Column col={col} onTap={handleTap} />
          </div>
        ))}
      </div>

      {/* Edit player sheet — reuses Phase 3 component */}
      {editingPlayer && (
        <PlayerFormSheet
          player={editingPlayer}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
