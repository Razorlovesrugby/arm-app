import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDepthChart, PositionColumn } from '../hooks/useDepthChart'
import { Player, Position } from '../lib/supabase'
import PlayerFormSheet from '../components/PlayerFormSheet'

// ─── Badge colours ────────────────────────────────────────────────────────────
const STATUS_COLOUR: Record<string, { bg: string; text: string }> = {
  Active:      { bg: '#DCFCE7', text: '#15803D' },
  Injured:     { bg: '#FEF3C7', text: '#B45309' },
  Unavailable: { bg: '#FEE2E2', text: '#B91C1C' },
  Retired:     { bg: '#F3F4F6', text: '#4B5563' },
}

// ─── Sortable player chip ─────────────────────────────────────────────────────
interface ChipProps {
  player: Player
  onTap: (player: Player) => void
}

function SortablePlayerChip({ player, onTap }: ChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.id })

  const badge = STATUS_COLOUR[player.status] ?? { bg: '#F3F4F6', text: '#4B5563' }

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    background: '#FFFFFF',
    border: isDragging ? '1px solid #6B21A8' : '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '8px 10px',
    marginBottom: '6px',
    cursor: isDragging ? 'grabbing' : 'grab',
    textAlign: 'left' as const,
    gap: '8px',
    minHeight: '44px',
    touchAction: 'none',
    userSelect: 'none',
    boxShadow: isDragging ? '0 4px 12px rgba(107,33,168,0.15)' : 'none',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {/* Drag handle indicator */}
      <span style={{
        fontSize: '12px',
        color: '#D1D5DB',
        flexShrink: 0,
        lineHeight: 1,
      }}>
        ⠿
      </span>

      {/* Name — tappable area */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onTap(player)
        }}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          flex: 1,
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '500',
          color: '#111827',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {player.name}
      </button>

      {/* Status badge */}
      <span style={{
        fontSize: '10px',
        fontWeight: '600',
        borderRadius: '4px',
        padding: '2px 6px',
        background: badge.bg,
        color: badge.text,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.3px',
      }}>
        {player.status}
      </span>
    </div>
  )
}

// ─── Single position column with its own DndContext ───────────────────────────
interface ColumnProps {
  col: PositionColumn
  onTap: (player: Player) => void
  onReorder: (position: Position, newIds: string[]) => Promise<void>
}

function Column({ col, onTap, onReorder }: ColumnProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = col.players.findIndex((p) => p.id === active.id)
    const newIndex = col.players.findIndex((p) => p.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(col.players, oldIndex, newIndex)
    onReorder(col.position, reordered.map((p) => p.id))
  }

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

      {/* Sortable list */}
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={col.players.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {col.players.map((player) => (
              <SortablePlayerChip
                key={player.id}
                player={player}
                onTap={onTap}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DepthChart() {
  const { columns, loading, error, updateOrder, refetch } = useDepthChart()
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)

  const handleTap    = (player: Player) => setEditingPlayer(player)
  const handleClose  = () => setEditingPlayer(null)
  const handleSaved  = () => { setEditingPlayer(null); refetch() }

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
          width: '32px',
          height: '32px',
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
          Drag ⠿ to reorder · Tap name to edit
        </p>
      </div>

      {/* Horizontally scrollable columns */}
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
            <Column
              col={col}
              onTap={handleTap}
              onReorder={updateOrder}
            />
          </div>
        ))}
      </div>

      {/* Edit player sheet */}
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
