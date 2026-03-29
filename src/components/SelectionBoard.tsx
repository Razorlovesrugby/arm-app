// src/components/SelectionBoard.tsx
// CP7-A Core Rebuild — clean build per spec
// Layout: Header → TeamTabs → BoardScrollArea → AddPlayersPill (fixed)
// Drag: dnd-kit PointerSensor + TouchSensor + DragOverlay ghost
// Sheets: Pool (unassigned players) rendered inline below board when open

import { useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Week } from '../lib/supabase'
import { useSelectionBoard, type SelectionTeam } from '../hooks/useSelectionBoard'
import PlayerOverlay from './PlayerOverlay'

// ─── Constants ────────────────────────────────────────────────────────────────

const RUGBY_POSITIONS: Record<number, string> = {
  1: 'Loosehead Prop',   2: 'Hooker',             3: 'Tighthead Prop',
  4: 'Lock',             5: 'Lock',               6: 'Blindside Flanker',
  7: 'Openside Flanker', 8: 'Number 8',           9: 'Scrum-half',
  10: 'Fly-half',        11: 'Left Wing',          12: 'Inside Centre',
  13: 'Outside Centre',  14: 'Right Wing',         15: 'Fullback',
}

const BOTTOM_NAV_H = 72  // px — matches Layout.tsx nav height
const PILL_H = 78        // px — pill wrapper height (10+50+16 padding)

// ─── Props ────────────────────────────────────────────────────────────────────

interface SelectionBoardProps {
  weekId: string | null
  weeks: Week[]
  onWeekChange?: (weekId: string) => void  // reserved for CP7-B
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function availDotColor(avail: string | null | undefined): string | null {
  if (avail === 'Available') return '#22c55e'
  if (avail === 'TBC') return '#f59e0b'
  return null
}

// ─── Ghost Row ────────────────────────────────────────────────────────────────

function GhostRow({ slot, startersCount }: { slot: number; startersCount: number }) {
  const hint = slot <= startersCount ? RUGBY_POSITIONS[slot] : null
  return (
    <div
      style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        borderBottom: '1px solid #0f0f0f',
        opacity: 0.3,
        background: '#000',
      }}
    >
      <span style={{ width: 22, textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
        {slot}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(255,255,255,0.2)' }}>Unfilled</span>
        {hint && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginLeft: 8 }}>{hint}</span>
        )}
      </div>
    </div>
  )
}

// ─── Filled Row ───────────────────────────────────────────────────────────────

interface FilledRowProps {
  slot: number
  playerId: string
  playerName: string
  primaryPosition: string | null
  availColor: string | null
  isCaptain: boolean
  isDragOverlay?: boolean
  onTapInfo: () => void
  onRemove: () => void
  sheetOpen: boolean
}

function FilledRow({
  slot, playerId, playerName, primaryPosition, availColor,
  isCaptain, isDragOverlay = false, onTapInfo, onRemove, sheetOpen,
}: FilledRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: playerId, disabled: isDragOverlay })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 1 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        height: 52,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 8px 0 12px',
        borderBottom: '1px solid #0f0f0f',
        background: '#000',
      }}
    >
      {/* Slot number */}
      <span style={{ width: 22, textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>
        {slot}
      </span>

      {/* Player info — only tap target for overlay */}
      <div
        onClick={sheetOpen ? undefined : onTapInfo}
        style={{
          flex: 1,
          minWidth: 0,
          cursor: sheetOpen ? 'default' : 'pointer',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {playerName}
          </span>
          {isCaptain && (
            <span style={{
              background: '#6B21A8', color: '#fff', fontSize: 9, fontWeight: 700,
              padding: '2px 5px', borderRadius: 3, flexShrink: 0,
            }}>C</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {primaryPosition ?? '—'}
        </div>
      </div>

      {/* Availability dot */}
      {availColor && (
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: availColor, flexShrink: 0 }} />
      )}

      {/* Drag handle — 44×44 touch target, only trigger for drag */}
      <div
        {...attributes}
        {...listeners}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 44, height: 44, flexShrink: 0,
          cursor: 'grab', touchAction: 'none',
          color: 'rgba(255,255,255,0.18)', fontSize: 18,
        }}
      >
        ⠿
      </div>

      {/* Remove button */}
      <RemoveButton onRemove={onRemove} />
    </div>
  )
}

// ─── Remove Button ────────────────────────────────────────────────────────────

function RemoveButton({ onRemove }: { onRemove: () => void }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => { setPressed(false); onRemove() }}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        border: pressed ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
        background: pressed ? 'rgba(239,68,68,0.15)' : 'transparent',
        color: pressed ? '#ef4444' : 'rgba(255,255,255,0.35)',
        fontSize: 12, cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.1s',
        // Expand touch target via padding trick
        padding: 8, margin: -8,
      }}
      aria-label="Remove player"
    >
      ✕
    </button>
  )
}

