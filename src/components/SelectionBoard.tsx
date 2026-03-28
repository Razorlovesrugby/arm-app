import { useState, CSSProperties, ReactNode } from 'react'
import { X, GripVertical, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
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
import { PlayerWithAvailability, TeamSelectionState } from '../hooks/useSelectionBoard'

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  '#6B21A8', '#1D4ED8', '#0F766E', '#B45309', '#BE185D',
  '#7C3AED', '#0369A1', '#047857', '#92400E', '#9F1239',
  '#0891B2', '#65A30D', '#C2410C',
]

const RUGBY_POSITIONS: Record<number, string> = {
  1: 'Loosehead Prop',   2: 'Hooker',            3: 'Tighthead Prop',
  4: 'Lock',             5: 'Lock',               6: 'Blindside Flanker',
  7: 'Openside Flanker', 8: 'Number 8',           9: 'Scrum-half',
  10: 'Fly-half',        11: 'Left Wing',          12: 'Inside Centre',
  13: 'Outside Centre',  14: 'Right Wing',         15: 'Fullback',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function availDotColor(avail: string | null): string {
  if (avail === 'Available') return '#16A34A'
  if (avail === 'TBC') return '#D97706'
  if (avail === 'Unavailable') return '#DC2626'
  return '#D1D5DB'
}

function availLabel(avail: string | null): string {
  if (avail === 'Available') return 'Available'
  if (avail === 'TBC') return 'TBC'
  if (avail === 'Unavailable') return 'Unavailable'
  return 'No response'
}

function availBg(avail: string | null): { bg: string; color: string } {
  if (avail === 'Available') return { bg: '#DCFCE7', color: '#15803D' }
  if (avail === 'TBC') return { bg: '#FEF3C7', color: '#B45309' }
  if (avail === 'Unavailable') return { bg: '#FEE2E2', color: '#B91C1C' }
  return { bg: '#F3F4F6', color: '#6B7280' }
}

// ─── PlayerAvatar ─────────────────────────────────────────────────────────────

interface PlayerAvatarProps {
  player: PlayerWithAvailability
  size?: number
}

function PlayerAvatar({ player, size = 36 }: PlayerAvatarProps) {
  const color = getAvatarColor(player.name)
  const initials = getInitials(player.name)
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      position: 'relative',
    }}>
      <span style={{
        color: '#fff',
        fontSize: size * 0.38,
        fontWeight: '700',
        letterSpacing: '0.02em',
        lineHeight: 1,
      }}>
        {initials}
      </span>
      {/* Availability dot */}
      <span style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: size * 0.32,
        height: size * 0.32,
        borderRadius: '50%',
        background: availDotColor(player.latestAvailability),
        border: '2px solid #fff',
      }} />
    </div>
  )
}

// ─── Shirt number badge ───────────────────────────────────────────────────────

function ShirtBadge({ number, filled }: { number: number; filled: boolean }) {
  return (
    <div style={{
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: filled ? '#1E1B4B' : '#E5E7EB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{
        color: filled ? '#fff' : '#9CA3AF',
        fontSize: '12px',
        fontWeight: '700',
        lineHeight: 1,
      }}>
        {number}
      </span>
    </div>
  )
}

// ─── Filled position row ──────────────────────────────────────────────────────

interface FilledRowProps {
  shirtNumber: number
  player: PlayerWithAvailability
  onRemove: () => void
  onTap: () => void
  dragHandle?: ReactNode
  isDragging?: boolean
}

function FilledRow({
  shirtNumber,
  player,
  onRemove,
  onTap,
  dragHandle,
  isDragging = false,
}: FilledRowProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 12px',
      background: isDragging ? '#F3E8FF' : '#FFFFFF',
      borderRadius: '10px',
      border: `1px solid ${isDragging ? '#6B21A8' : '#E5E7EB'}`,
      opacity: isDragging ? 0.6 : 1,
      transition: 'border-color 0.1s',
    }}>
      {/* Large drag handle — easier to grip on mobile */}
      {dragHandle && (
        <span style={{
          color: '#9CA3AF',
          cursor: 'grab',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 44,
          margin: '-4px -4px -4px -6px',
        }}>
          {dragHandle}
        </span>
      )}
      <ShirtBadge number={shirtNumber} filled={true} />
      {/* Native button for tap — most reliable across iOS Safari */}
      <button
        onClick={onTap}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0px',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: '600',
            color: '#111827',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {player.name}
          </p>
          <p style={{
            margin: '1px 0 0',
            fontSize: '11px',
            color: '#6B7280',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {RUGBY_POSITIONS[shirtNumber] || `#${shirtNumber}`}
            {player.primary_position ? ` · ${player.primary_position}` : ''}
          </p>
        </div>
      </button>
      <button
        onClick={e => { e.stopPropagation(); onRemove() }}
        style={{
          background: 'none',
          border: 'none',
          padding: '4px',
          cursor: 'pointer',
          color: '#9CA3AF',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '4px',
          flexShrink: 0,
        }}
        aria-label="Remove from team"
      >
        <X size={15} />
      </button>
    </div>
  )
}

// ─── Empty position row ───────────────────────────────────────────────────────

