import { useState } from 'react'
import { Users, ChevronDown, X, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PlayerWithAvailability, TeamSelectionState } from '../hooks/useSelectionBoard'
import { WeekWithTeams } from '../hooks/useWeeks'

// ─── Availability badge helpers ───────────────────────────────────────────────

function availBadgeStyle(avail: string | null): React.CSSProperties {
  if (avail === 'Available') return { background: '#DCFCE7', color: '#15803D' }
  if (avail === 'TBC') return { background: '#FEF3C7', color: '#B45309' }
  if (avail === 'Unavailable') return { background: '#FEE2E2', color: '#B91C1C' }
  return { background: '#F3F4F6', color: '#6B7280' }
}

function availLabel(avail: string | null): string {
  if (avail === 'Available') return 'Available'
  if (avail === 'TBC') return 'TBC'
  if (avail === 'Unavailable') return 'Unavailable'
  return 'No response'
}

// ─── Shared: compact player chip (used in both mobile + desktop) ──────────────

interface PlayerChipProps {
  player: PlayerWithAvailability
  showAvailBadge?: boolean
  showRemove?: boolean
  onRemove?: () => void
  onTap?: () => void
  dragging?: boolean
  dragHandle?: React.ReactNode
}

export function PlayerChip({
  player,
  showAvailBadge = false,
  showRemove = false,
  onRemove,
  onTap,
  dragging = false,
  dragHandle,
}: PlayerChipProps) {
  return (
    <div
      onClick={onTap}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        background: dragging ? '#F3E8FF' : '#FFFFFF',
        border: `1px solid ${dragging ? '#6B21A8' : '#E5E7EB'}`,
        borderRadius: '10px',
        cursor: onTap ? 'pointer' : 'default',
        opacity: dragging ? 0.5 : 1,
        transition: 'border-color 0.1s',
      }}
    >
      {dragHandle && (
        <span style={{ color: '#D1D5DB', display: 'flex', flexShrink: 0, cursor: 'grab' }}>
          {dragHandle}
        </span>
      )}
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
        {player.primary_position && (
          <p style={{ margin: '1px 0 0', fontSize: '12px', color: '#6B7280' }}>
            {player.primary_position}
          </p>
        )}
      </div>
      {showAvailBadge && (
        <span style={{
          ...availBadgeStyle(player.latestAvailability),
          padding: '2px 8px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: '600',
          flexShrink: 0,
        }}>
          {availLabel(player.latestAvailability)}
        </span>
      )}
      {showRemove && onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
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
      )}
    </div>
  )
}

// ─── Sortable player chip (dnd-kit) ──────────────────────────────────────────

interface SortablePlayerChipProps {
  id: string
  player: PlayerWithAvailability
  onRemove?: () => void
  onTap?: () => void
}

function SortablePlayerChip({ id, player, onRemove, onTap }: SortablePlayerChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <PlayerChip
        player={player}
        showRemove={true}
        onRemove={onRemove}
        onTap={onTap}
        dragging={isDragging}
        dragHandle={<span {...listeners}><GripVertical size={16} /></span>}
      />
    </div>
  )
}

// ─── Mobile: Assign dropdown row ─────────────────────────────────────────────

interface AssignRowProps {
  player: PlayerWithAvailability
  teams: TeamSelectionState[]
  onAssign: (toWeekTeamId: string) => void
  onTap: () => void
}

