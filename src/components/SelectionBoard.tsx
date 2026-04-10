// src/components/SelectionBoard.tsx
// CP7-A Core Rebuild — clean build per spec
// CP7-B additions:
//   • Week Picker sheet — tap week label to switch weeks
//   • Team Management sheet — tap ⚙ to rename/adjust starters/hide team
//   • Player history wired into PlayerOverlay (Last Team / Last Played)
//   • activeTeamId auto-resets on week switch or team visibility change
// Layout: Header → TeamTabs → BoardScrollArea → AddPlayersPill (fixed)
// Drag: dnd-kit PointerSensor + TouchSensor + DragOverlay ghost

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
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
import type { Week, WeekTeam, Player } from '../lib/supabase'
import { useSelectionBoard, selectionTeamsToPDF, type SelectionTeam } from '../hooks/useSelectionBoard'
import { useClubSettings } from '../hooks/useClubSettings'
import PlayerOverlay from './PlayerOverlay'
import { PDFDownloadButton } from './PDFDownloadLink'

// ─── Constants ────────────────────────────────────────────────────────────────

const RUGBY_POSITIONS: Record<number, string> = {
  1: 'Loosehead Prop',   2: 'Hooker',             3: 'Tighthead Prop',
  4: 'Lock',             5: 'Lock',               6: 'Blindside Flanker',
  7: 'Openside Flanker', 8: 'Number 8',           9: 'Scrum-half',
  10: 'Fly-half',        11: 'Left Wing',          12: 'Inside Centre',
  13: 'Outside Centre',  14: 'Right Wing',         15: 'Fullback',
}

const BOTTOM_NAV_H = 72   // px — matches Layout.tsx nav height
const PILL_H      = 78    // px — pill wrapper height

// ─── Props ────────────────────────────────────────────────────────────────────

interface SelectionBoardProps {
  initialWeekId: string | null
  weeks: Week[]
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatWeekDate(dateStr: string): string {
  // "2026-03-22" → "Sun 22 Mar"
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function availDotColor(avail: string | null | undefined): string | null {
  if (avail === 'Available') return '#22c55e'
  if (avail === 'TBC')       return '#f59e0b'
  return null
}

// ─── Toggle (used in Team Management sheet) ───────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 44, height: 26,
        background: on ? '#6B21A8' : '#D1D5DB',
        borderRadius: 13, position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 3, left: on ? 21 : 3,
        width: 20, height: 20,
        background: '#fff', borderRadius: '50%',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }} />
    </div>
  )
}

// ─── Droppable Ghost Row ──────────────────────────────────────────────────────
// Each empty slot is registered as a dnd-kit droppable so it is a valid drop
// target. Slot number is always visible. Visual highlight fires when the user
// drags a filled row over this slot.