interface EmptyRowProps {
  shirtNumber: number
  onTap: () => void
}

function EmptyRow({ shirtNumber, onTap }: EmptyRowProps) {
  const posLabel = shirtNumber <= 15 ? RUGBY_POSITIONS[shirtNumber] : `Replacement ${shirtNumber - 15}`
  return (
    <button
      onClick={onTap}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 12px',
        background: '#FAFAFA',
        borderRadius: '10px',
        border: '1px dashed #D1D5DB',
        width: '100%',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <ShirtBadge number={shirtNumber} filled={false} />
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F3F4F6', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>
          Unfilled
        </p>
        <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#D1D5DB' }}>
          {posLabel}
        </p>
      </div>
      <Plus size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} />
    </button>
  )
}

// ─── Sortable filled row (dnd-kit wrapper) ────────────────────────────────────

interface SortableFilledRowProps {
  id: string
  shirtNumber: number
  player: PlayerWithAvailability
  onRemove: () => void
  onTap: () => void
}

function SortableFilledRow({ id, shirtNumber, player, onRemove, onTap }: SortableFilledRowProps) {
  const {
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // NOTE: {attributes} intentionally omitted — it adds role="button" to the wrapper
  // which causes iOS Safari to swallow click events on child interactive elements
  return (
    <div ref={setNodeRef} style={style}>
      <FilledRow
        shirtNumber={shirtNumber}
        player={player}
        onRemove={onRemove}
        onTap={onTap}
        isDragging={isDragging}
        dragHandle={<span {...listeners}><GripVertical size={22} /></span>}
      />
    </div>
  )
}

// ─── Team sheet ───────────────────────────────────────────────────────────────

interface TeamSheetProps {
  team: TeamSelectionState
  playerMap: Record<string, PlayerWithAvailability>
  onRemove: (playerId: string) => void
  onReorder: (weekTeamId: string, newIds: string[]) => void
  onPlayerTap: (player: PlayerWithAvailability) => void
  onEmptySlotTap: () => void
}

function TeamSheet({
  team,
  playerMap,
  onRemove,
  onReorder,
  onPlayerTap,
  onEmptySlotTap,
}: TeamSheetProps) {
  const sensors = useSensors(
    // PointerSensor works for both mouse (desktop) and touch (iOS 13.4+/Android).
    // distance:8 means drag only activates after 8px movement — taps register normally.
    // TouchSensor removed: it sets touch-action:none and competes with iOS click synthesis.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = team.playerIds.indexOf(String(active.id))
    const newIndex = team.playerIds.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    onReorder(team.weekTeamId, arrayMove(team.playerIds, oldIndex, newIndex))
  }

  const startersCount = team.startersCount // default 15
  const starters = team.playerIds.slice(0, startersCount)
  const bench = team.playerIds.slice(startersCount)

  // Build rows for starters: filled or empty
  const starterRows = Array.from({ length: startersCount }, (_, i) => {
    const playerId = starters[i] ?? null
    const player = playerId ? playerMap[playerId] : null
    return { shirtNumber: i + 1, playerId, player }
  })

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={team.playerIds}
        strategy={verticalListSortingStrategy}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {/* Starters section label */}
          <p style={{
            margin: '0 0 6px',
            fontSize: '11px',
            fontWeight: '700',
            color: '#6B7280',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
          }}>
            Starters — {starters.length}/{startersCount}
          </p>

          {starterRows.map(({ shirtNumber, playerId, player }) => {
            if (player && playerId) {
              return (
                <SortableFilledRow
                  key={playerId}
                  id={playerId}
                  shirtNumber={shirtNumber}
                  player={player}
                  onRemove={() => onRemove(playerId)}
                  onTap={() => onPlayerTap(player)}
                />
              )
            }
            return (
              <EmptyRow
                key={`empty-${shirtNumber}`}
                shirtNumber={shirtNumber}
                onTap={onEmptySlotTap}
              />
            )
          })}

          {/* Bench section */}
          {bench.length > 0 && (
            <>
              <p style={{
                margin: '12px 0 6px',
                fontSize: '11px',
                fontWeight: '700',
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}>
                Bench — {bench.length}
              </p>
              {bench.map((playerId, i) => {
                const player = playerMap[playerId]
                if (!player) return null
                return (
                  <SortableFilledRow
                    key={playerId}
                    id={playerId}
                    shirtNumber={startersCount + i + 1}
                    player={player}
                    onRemove={() => onRemove(playerId)}
                    onTap={() => onPlayerTap(player)}
                  />
                )
              })}
            </>
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}

// ─── Unassigned pool ──────────────────────────────────────────────────────────

interface UnassignedPoolProps {
  players: PlayerWithAvailability[]
  onAssignToTeam: (playerId: string) => void
  activeTeamName: string
}

function UnassignedPool({ players, onAssignToTeam, activeTeamName }: UnassignedPoolProps) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div style={{
      marginTop: '20px',
      border: '1px solid #E5E7EB',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {/* Pool header */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 14px',
          background: '#F8F8F8',
          border: 'none',
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid #E5E7EB' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '13px',
            fontWeight: '700',
            color: '#111827',
          }}>
            Unassigned Players
          </span>
          <span style={{
            background: players.length > 0 ? '#6B21A8' : '#E5E7EB',
            color: players.length > 0 ? '#fff' : '#9CA3AF',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: '700',
            padding: '1px 7px',
          }}>
            {players.length}
          </span>
        </div>
        {expanded ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
      </button>

      {expanded && (
        <div style={{ background: '#fff' }}>
          {players.length === 0 ? (
            <p style={{
              margin: 0,
              padding: '16px 14px',
              fontSize: '13px',
              color: '#9CA3AF',
              textAlign: 'center',
              fontStyle: 'italic',
            }}>
              All available players have been assigned
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {players.map((player, i) => {
                const { bg, color: badgeColor } = availBg(player.latestAvailability)
                return (
                  <div
                    key={player.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderBottom: i < players.length - 1 ? '1px solid #F3F4F6' : 'none',
                    }}
                  >
                    <PlayerAvatar player={player} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#111827',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {player.name}
                      </p>
                      <p style={{
                        margin: '1px 0 0',
                        fontSize: '11px',
                        color: '#6B7280',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {player.primary_position || 'Unspecified'}
                      </p>
                    </div>
                    <span style={{
                      background: bg,
                      color: badgeColor,
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '2px 7px',
                      borderRadius: '999px',
                      flexShrink: 0,
                    }}>
                      {availLabel(player.latestAvailability)}
                    </span>
                    {/* Assign button */}
                    <button
                      onClick={() => onAssignToTeam(player.id)}
                      title={`Add to ${activeTeamName}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: '#6B21A8',
                        border: 'none',
                        cursor: 'pointer',
                        flexShrink: 0,
                        color: '#fff',
                      }}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main SelectionBoard ──────────────────────────────────────────────────────

interface SelectionBoardProps {
  playerMap: Record<string, PlayerWithAvailability>
  unassignedPlayers: PlayerWithAvailability[]
  teams: TeamSelectionState[]
  loading: boolean
  error: string | null
  onAssignPlayer: (playerId: string, toWeekTeamId: string) => Promise<void>
  onRemovePlayer: (playerId: string, fromWeekTeamId: string) => Promise<void>
  onReorderTeam: (weekTeamId: string, newPlayerIds: string[]) => Promise<void>
  onMovePlayer: (playerId: string, fromWeekTeamId: string | null, toWeekTeamId: string) => Promise<void>
  onPlayerTap: (player: PlayerWithAvailability) => void
}

export default function SelectionBoard({
  playerMap,
  unassignedPlayers,
  teams,
  loading,
  error,
  onAssignPlayer,
  onRemovePlayer,
  onReorderTeam,
  onPlayerTap,
}: SelectionBoardProps) {
  const [activeTeamIndex, setActiveTeamIndex] = useState(0)

  const activeTeam = teams[activeTeamIndex] ?? teams[0] ?? null

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>
        Loading selection board…
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
        No teams found for this week.
      </div>
    )
  }

  return (
    <div>
      {/* Inline error banner */}
      {error && (
        <div style={{
          marginBottom: '10px',
          padding: '8px 12px',
          background: '#FEE2E2',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#B91C1C',
        }}>
          Save failed: {error}
        </div>
      )}

      {/* ── Team tab bar ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '2px',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        marginBottom: '14px',
      }}>
        {teams.map((team, i) => {
          const isActive = i === activeTeamIndex
          return (
            <button
              key={team.weekTeamId}
              onClick={() => setActiveTeamIndex(i)}
              style={{
                flexShrink: 0,
                padding: '7px 14px',
                borderRadius: '20px',
                border: `2px solid ${isActive ? '#6B21A8' : '#E5E7EB'}`,
                background: isActive ? '#6B21A8' : '#fff',
                color: isActive ? '#fff' : '#374151',
                fontSize: '13px',
                fontWeight: isActive ? '700' : '500',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {team.teamName}
              {team.playerIds.length > 0 && (
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.3)' : '#F3F4F6',
                  color: isActive ? '#fff' : '#6B7280',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '0px 5px',
                  borderRadius: '999px',
                  minWidth: '18px',
                  textAlign: 'center',
                }}>
                  {team.playerIds.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Active team sheet ─────────────────────────────────────────────── */}
      {activeTeam && (
        <TeamSheet
          team={activeTeam}
          playerMap={playerMap}
          onRemove={playerId => onRemovePlayer(playerId, activeTeam.weekTeamId)}
          onReorder={onReorderTeam}
          onPlayerTap={onPlayerTap}
          onEmptySlotTap={() => {
            // Scroll to unassigned pool
            const el = document.getElementById('arm-unassigned-pool')
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        />
      )}

      {/* ── Unassigned pool ──────────────────────────────────────────────── */}
      <div id="arm-unassigned-pool">
        {activeTeam && (
          <UnassignedPool
            players={unassignedPlayers}
            onAssignToTeam={playerId => onAssignPlayer(playerId, activeTeam.weekTeamId)}
            activeTeamName={activeTeam.teamName}
          />
        )}
      </div>
    </div>
  )
}