function AssignRow({ player, teams, onAssign, onTap }: AssignRowProps) {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
      }}
    >
      {/* Player info */}
      <div style={{ flex: 1, minWidth: 0 }} onClick={onTap} role="button" tabIndex={0}>
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
        {player.primary_position && (
          <p style={{ margin: '1px 0 0', fontSize: '12px', color: '#6B7280' }}>
            {player.primary_position}
          </p>
        )}
      </div>

      {/* Avail badge */}
      <span style={{
        ...availBadgeStyle(player.latestAvailability),
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: '600',
        flexShrink: 0,
      }}>
        {availLabel(player.latestAvailability)}
      </span>

      {/* Team dropdown */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            background: '#F8F8F8',
            fontSize: '13px',
            fontWeight: '600',
            color: '#374151',
            cursor: 'pointer',
          }}
        >
          Add to
          <ChevronDown size={13} />
        </button>

        {open && (
          <>
            <div
              onClick={() => setOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 40,
              }}
            />
            <div style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 4px)',
              zIndex: 50,
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              minWidth: '120px',
              overflow: 'hidden',
            }}>
              {teams.map(team => (
                <button
                  key={team.weekTeamId}
                  onClick={() => {
                    setOpen(false)
                    onAssign(team.weekTeamId)
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 14px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#111827',
                    cursor: 'pointer',
                    borderBottom: '1px solid #F3F4F6',
                  }}
                >
                  {team.teamName}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Mobile: Team view (single team, swipeable) ───────────────────────────────

interface MobileTeamViewProps {
  team: TeamSelectionState
  playerMap: Record<string, PlayerWithAvailability>
  onRemove: (playerId: string) => void
  onReorder: (weekTeamId: string, newIds: string[]) => void
  onPlayerTap: (player: PlayerWithAvailability) => void
}

function MobileTeamView({
  team,
  playerMap,
  onRemove,
  onReorder,
  onPlayerTap,
}: MobileTeamViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = team.playerIds.indexOf(String(active.id))
    const newIndex = team.playerIds.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    const newIds = arrayMove(team.playerIds, oldIndex, newIndex)
    onReorder(team.weekTeamId, newIds)
  }

  const starters = team.playerIds.slice(0, team.startersCount)
  const reserves = team.playerIds.slice(team.startersCount)

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Starters section */}
          {starters.length > 0 && (
            <p style={{
              margin: '0 0 4px',
              fontSize: '11px',
              fontWeight: '600',
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Starters ({starters.length}/{team.startersCount})
            </p>
          )}
          {starters.map(playerId => {
            const player = playerMap[playerId]
            if (!player) return null
            return (
              <SortablePlayerChip
                key={playerId}
                id={playerId}
                player={player}
                onRemove={() => onRemove(playerId)}
                onTap={() => onPlayerTap(player)}
              />
            )
          })}

          {/* Reserves section */}
          {reserves.length > 0 && (
            <p style={{
              margin: '8px 0 4px',
              fontSize: '11px',
              fontWeight: '600',
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Reserves ({reserves.length})
            </p>
          )}
          {reserves.map(playerId => {
            const player = playerMap[playerId]
            if (!player) return null
            return (
              <SortablePlayerChip
                key={playerId}
                id={playerId}
                player={player}
                onRemove={() => onRemove(playerId)}
                onTap={() => onPlayerTap(player)}
              />
            )
          })}

          {team.playerIds.length === 0 && (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              color: '#9CA3AF',
              fontSize: '13px',
              border: '2px dashed #E5E7EB',
              borderRadius: '10px',
            }}>
              No players assigned yet
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}

// ─── Desktop: Droppable column ────────────────────────────────────────────────

interface DesktopColumnProps {
  team: TeamSelectionState
  playerMap: Record<string, PlayerWithAvailability>
  onRemove: (playerId: string) => void
  onPlayerTap: (player: PlayerWithAvailability) => void
  activeId: string | null
}

function DesktopColumn({
  team,
  playerMap,
  onRemove,
  onPlayerTap,
  activeId,
}: DesktopColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${team.weekTeamId}` })

  const starters = team.playerIds.slice(0, team.startersCount)
  const reserves = team.playerIds.slice(team.startersCount)

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: '1 1 0',
        minWidth: '160px',
        background: isOver ? '#F3E8FF' : '#F8F8F8',
        borderRadius: '12px',
        border: `2px solid ${isOver ? '#6B21A8' : '#E5E7EB'}`,
        transition: 'border-color 0.15s, background 0.15s',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Column header */}
      <div style={{
        padding: '12px 12px 8px',
        borderBottom: '1px solid #E5E7EB',
        background: '#FFFFFF',
        borderRadius: '10px 10px 0 0',
      }}>
        <p style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: '700',
          color: '#111827',
        }}>
          {team.teamName}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B7280' }}>
          {team.playerIds.length} player{team.playerIds.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Players */}
      <SortableContext items={team.playerIds} strategy={verticalListSortingStrategy}>
        <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {starters.length > 0 && (
            <p style={{
              margin: '0 0 2px',
              fontSize: '10px',
              fontWeight: '600',
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Starters ({starters.length}/{team.startersCount})
            </p>
          )}
          {starters.map(playerId => {
            const player = playerMap[playerId]
            if (!player) return null
            return (
              <SortablePlayerChip
                key={playerId}
                id={playerId}
                player={player}
                onRemove={() => onRemove(playerId)}
                onTap={() => onPlayerTap(player)}
              />
            )
          })}
          {reserves.length > 0 && (
            <p style={{
              margin: '6px 0 2px',
              fontSize: '10px',
              fontWeight: '600',
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Reserves ({reserves.length})
            </p>
          )}
          {reserves.map(playerId => {
            const player = playerMap[playerId]
            if (!player) return null
            return (
              <SortablePlayerChip
                key={playerId}
                id={playerId}
                player={player}
                onRemove={() => onRemove(playerId)}
                onTap={() => onPlayerTap(player)}
              />
            )
          })}
          {team.playerIds.length === 0 && (
            <div style={{
              padding: '16px 8px',
              textAlign: 'center',
              color: '#D1D5DB',
              fontSize: '12px',
              border: '2px dashed #E5E7EB',
              borderRadius: '8px',
              marginTop: '4px',
            }}>
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ─── Desktop: Unassigned droppable column ─────────────────────────────────────

interface DesktopUnassignedColumnProps {
  unassignedPlayers: PlayerWithAvailability[]
  onPlayerTap: (player: PlayerWithAvailability) => void
  activeId: string | null
}

function DesktopUnassignedColumn({
  unassignedPlayers,
  onPlayerTap,
  activeId,
}: DesktopUnassignedColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'col-unassigned' })

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: '1 1 0',
        minWidth: '160px',
        background: isOver ? '#F0FDF4' : '#F8F8F8',
        borderRadius: '12px',
        border: `2px solid ${isOver ? '#16A34A' : '#E5E7EB'}`,
        transition: 'border-color 0.15s, background 0.15s',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{
        padding: '12px 12px 8px',
        borderBottom: '1px solid #E5E7EB',
        background: '#FFFFFF',
        borderRadius: '10px 10px 0 0',
      }}>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#111827' }}>
          Available
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B7280' }}>
          {unassignedPlayers.length} unassigned
        </p>
      </div>
      <SortableContext
        items={unassignedPlayers.map(p => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {unassignedPlayers.map(player => (
            <SortablePlayerChip
              key={player.id}
              id={player.id}
              player={player}
              onTap={() => onPlayerTap(player)}
            />
          ))}
          {unassignedPlayers.length === 0 && (
            <p style={{
              margin: '12px 0',
              textAlign: 'center',
              fontSize: '12px',
              color: '#D1D5DB',
            }}>
              All assigned
            </p>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ─── Main SelectionBoard component ───────────────────────────────────────────

export interface SelectionBoardProps {
  week: WeekWithTeams
  playerMap: Record<string, PlayerWithAvailability>
  unassignedPlayers: PlayerWithAvailability[]
  teams: TeamSelectionState[]
  loading: boolean
  error: string | null
  onAssignPlayer: (playerId: string, toWeekTeamId: string) => Promise<void>
  onRemovePlayer: (playerId: string, fromWeekTeamId: string) => Promise<void>
  onReorderTeam: (weekTeamId: string, newIds: string[]) => Promise<void>
  onMovePlayer: (playerId: string, fromWeekTeamId: string | null, toWeekTeamId: string) => Promise<void>
  onPlayerTap: (player: PlayerWithAvailability) => void
}

export default function SelectionBoard({
  week,
  playerMap,
  unassignedPlayers,
  teams,
  loading,
  error,
  onAssignPlayer,
  onRemovePlayer,
  onReorderTeam,
  onMovePlayer,
  onPlayerTap,
}: SelectionBoardProps) {
  const isMobile = window.innerWidth < 768

  // Mobile swipe state
  const [mobileView, setMobileView] = useState<'unassigned' | number>('unassigned')
  // 'unassigned' = show available players list; number = team index (0-based)

  // Desktop drag state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeFromTeamId, setActiveFromTeamId] = useState<string | null>(null)

  const desktopSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  // ─── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}>
        <div style={{ textAlign: 'center', color: '#6B7280' }}>
          <div style={{
            width: '28px', height: '28px',
            border: '3px solid #E5E7EB',
            borderTopColor: '#6B21A8',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 10px',
          }} />
          <p style={{ margin: 0, fontSize: '13px' }}>Loading selection board…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        background: '#FEE2E2',
        borderRadius: '10px',
        padding: '14px 16px',
        color: '#B91C1C',
        fontSize: '14px',
      }}>
        Error: {error}
      </div>
    )
  }

  // ─── Desktop drag-drop handlers ────────────────────────────────────────────

  function findTeamContainingPlayer(playerId: string): string | null {
    for (const team of teams) {
      if (team.playerIds.includes(playerId)) return team.weekTeamId
    }
    return null
  }

  function handleDesktopDragStart(event: DragStartEvent) {
    const id = String(event.active.id)
    setActiveId(id)
    setActiveFromTeamId(findTeamContainingPlayer(id))
  }

  function handleDesktopDragOver(_event: DragOverEvent) {
    // Visual feedback handled by useDroppable isOver state in columns
  }

  function handleDesktopDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    setActiveFromTeamId(null)
    if (!over) return

    const draggedId = String(active.id)
    const overId = String(over.id)

    // Dropped on a column droppable
    if (overId.startsWith('col-')) {
      const colId = overId.replace('col-', '')
      if (colId === 'unassigned') {
        // Move back to unassigned
        const fromTeam = findTeamContainingPlayer(draggedId)
        if (fromTeam) onRemovePlayer(draggedId, fromTeam)
      } else {
        // Move to team column
        const fromTeam = findTeamContainingPlayer(draggedId)
        onMovePlayer(draggedId, fromTeam, colId)
      }
      return
    }

    // Dropped on another player (reorder within team or cross-team)
    const targetTeam = teams.find(t => t.playerIds.includes(overId))
    if (!targetTeam) return

    const sourceTeamId = findTeamContainingPlayer(draggedId)

    if (sourceTeamId === targetTeam.weekTeamId) {
      // Same team — reorder
      const oldIndex = targetTeam.playerIds.indexOf(draggedId)
      const newIndex = targetTeam.playerIds.indexOf(overId)
      if (oldIndex !== -1 && newIndex !== -1) {
        const newIds = arrayMove(targetTeam.playerIds, oldIndex, newIndex)
        onReorderTeam(targetTeam.weekTeamId, newIds)
      }
    } else {
      // Different team — move
      onMovePlayer(draggedId, sourceTeamId, targetTeam.weekTeamId)
    }
  }

  // ─── Mobile layout ─────────────────────────────────────────────────────────

  if (isMobile) {
    const currentTeamIndex = typeof mobileView === 'number' ? mobileView : null
    const currentTeam = currentTeamIndex !== null ? teams[currentTeamIndex] : null
    const totalViews = teams.length + 1 // unassigned + N teams
    const currentViewIndex = mobileView === 'unassigned' ? 0 : (mobileView as number) + 1

    function goLeft() {
      if (mobileView === 'unassigned') return
      if (mobileView === 0) setMobileView('unassigned')
      else setMobileView((mobileView as number) - 1)
    }

    function goRight() {
      if (mobileView === 'unassigned') setMobileView(0)
      else if ((mobileView as number) < teams.length - 1) setMobileView((mobileView as number) + 1)
    }

    return (
      <div>
        {/* Mobile nav bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '14px',
        }}>
          <button
            onClick={goLeft}
            disabled={mobileView === 'unassigned'}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              cursor: mobileView === 'unassigned' ? 'not-allowed' : 'pointer',
              color: mobileView === 'unassigned' ? '#D1D5DB' : '#374151',
              display: 'flex', alignItems: 'center',
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <div style={{
            flex: 1,
            textAlign: 'center',
            fontSize: '15px',
            fontWeight: '700',
            color: '#111827',
          }}>
            {mobileView === 'unassigned'
              ? `Available (${unassignedPlayers.length})`
              : currentTeam
                ? `${currentTeam.teamName} (${currentTeam.playerIds.length})`
                : ''}
          </div>

          <button
            onClick={goRight}
            disabled={typeof mobileView === 'number' && mobileView === teams.length - 1}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              cursor: (typeof mobileView === 'number' && mobileView === teams.length - 1) ? 'not-allowed' : 'pointer',
              color: (typeof mobileView === 'number' && mobileView === teams.length - 1) ? '#D1D5DB' : '#374151',
              display: 'flex', alignItems: 'center',
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Progress dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '6px',
          marginBottom: '16px',
        }}>
          {Array.from({ length: totalViews }).map((_, i) => (
            <button
              key={i}
              onClick={() => setMobileView(i === 0 ? 'unassigned' : i - 1)}
              style={{
                width: currentViewIndex === i ? '20px' : '8px',
                height: '8px',
                borderRadius: '999px',
                background: currentViewIndex === i ? '#6B21A8' : '#E5E7EB',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'width 0.2s, background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Unassigned view */}
        {mobileView === 'unassigned' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {unassignedPlayers.length === 0 && (
              <div style={{
                padding: '32px 24px',
                textAlign: 'center',
                color: '#9CA3AF',
                fontSize: '14px',
              }}>
                <Users size={32} color="#E5E7EB" style={{ marginBottom: '8px' }} />
                <p style={{ margin: 0 }}>All available players have been assigned.</p>
              </div>
            )}
            {unassignedPlayers.map(player => (
              <AssignRow
                key={player.id}
                player={player}
                teams={teams}
                onAssign={toWeekTeamId => onAssignPlayer(player.id, toWeekTeamId)}
                onTap={() => onPlayerTap(player)}
              />
            ))}
          </div>
        )}

        {/* Team view */}
        {typeof mobileView === 'number' && currentTeam && (
          <MobileTeamView
            team={currentTeam}
            playerMap={playerMap}
            onRemove={playerId => onRemovePlayer(playerId, currentTeam.weekTeamId)}
            onReorder={onReorderTeam}
            onPlayerTap={onPlayerTap}
          />
        )}
      </div>
    )
  }

  // ─── Desktop / tablet layout ───────────────────────────────────────────────

  const activePlayer = activeId ? playerMap[activeId] : null

  return (
    <DndContext
      sensors={desktopSensors}
      collisionDetection={closestCenter}
      onDragStart={handleDesktopDragStart}
      onDragOver={handleDesktopDragOver}
      onDragEnd={handleDesktopDragEnd}
    >
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        overflowX: 'auto',
        paddingBottom: '8px',
      }}>
        {/* Unassigned column */}
        <DesktopUnassignedColumn
          unassignedPlayers={unassignedPlayers}
          onPlayerTap={onPlayerTap}
          activeId={activeId}
        />

        {/* Team columns */}
        {teams.map(team => (
          <DesktopColumn
            key={team.weekTeamId}
            team={team}
            playerMap={playerMap}
            onRemove={playerId => onRemovePlayer(playerId, team.weekTeamId)}
            onPlayerTap={onPlayerTap}
            activeId={activeId}
          />
        ))}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activePlayer && (
          <PlayerChip
            player={activePlayer}
            showAvailBadge={true}
            dragging={false}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