// ─── Bench Divider ────────────────────────────────────────────────────────────

function BenchDivider() {
  return (
    <div style={{ position: 'relative', margin: '6px 0', display: 'flex', alignItems: 'center' }}>
      <div style={{ flex: 1, borderTop: '1px dashed rgba(107,33,168,0.35)' }} />
      <span style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        background: '#000', padding: '0 8px',
        fontSize: 10, fontWeight: 700, color: 'rgba(107,33,168,0.55)',
        letterSpacing: '0.8px', textTransform: 'uppercase',
      }}>
        BENCH
      </span>
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ label, count, total }: { label: string; count: number; total?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px 4px' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
        {total !== undefined ? `${count} / ${total}` : count}
      </span>
    </div>
  )
}

// ─── Save Badge ───────────────────────────────────────────────────────────────

function SaveBadge({ status, onRetry }: { status: 'idle' | 'saved' | 'error'; onRetry: () => void }) {
  if (status === 'idle') return null
  if (status === 'saved') return (
    <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>✓ Saved</span>
  )
  return (
    <button
      onClick={onRetry}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#ef4444', padding: 0 }}
    >
      Save failed — tap to retry
    </button>
  )
}

// ─── Pool Sheet ───────────────────────────────────────────────────────────────

type PoolFilter = 'All' | 'Available' | 'TBC' | 'Forward' | 'Back'

const FORWARD_POSITIONS = ['Prop', 'Hooker', 'Lock', 'Flanker', 'Number 8']
const BACK_POSITIONS = ['Scrum-half', 'Fly-half', 'Centre', 'Wing', 'Fullback']

interface PoolSheetProps {
  teamName: string
  unassigned: ReturnType<typeof useSelectionBoard>['unassignedPlayers']
  availabilityMap: ReturnType<typeof useSelectionBoard>['availabilityMap']
  onAssign: (playerId: string) => void
  onClose: () => void
}

