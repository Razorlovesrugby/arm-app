import { ChevronRight } from 'lucide-react'
import { Player } from '../lib/supabase'

interface Props {
  player: Player
  onEdit: () => void
  onDelete: () => void
}

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  Active:      { bg: '#DCFCE7', color: '#15803D' },
  Injured:     { bg: '#FEF3C7', color: '#B45309' },
  Unavailable: { bg: '#FEE2E2', color: '#B91C1C' },
  Retired:     { bg: '#F3F4F6', color: '#4B5563' },
  Archived:    { bg: '#F3F4F6', color: '#374151' },
}

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  Performance: { bg: '#F3E8FF', color: '#6B21A8' },
  Open:        { bg: '#DBEAFE', color: '#1D4ED8' },
  "Women's":   { bg: '#FCE7F3', color: '#BE185D' },
}

export default function PlayerCard({ player, onEdit }: Props) {
  const statusStyle = STATUS_BADGE[player.status] ?? { bg: '#F3F4F6', color: '#4B5563' }
  const typeStyle   = TYPE_BADGE[player.player_type] ?? { bg: '#F3F4F6', color: '#4B5563' }

  return (
    <button
      onClick={onEdit}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '14px 16px',
        marginBottom: '8px',
        cursor: 'pointer',
        textAlign: 'left',
        gap: '12px',
        minHeight: '68px',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: '#F3E8FF',
        color: '#6B21A8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '15px',
        fontWeight: '700',
        flexShrink: 0,
        letterSpacing: '-0.3px',
      }}>
        {player.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
      </div>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '15px',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '4px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {player.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {player.primary_position && (
            <span style={{ fontSize: '12px', color: '#6B7280' }}>
              {player.primary_position}
            </span>
          )}
          {/* Status badge */}
          <span style={{
            fontSize: '11px',
            fontWeight: '600',
            padding: '2px 7px',
            borderRadius: '999px',
            background: statusStyle.bg,
            color: statusStyle.color,
          }}>
            {player.status}
          </span>
          {/* Type badge */}
          <span style={{
            fontSize: '11px',
            fontWeight: '600',
            padding: '2px 7px',
            borderRadius: '999px',
            background: typeStyle.bg,
            color: typeStyle.color,
          }}>
            {player.player_type}
          </span>
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight size={18} style={{ color: '#D1D5DB', flexShrink: 0 }} />
    </button>
  )
}