function DroppableGhostRow({ slot, startersCount }: { slot: number; startersCount: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${slot}` })
  const hint = slot <= startersCount ? RUGBY_POSITIONS[slot] : null
  return (
    <div
      ref={setNodeRef}
      style={{
        height: 52, display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 12px', borderBottom: '1px solid #E5E7EB',
        background: isOver ? 'rgba(107,33,168,0.08)' : '#FFFFFF',
        outline: isOver ? '1px dashed rgba(107,33,168,0.55)' : 'none',
        outlineOffset: '-1px',
        transition: 'background 0.1s',
        opacity: isOver ? 0.9 : 0.35,
      }}
    >
      <span style={{ width: 22, textAlign: 'right', fontSize: 12, fontWeight: 700, color: isOver ? 'rgba(107,33,168,0.9)' : '#9CA3AF', flexShrink: 0, transition: 'color 0.1s' }}>
        {slot}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontStyle: 'italic', color: isOver ? 'rgba(107,33,168,0.7)' : '#9CA3AF', transition: 'color 0.1s' }}>
          {isOver ? 'Drop here' : 'Unfilled'}
        </span>
        {hint && !isOver && (
          <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 8 }}>{hint}</span>
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: playerId, disabled: isDragOverlay })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex:  isDragging ? 1 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        height: 52, display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 8px 0 12px', borderBottom: '1px solid #E5E7EB', background: '#FFFFFF',
      }}
    >
      <span style={{ width: 22, textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#6B7280', flexShrink: 0 }}>
        {slot}
      </span>

      <div
        onClick={sheetOpen ? undefined : onTapInfo}
        style={{ flex: 1, minWidth: 0, cursor: sheetOpen ? 'default' : 'pointer', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', whiteSpace: 'normal', wordBreak: 'break-word' }}>
            {playerName}
          </span>
          {isCaptain && (
            <span style={{ background: '#6B21A8', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3, flexShrink: 0 }}>C</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'normal', wordBreak: 'break-word' }}>
          {primaryPosition ?? '—'}
        </div>
      </div>

      {availColor && (
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: availColor, flexShrink: 0 }} />
      )}

      <div
        {...attributes} {...listeners}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, flexShrink: 0, cursor: 'grab', touchAction: 'none', color: '#D1D5DB', fontSize: 18 }}
      >
        ⠿
      </div>

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
        border: pressed ? '1px solid rgba(220,38,38,0.5)' : '1px solid #E5E7EB',
        background: pressed ? 'rgba(220,38,38,0.15)' : '#FFFFFF',
        color: pressed ? '#DC2626' : '#6B7280',
        fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.1s', padding: 8, margin: -8,
      }}
      aria-label="Remove player"
    >✕</button>
  )
}

// ─── Bench Divider ────────────────────────────────────────────────────────────

function BenchDivider() {
  return (
    <div style={{ position: 'relative', margin: '6px 0', display: 'flex', alignItems: 'center' }}>
      <div style={{ flex: 1, borderTop: '1px dashed rgba(107,33,168,0.35)' }} />
      <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', background: '#F8F8F8', padding: '0 8px', fontSize: 10, fontWeight: 700, color: 'rgba(107,33,168,0.55)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
        BENCH
      </span>
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ label, count, total }: { label: string; count: number; total?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px 4px' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: '#6B7280' }}>
        {total !== undefined ? `${count} / ${total}` : count}
      </span>
    </div>
  )
}

// ─── Save Badge ───────────────────────────────────────────────────────────────

function SaveBadge({ status, onRetry }: { status: 'idle' | 'saved' | 'error'; onRetry: () => void }) {
  if (status === 'idle') return null
  if (status === 'saved') return <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>✓ Saved</span>
  return (
    <button onClick={onRetry} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#DC2626', padding: 0 }}>
      Save failed — tap to retry
    </button>
  )
}

// ─── Pool Sheet ───────────────────────────────────────────────────────────────

type PoolFilter = 'All' | 'Available' | 'TBC' | 'Forward' | 'Back'

const FORWARD_POSITIONS = ['Prop', 'Hooker', 'Lock', 'Flanker', 'Number 8']
const BACK_POSITIONS    = ['Scrum-half', 'Fly-half', 'Centre', 'Wing', 'Fullback']

interface PoolSheetProps {
  teamName: string
  unassigned: ReturnType<typeof useSelectionBoard>['unassignedPlayers']
  availabilityMap: ReturnType<typeof useSelectionBoard>['availabilityMap']
  onAssign: (playerId: string) => void
  onOpenOverlay: (playerId: string) => void   // BUG-FIX-C: row tap opens PlayerOverlay
  onClose: () => void
}

function PoolSheet({ teamName, unassigned, availabilityMap, onAssign, onOpenOverlay, onClose }: PoolSheetProps) {
  const [activeFilter, setActiveFilter] = useState<PoolFilter>('All')
  const FILTERS: PoolFilter[] = ['All', 'Available', 'TBC', 'Forward', 'Back']

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const filtered = unassigned.filter(p => {
    const av  = availabilityMap[p.id]?.availability
    const pos = p.primary_position ?? ''
    if (activeFilter === 'All')       return true
    if (activeFilter === 'Available') return av === 'Available'
    if (activeFilter === 'TBC')       return av === 'TBC'
    if (activeFilter === 'Forward')   return FORWARD_POSITIONS.includes(pos)
    if (activeFilter === 'Back')      return BACK_POSITIONS.includes(pos)
    return true
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />

      <div style={{ position: 'relative', zIndex: 1, background: '#FFFFFF', borderRadius: '16px 16px 0 0', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Add to {teamName}</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: '#F3F4F6', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', overflowX: 'auto', flexShrink: 0, borderBottom: '1px solid #E5E7EB', WebkitOverflowScrolling: 'touch' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, background: activeFilter === f ? '#6B21A8' : '#F3F4F6', color: activeFilter === f ? '#fff' : '#6B7280' }}
            >{f}</button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', fontSize: 14, color: '#6B7280' }}>
              {unassigned.length === 0 ? 'All players assigned' : 'No players match this filter'}
            </div>
          ) : (
            filtered.map(p => {
              const av       = availabilityMap[p.id]?.availability ?? null
              const dotColor = availDotColor(av)
              return (
                // BUG-FIX-C: row tap → opens PlayerOverlay; "+" button → assigns (stopPropagation)
                <div
                  key={p.id}
                  onClick={() => onOpenOverlay(p.id)}
                  style={{ minHeight: 56, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #E5E7EB', cursor: 'pointer', gap: 12 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', whiteSpace: 'normal', wordBreak: 'break-word' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {p.primary_position ?? 'Unspecified'} · {p.player_type}
                    </div>
                  </div>
                  {av && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: dotColor ?? undefined, flexShrink: 0 }}>{av}</span>
                  )}
                  <div
                    onClick={(e) => { e.stopPropagation(); onAssign(p.id) }}
                    style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'rgba(107,33,168,0.2)', border: '1px solid rgba(107,33,168,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7', fontSize: 18, fontWeight: 700, cursor: 'pointer' }}
                  >+</div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Team Management Sheet (CP7-B) ────────────────────────────────────────────

interface TeamManagementSheetProps {
  team: WeekTeam
  saveStatus: 'idle' | 'saved' | 'error'
  onSave: (patch: Partial<Pick<WeekTeam, 'team_name' | 'starters_count' | 'visible' | 'is_active'>>) => Promise<boolean>
  onClose: () => void
}

function TeamManagementSheet({ team, saveStatus, onSave, onClose }: TeamManagementSheetProps) {
  const [name,     setName]     = useState(team.team_name)
  const [starters, setStarters] = useState(team.starters_count ?? 15)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  const [visible,  setVisible]  = useState(team.visible)
  const [isActive, setIsActive] = useState(team.is_active ?? true)
  const [saving,   setSaving]   = useState(false)

  // Re-sync if team prop changes (e.g. switched active team while sheet open — shouldn't happen but safe)
  useEffect(() => {
    setName(team.team_name)
    setStarters(team.starters_count ?? 15)
    setVisible(team.visible)
    setIsActive(team.is_active ?? true)
  }, [team.id])

  const canSave = name.trim().length > 0

  async function handleSave() {
    if (!canSave || saving) return
    setSaving(true)
    const success = await onSave({ team_name: name.trim(), starters_count: starters, visible, is_active: isActive })
    setSaving(false)
    if (success) onClose()   // only close on success; error badge stays visible on failure
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />

      <div style={{ position: 'relative', zIndex: 1, background: '#FFFFFF', borderRadius: '16px 16px 0 0', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Drag pill */}
        <div style={{ width: 36, height: 4, background: '#E5E7EB', borderRadius: 2, margin: '12px auto 0' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Manage Team</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: '#F3F4F6', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Field 1 — Team Name */}
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#6B7280', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>
              Team Name
            </div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Team name"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#FFFFFF', border: '1px solid #E5E7EB',
                borderRadius: 10, padding: '10px 12px',
                fontSize: 15, color: '#111827', outline: 'none', fontFamily: 'inherit',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(107,33,168,0.5)')}
              onBlur={e  => (e.target.style.borderColor = '#E5E7EB')}
            />
          </div>

          {/* Field 2 — Starters Count */}
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#6B7280', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 10 }}>
              Starters
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'center' }}>
              <button
                onClick={() => setStarters(s => Math.max(1, s - 1))}
                style={{ width: 38, height: 38, background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 10, color: '#111827', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
              >−</button>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#111827', minWidth: 32, textAlign: 'center' }}>
                {starters}
              </span>
              <button
                onClick={() => setStarters(s => Math.min(22, s + 1))}
                style={{ width: 38, height: 38, background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 10, color: '#111827', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
              >+</button>
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#6B7280', marginTop: 8 }}>
              Slots 1–{starters} = starters
            </div>
          </div>

          {/* Field 3 — Visibility */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Show this team</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Hide tab on the board this week</div>
            </div>
            <Toggle on={visible} onToggle={() => setVisible(v => !v)} />
          </div>

          {/* Field 4 — Team Active (Bye toggle) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Team playing</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                Off = Bye. Skips empty-player warning on Close Week.
              </div>
            </div>
            <Toggle on={isActive} onToggle={() => setIsActive(v => !v)} />
          </div>

          {/* Save Changes */}
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            style={{
              width: '100%', height: 46,
              background: canSave && !saving ? '#6B21A8' : '#F3F4F6',
              border: 'none', borderRadius: 12,
              cursor: canSave && !saving ? 'pointer' : 'not-allowed',
              fontSize: 15, fontWeight: 700, color: canSave && !saving ? '#fff' : '#9CA3AF',
              transition: 'background 0.15s',
            }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>

          {saveStatus === 'error' && (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#DC2626', marginTop: -8 }}>
              Save failed — please try again
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ─── Week Picker Sheet (CP7-B) ────────────────────────────────────────────────

interface WeekPickerSheetProps {
  weeks: Week[]
  activeWeekId: string | null
  onSelect: (weekId: string) => void
  onClose: () => void
}

function WeekPickerSheet({ weeks, activeWeekId, onSelect, onClose }: WeekPickerSheetProps) {
  // Most recent first
  const sorted = [...weeks].sort((a, b) =>
    new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  )

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />

      <div style={{ position: 'relative', zIndex: 1, background: '#FFFFFF', borderRadius: '16px 16px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Drag pill */}
        <div style={{ width: 36, height: 4, background: '#E5E7EB', borderRadius: 2, margin: '12px auto 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Select Week</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: '#F3F4F6', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Week list */}
        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', flex: 1 }}>
          {sorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', fontSize: 14, color: '#6B7280' }}>
              No weeks yet. Create one in the Weeks screen.
            </div>
          ) : (
            sorted.map(w => {
              const isActive = w.id === activeWeekId
              return (
                <div
                  key={w.id}
                  onClick={() => { if (!isActive) onSelect(w.id); else onClose() }}
                  style={{ height: 60, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #E5E7EB', cursor: 'pointer', gap: 12 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                      {formatWeekDate(w.start_date)}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      {w.label}
                    </div>
                  </div>
                  {/* Purple checkmark — opacity 0 when inactive (preserves layout) */}
                  <span style={{ fontSize: 16, color: '#6B21A8', opacity: isActive ? 1 : 0, flexShrink: 0 }}>✓</span>
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

interface BoardContentProps {
  team: SelectionTeam
  availabilityMap: ReturnType<typeof useSelectionBoard>['availabilityMap']
  sheetOpen: boolean
  onTapPlayer: (playerId: string) => void
  onRemove: (playerId: string) => void
  defaultSquadSize: number
}

function BoardContent({ team, availabilityMap, sheetOpen, onTapPlayer, onRemove, defaultSquadSize }: BoardContentProps) {
  const { weekTeam, players, captainId } = team
  const startersCount = weekTeam.starters_count ?? 15
  const benchCount    = Math.max(0, defaultSquadSize - startersCount)

  const starterPlayers = players.slice(0, startersCount)
  const benchPlayers   = players.slice(startersCount)

  const startersAssigned = starterPlayers.filter(Boolean).length
  const benchAssigned    = benchPlayers.filter(Boolean).length

  return (
    <>
      <SectionHeader label="STARTERS" count={startersAssigned} total={startersCount} />
      {Array.from({ length: startersCount }, (_, i) => {
        const slot = i + 1
        const p    = players[i]
        if (!p) return <DroppableGhostRow key={`ghost-starter-${slot}`} slot={slot} startersCount={startersCount} />
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

      <BenchDivider />

      <SectionHeader label="BENCH" count={benchAssigned} />
      {Array.from({ length: benchCount }, (_, i) => {
        const slot = startersCount + i + 1
        const p    = players[startersCount + i]
        if (!p) return <DroppableGhostRow key={`ghost-bench-${slot}`} slot={slot} startersCount={startersCount} />
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

      <div style={{ height: PILL_H + BOTTOM_NAV_H }} />
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SelectionBoard({ initialWeekId, weeks }: SelectionBoardProps) {
  const board = useSelectionBoard(initialWeekId)
  const {
    activeWeekId, setActiveWeekId,
    teams, allWeekTeams,
    unassignedPlayers, availabilityMap, allPlayers,
    playerHistory,
    loading, error, saveStatus,
    assignPlayer, removePlayer, reorderTeam, setCaptain, saveTeamSettings,
  } = board

  const { clubSettings } = useClubSettings()

  // ── Active team state ──────────────────────────────────────────────────────

  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)

  // Keep activeTeamId valid when teams list changes (week switch or team hidden)
  const teamIdsKey = teams.map(t => t.weekTeam.id).join(',')
  useEffect(() => {
    if (teams.length === 0) {
      setActiveTeamId(null)
      return
    }
    const stillValid = teams.some(t => t.weekTeam.id === activeTeamId)
    if (!stillValid) {
      setActiveTeamId(teams[0].weekTeam.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamIdsKey])

  const activeTeam = teams.find(t => t.weekTeam.id === activeTeamId) ?? teams[0] ?? null

  // Gear button target: active team, OR first allWeekTeam if all tabs hidden
  const gearTarget = activeTeam?.weekTeam ?? allWeekTeams[0] ?? null

  // ── Sheet state ────────────────────────────────────────────────────────────

  const [poolOpen,      setPoolOpen]      = useState(false)
  const [teamMgmtOpen,  setTeamMgmtOpen]  = useState(false)
  const [weekPickerOpen, setWeekPickerOpen] = useState(false)
  const [overlayPlayerId, setOverlayPlayerId] = useState<string | null>(null)

  const sheetOpen = poolOpen || overlayPlayerId !== null || teamMgmtOpen || weekPickerOpen

  // Close pool if week switches (stale team data)
  useEffect(() => {
    setPoolOpen(false)
    setTeamMgmtOpen(false)
    setOverlayPlayerId(null)
  }, [activeWeekId])

  // ── Week picker handler ────────────────────────────────────────────────────

  const handleWeekSelect = useCallback((weekId: string) => {
    setActiveTeamId(null)  // reset — teamIdsKey effect will re-select first team
    setActiveWeekId(weekId)
    setWeekPickerOpen(false)
  }, [setActiveWeekId])

  // ── Drag state ─────────────────────────────────────────────────────────────

  const [draggingId, setDraggingId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  function handleDragStart(event: DragStartEvent) {
    if (sheetOpen) return
    setDraggingId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null)
    if (!activeTeam) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const { weekTeam, players } = activeTeam
    const startersCount = weekTeam.starters_count ?? 15
    const squadSize     = clubSettings?.default_squad_size ?? 22
    const BENCH_COUNT   = Math.max(0, squadSize - startersCount)
    const totalSlots    = startersCount + BENCH_COUNT
    const activeId = active.id as string
    const overId   = over.id   as string

    if (overId.startsWith('slot-')) {
      // ── Drop onto a ghost (empty) slot ──────────────────────────────────
      // Place the dragged player at the exact target slot; vacate source slot.
      const targetIndex = parseInt(overId.replace('slot-', ''), 10) - 1  // 0-based
      if (targetIndex < 0 || targetIndex >= totalSlots) return

      // Build a sparse array covering at least totalSlots entries
      const currentOrder: (string | null)[] = Array.from(
        { length: Math.max(totalSlots, players.length) },
        (_, i) => { const p = players[i]; return p ? p.id : null }
      )

      const sourceIndex = currentOrder.indexOf(activeId)
      if (sourceIndex === -1) return

      const newOrder = [...currentOrder]
      newOrder[sourceIndex] = null     // vacate source slot
      newOrder[targetIndex] = activeId // fill target slot
      reorderTeam(weekTeam.id, newOrder)

    } else {
      // ── Drop onto another filled player row (normal reorder) ─────────────
      // Compact reorder among filled slots — slot numbers shift accordingly.
      const filledIds = players
        .filter((p): p is Player => p !== null)
        .map(p => p.id)
      const oldIndex = filledIds.indexOf(activeId)
      const newIndex = filledIds.indexOf(overId)
      if (oldIndex === -1 || newIndex === -1) return

      reorderTeam(weekTeam.id, arrayMove(filledIds, oldIndex, newIndex))
    }
  }

  // ── Week label for header ──────────────────────────────────────────────────

  const activeWeek = weeks.find(w => w.id === activeWeekId)
  const weekLabel  = activeWeek ? formatWeekDate(activeWeek.start_date) : null

  // ── Overlay player ─────────────────────────────────────────────────────────

  const overlayPlayer       = overlayPlayerId ? allPlayers.find(p => p.id === overlayPlayerId) ?? null : null
  const overlaySlot         = overlayPlayer && activeTeam ? (activeTeam.players.findIndex(p => p !== null && p.id === overlayPlayerId) + 1) || null : null
  const overlayAvailResponse = overlayPlayerId ? availabilityMap[overlayPlayerId] ?? null : null
  const overlayIsCaptain    = activeTeam?.captainId === overlayPlayerId
  const overlayHistory      = overlayPlayerId ? playerHistory[overlayPlayerId] ?? null : null

  // ── Dragging player ────────────────────────────────────────────────────────

  const draggingPlayer = draggingId ? allPlayers.find(p => p.id === draggingId) : null
  const draggingSlot   = draggingId && activeTeam ? (activeTeam.players.findIndex(p => p !== null && p.id === draggingId) + 1) || null : null

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F8F8F8', color: '#111827', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      {/* paddingTop: Layout.tsx now handles env(safe-area-inset-top) globally — no per-component fix needed */}
      <div style={{ flexShrink: 0, background: '#FFFFFF', paddingTop: '10px', paddingBottom: '10px', paddingLeft: '16px', paddingRight: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB' }}>
        {/* Week label — tappable, opens Week Picker */}
        <button
          onClick={() => setWeekPickerOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, WebkitTapHighlightColor: 'transparent' }}
        >
          {weekLabel ? (
            <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{weekLabel}</span>
          ) : (
            <span style={{ fontSize: 15, color: '#6B7280' }}>Select a week</span>
          )}
          <span style={{ color: '#6B21A8', fontSize: 14 }}>▾</span>
        </button>

        {/* Right: save badge + PDF + gear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SaveBadge status={saveStatus} onRetry={() => board.setSaveStatus('idle')} />
          {teams.length > 0 && (
            <PDFDownloadButton
              teams={selectionTeamsToPDF(teams, {
                matchDate: activeWeek ? formatWeekDate(activeWeek.start_date) : undefined,
              })}
              brandColor={clubSettings?.primary_color ?? '#1e40af'}
              clubName={clubSettings?.club_name}
              fileName="team-sheet.pdf"
              dark
            />
          )}
          <button
            onClick={() => gearTarget && setTeamMgmtOpen(true)}
            disabled={!gearTarget}
            style={{ width: 32, height: 32, background: '#F3F4F6', border: 'none', borderRadius: 8, cursor: gearTarget ? 'pointer' : 'default', fontSize: 16, color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Team management"
          >⚙</button>
        </div>
      </div>

      {/* ── Team tabs ──────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, display: 'flex', overflowX: 'auto', gap: 0, borderBottom: '1px solid #E5E7EB', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
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
                color: isActive ? '#111827' : '#6B7280',
                borderBottom: isActive ? '2px solid #6B21A8' : '2px solid transparent',
                whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent',
              }}
            >
              {t.weekTeam.team_name}
            </button>
          )
        })}
      </div>

      {/* ── Board scroll area ──────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch',
          opacity: loading ? 0.4 : 1, transition: 'opacity 0.15s',
        }}
      >
        {loading && teams.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#6B7280', fontSize: 14 }}>Loading…</div>
        )}

        {!loading && error && (
          <div style={{ textAlign: 'center', padding: 32, color: '#DC2626', fontSize: 14 }}>{error}</div>
        )}

        {!loading && !error && !activeTeam && activeWeekId && (
          <div style={{ textAlign: 'center', padding: 32, color: '#6B7280', fontSize: 14 }}>No teams for this week.</div>
        )}

        {!loading && !error && !activeWeekId && (
          <div style={{ textAlign: 'center', padding: 32, color: '#6B7280', fontSize: 14 }}>Select a week to view the board.</div>
        )}

        {!loading && !error && activeTeam && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={activeTeam.players.filter((p): p is Player => p !== null).map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <BoardContent
                team={activeTeam}
                availabilityMap={availabilityMap}
                sheetOpen={sheetOpen}
                onTapPlayer={setOverlayPlayerId}
                onRemove={(pid) => removePlayer(activeTeam.weekTeam.id, pid)}
                defaultSquadSize={clubSettings?.default_squad_size ?? 22}
              />
            </SortableContext>

            <DragOverlay>
              {draggingPlayer && draggingSlot !== null ? (
                <div style={{ height: 52, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: '#FFFFFF', borderRadius: 8, border: '1px solid rgba(107,33,168,0.4)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', width: '90vw', maxWidth: 400 }}>
                  <span style={{ width: 22, textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#6B7280' }}>{draggingSlot}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', flex: 1 }}>{draggingPlayer.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* ── Add Players pill ───────────────────────────────────────────────── */}
      {activeTeam && (
        <div style={{ flexShrink: 0, padding: '10px 16px 16px', background: 'linear-gradient(to top, #F8F8F8 55%, transparent)', position: 'relative', zIndex: 10 }}>
          <button
            onClick={() => setPoolOpen(true)}
            style={{ width: '100%', height: 50, background: '#6B21A8', border: 'none', borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}
            onPointerDown={e => (e.currentTarget.style.background = '#581c87')}
            onPointerUp={e   => (e.currentTarget.style.background = '#6B21A8')}
            onPointerLeave={e => (e.currentTarget.style.background = '#6B21A8')}
          >
            + Add Players
          </button>
        </div>
      )}

      {/* ── Pool sheet ─────────────────────────────────────────────────────── */}
      {poolOpen && activeTeam && (
        <PoolSheet
          teamName={activeTeam.weekTeam.team_name}
          unassigned={unassignedPlayers}
          availabilityMap={availabilityMap}
          onAssign={(pid) => { assignPlayer(activeTeam.weekTeam.id, pid); }}
          onOpenOverlay={(pid) => { setPoolOpen(false); setOverlayPlayerId(pid) }}
          onClose={() => setPoolOpen(false)}
        />
      )}

      {/* ── Team Management sheet (CP7-B) ──────────────────────────────────── */}
      {teamMgmtOpen && gearTarget && (
        <TeamManagementSheet
          team={gearTarget}
          saveStatus={saveStatus}
          onSave={(patch) => saveTeamSettings(gearTarget.id, patch)}
          onClose={() => setTeamMgmtOpen(false)}
        />
      )}

      {/* ── Week Picker sheet (CP7-B) ──────────────────────────────────────── */}
      {weekPickerOpen && (
        <WeekPickerSheet
          weeks={weeks}
          activeWeekId={activeWeekId}
          onSelect={handleWeekSelect}
          onClose={() => setWeekPickerOpen(false)}
        />
      )}

      {/* ── Player overlay ─────────────────────────────────────────────────── */}
      {overlayPlayer && (
        <PlayerOverlay
          player={overlayPlayer}
          slot={overlaySlot}
          isCaptain={overlayIsCaptain}
          availabilityResponse={overlayAvailResponse}
          lastTeam={overlayHistory?.lastTeam ?? null}
          lastPlayed={overlayHistory?.lastPlayed ?? null}
          weekLabel={activeWeek?.label ?? null}
          onSetCaptain={(isCaptain) => {
            if (activeTeam) setCaptain(activeTeam.weekTeam.id, isCaptain ? overlayPlayer.id : null)
          }}
          onClose={() => setOverlayPlayerId(null)}
        />
      )}

    </div>
  )
}