function PoolSheet({ teamName, unassigned, availabilityMap, onAssign, onClose }: PoolSheetProps) {
  const [activeFilter, setActiveFilter] = useState<PoolFilter>('All')

  const FILTERS: PoolFilter[] = ['All', 'Available', 'TBC', 'Forward', 'Back']

  const filtered = unassigned.filter(p => {
    const av = availabilityMap[p.id]?.availability
    const pos = p.primary_position ?? ''
    if (activeFilter === 'All') return true
    if (activeFilter === 'Available') return av === 'Available'
    if (activeFilter === 'TBC') return av === 'TBC'
    if (activeFilter === 'Forward') return FORWARD_POSITIONS.includes(pos)
    if (activeFilter === 'Back') return BACK_POSITIONS.includes(pos)
    return true
  })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }}
      />

      {/* Sheet */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#111', borderRadius: '16px 16px 0 0',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Add to {teamName}</span>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: '50%', background: '#222', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >✕</button>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', overflowX: 'auto', flexShrink: 0, borderBottom: '1px solid #1f1f1f', WebkitOverflowScrolling: 'touch' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                background: activeFilter === f ? '#6B21A8' : '#1a1a1a',
                color: activeFilter === f ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Player list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
              {unassigned.length === 0 ? 'All players assigned' : 'No players match this filter'}
            </div>
          ) : (
            filtered.map(p => {
              const av = availabilityMap[p.id]?.availability ?? null
              const dotColor = availDotColor(av)
              return (
                <div
                  key={p.id}
                  onClick={() => onAssign(p.id)}
                  style={{
                    height: 56, display: 'flex', alignItems: 'center',
                    padding: '0 16px', borderBottom: '1px solid #1a1a1a',
                    cursor: 'pointer', gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.primary_position ?? 'Unspecified'} · {p.player_type}
                    </div>
                  </div>
                  {av && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: dotColor ?? undefined, flexShrink: 0 }}>
                      {av}
                    </span>
                  )}
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(107,33,168,0.2)', border: '1px solid rgba(107,33,168,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#a855f7', fontSize: 18, fontWeight: 700,
                  }}>+</div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Board Content ────────────────────────────────────────────────────────────
// The sortable board rows for the active team

interface BoardContentProps {
  team: SelectionTeam
  availabilityMap: ReturnType<typeof useSelectionBoard>['availabilityMap']
  sheetOpen: boolean
  onTapPlayer: (playerId: string) => void
  onRemove: (playerId: string) => void
}

function BoardContent({ team, availabilityMap, sheetOpen, onTapPlayer, onRemove }: BoardContentProps) {
  const { weekTeam, players, captainId } = team
  const startersCount = weekTeam.starters_count ?? 15
  const benchCount = 8

  // Build slot array: filled players + ghost slots
  const starterPlayers = players.slice(0, startersCount)
  const benchPlayers = players.slice(startersCount)

  const startersAssigned = starterPlayers.filter(Boolean).length
  const benchAssigned = benchPlayers.filter(Boolean).length

  return (
    <>
      {/* Starters section */}
      <SectionHeader label="STARTERS" count={startersAssigned} total={startersCount} />
      {Array.from({ length: startersCount }, (_, i) => {
        const slot = i + 1
        const p = players[i]
        if (!p) return <GhostRow key={`ghost-starter-${slot}`} slot={slot} startersCount={startersCount} />
        const av = availabilityMap[p.id]?.availability ?? null
        return (
          <FilledRow
            key={p.id}
            slot={slot}
            playerId={p.id}
            playerName={p.name}
            primaryPosition={p.primary_position}
            availColor={availDotColor(av)}
            isCaptain={captainId === p.id}
            sheetOpen={sheetOpen}
            onTapInfo={() => onTapPlayer(p.id)}
            onRemove={() => onRemove(p.id)}
          />
        )
      })}

      {/* Bench divider */}
      <BenchDivider />

      {/* Bench section */}
      <SectionHeader label="BENCH" count={benchAssigned} />
      {Array.from({ length: benchCount }, (_, i) => {
        const slot = startersCount + i + 1
        const p = players[startersCount + i]
        if (!p) return <GhostRow key={`ghost-bench-${slot}`} slot={slot} startersCount={startersCount} />
        const av = availabilityMap[p.id]?.availability ?? null
        return (
          <FilledRow
            key={p.id}
            slot={slot}
            playerId={p.id}
            playerName={p.name}
            primaryPosition={p.primary_position}
            availColor={availDotColor(av)}
            isCaptain={captainId === p.id}
            sheetOpen={sheetOpen}
            onTapInfo={() => onTapPlayer(p.id)}
            onRemove={() => onRemove(p.id)}
          />
        )
      })}

      {/* Bottom padding so last row isn't hidden behind pill */}
      <div style={{ height: PILL_H + BOTTOM_NAV_H }} />
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SelectionBoard({ weekId, weeks }: SelectionBoardProps) {
  const board = useSelectionBoard(weekId)
  const { teams, unassignedPlayers, availabilityMap, allPlayers, loading, error, saveStatus, assignPlayer, removePlayer, reorderTeam, setCaptain } = board

  // ── Active team state ──────────────────────────────────────────────────
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)

  // Auto-select first visible team on data load
  useEffect(() => {
    if (teams.length > 0 && !activeTeamId) {
      setActiveTeamId(teams[0].weekTeam.id)
    }
    if (teams.length === 0) setActiveTeamId(null)
  }, [teams])

  const activeTeam = teams.find(t => t.weekTeam.id === activeTeamId) ?? teams[0] ?? null

  // ── Sheet state ────────────────────────────────────────────────────────
  const [poolOpen, setPoolOpen] = useState(false)
  const [overlayPlayerId, setOverlayPlayerId] = useState<string | null>(null)
  const sheetOpen = poolOpen || overlayPlayerId !== null

  // ── Drag state ─────────────────────────────────────────────────────────
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  function handleDragStart(event: DragStartEvent) {
    if (sheetOpen) return  // guard: no drag when a sheet is open
    setDraggingId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null)
    if (!activeTeam) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const playerIds = activeTeam.players.map(p => p.id)
    const oldIndex = playerIds.indexOf(active.id as string)
    const newIndex = playerIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = arrayMove(playerIds, oldIndex, newIndex)
    reorderTeam(activeTeam.weekTeam.id, newOrder)
  }

  // ── Week label for header ──────────────────────────────────────────────
  const activeWeek = weeks.find(w => w.id === weekId)
  const weekLabel = activeWeek?.label ?? null

  // ── Overlay player ─────────────────────────────────────────────────────
  const overlayPlayer = overlayPlayerId
    ? allPlayers.find(p => p.id === overlayPlayerId) ?? null
    : null
  const overlaySlot = overlayPlayer && activeTeam
    ? (activeTeam.players.findIndex(p => p.id === overlayPlayerId) + 1) || null
    : null
  const overlayAvailResponse = overlayPlayerId ? availabilityMap[overlayPlayerId] ?? null : null
  const overlayIsCaptain = activeTeam?.captainId === overlayPlayerId

  // ── Dragging player (for ghost overlay) ───────────────────────────────
  const draggingPlayer = draggingId ? allPlayers.find(p => p.id === draggingId) : null
  const draggingSlot = draggingId && activeTeam
    ? activeTeam.players.findIndex(p => p.id === draggingId) + 1
    : null

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#000', color: '#fff', overflow: 'hidden' }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, background: '#000',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #111',
      }}>
        {/* Week label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {weekLabel ? (
            <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{weekLabel}</span>
          ) : (
            <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)' }}>Select a week</span>
          )}
          <span style={{ color: '#6B21A8', fontSize: 14 }}>▾</span>
        </div>

        {/* Right: save badge + gear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SaveBadge status={saveStatus} onRetry={() => board.setSaveStatus('idle')} />
          <button
            style={{ width: 32, height: 32, background: '#1a1a1a', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Team management"
          >⚙</button>
        </div>
      </div>

      {/* ── Team tabs ────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        display: 'flex', overflowX: 'auto', gap: 0,
        borderBottom: '1px solid #1a1a1a',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        {teams.map(t => {
          const isActive = t.weekTeam.id === activeTeamId
          return (
            <button
              key={t.weekTeam.id}
              onClick={() => setActiveTeamId(t.weekTeam.id)}
              style={{
                flexShrink: 0, padding: '10px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                borderBottom: isActive ? '2px solid #6B21A8' : '2px solid transparent',
                whiteSpace: 'nowrap',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {t.weekTeam.team_name}
            </button>
          )
        })}
      </div>

      {/* ── Board scroll area ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: 32, color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading…</div>
        )}

        {!loading && error && (
          <div style={{ textAlign: 'center', padding: 32, color: '#ef4444', fontSize: 14 }}>{error}</div>
        )}

        {!loading && !error && !activeTeam && weekId && (
          <div style={{ textAlign: 'center', padding: 32, color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No teams for this week.</div>
        )}

        {!loading && !error && !weekId && (
          <div style={{ textAlign: 'center', padding: 32, color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Select a week to view the board.</div>
        )}

        {!loading && !error && activeTeam && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={activeTeam.players.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <BoardContent
                team={activeTeam}
                availabilityMap={availabilityMap}
                sheetOpen={sheetOpen}
                onTapPlayer={setOverlayPlayerId}
                onRemove={(pid) => removePlayer(activeTeam.weekTeam.id, pid)}
              />
            </SortableContext>

            {/* DragOverlay — floating ghost, renders at highest z-index */}
            <DragOverlay>
              {draggingPlayer && draggingSlot !== null ? (
                <div style={{
                  height: 52, display: 'flex', alignItems: 'center', gap: 8,
                  padding: '0 12px', background: '#1a1a1a', borderRadius: 8,
                  border: '1px solid rgba(107,33,168,0.4)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                  width: '90vw', maxWidth: 400,
                }}>
                  <span style={{ width: 22, textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>{draggingSlot}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', flex: 1 }}>{draggingPlayer.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* ── Add Players pill (fixed above nav) ───────────────────────────── */}
      {activeTeam && (
        <div
          style={{
            flexShrink: 0,
            padding: '10px 16px 16px',
            background: 'linear-gradient(to top, #000 55%, transparent)',
            position: 'relative', zIndex: 10,
          }}
        >
          <button
            onClick={() => setPoolOpen(true)}
            style={{
              width: '100%', height: 50, background: '#6B21A8', border: 'none',
              borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 700,
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}
            onPointerDown={e => (e.currentTarget.style.background = '#581c87')}
            onPointerUp={e => (e.currentTarget.style.background = '#6B21A8')}
            onPointerLeave={e => (e.currentTarget.style.background = '#6B21A8')}
          >
            + Add Players
          </button>
        </div>
      )}

      {/* ── Pool sheet ────────────────────────────────────────────────────── */}
      {poolOpen && activeTeam && (
        <PoolSheet
          teamName={activeTeam.weekTeam.team_name}
          unassigned={unassignedPlayers}
          availabilityMap={availabilityMap}
          onAssign={(pid) => {
            assignPlayer(activeTeam.weekTeam.id, pid)
            setPoolOpen(false)
          }}
          onClose={() => setPoolOpen(false)}
        />
      )}

      {/* ── Player overlay ────────────────────────────────────────────────── */}
      {overlayPlayer && activeTeam && (
        <PlayerOverlay
          player={overlayPlayer}
          slot={overlaySlot}
          isCaptain={overlayIsCaptain}
          availabilityResponse={overlayAvailResponse}
          onSetCaptain={(isCaptain) => {
            setCaptain(activeTeam.weekTeam.id, isCaptain ? overlayPlayer.id : null)
          }}
          onClose={() => setOverlayPlayerId(null)}
        />
      )}

    </div>
  )
}
