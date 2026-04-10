// src/components/PlayerOverlay.tsx
// CP7-A Rebuild — full dark theme, captain toggle, positions chips,
// info grid, auto-save coach notes, conditional selection note
// CP7-B — lastTeam / lastPlayed wired from playerHistory (replaces "—" placeholders)

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Player, AvailabilityResponse } from '../lib/supabase'

// ─── Props ────────────────────────────────────────────────────────────────────

interface PlayerOverlayProps {
  player: Player
  slot: number | null
  isCaptain: boolean
  availabilityResponse: AvailabilityResponse | null
  lastTeam: string | null    // CP7-B: from playerHistory RPC
  lastPlayed: string | null  // CP7-B: formatted "d MMM" or null
  weekLabel: string | null   // BUG-FIX-B: current week label for Availability Note heading
  onSetCaptain: (isCaptain: boolean) => void
  onClose: () => void
}

// ─── Info Cell ────────────────────────────────────────────────────────────────

function InfoCell({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '10px 12px', flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: valueColor ?? '#fff' }}>
        {value}
      </div>
    </div>
  )
}

// ─── Captain Toggle ───────────────────────────────────────────────────────────

function CaptainToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 44, height: 26,
        background: on ? '#6B21A8' : '#333',
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlayerOverlay({
  player, slot, isCaptain, availabilityResponse, lastTeam, lastPlayed, weekLabel, onSetCaptain, onClose,
}: PlayerOverlayProps) {
  const [captainState, setCaptainState] = useState(isCaptain)
  const [coachNotes, setCoachNotes] = useState(player.notes ?? '')
  const [notesSaveStatus, setNotesSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [kickingPct, setKickingPct] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Lock body scroll while overlay is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Sync when player changes
  useEffect(() => {
    setCaptainState(isCaptain)
    setCoachNotes(player.notes ?? '')
    setNotesSaveStatus('idle')
  }, [player.id, isCaptain, player.notes])

  // Fetch career kicking stats
  useEffect(() => {
    async function fetchKickingStats() {
      const { data } = await supabase
        .from('match_events')
        .select('event_type')
        .eq('player_id', player.id)

      if (data) {
        let makes = 0
        let total = 0

        data.forEach(event => {
          if (event.event_type === 'conversion' || event.event_type === 'penalty') {
            makes++
            total++
          } else if (event.event_type === 'Conversion Miss' || event.event_type === 'Penalty Miss') {
            total++
          }
        })

        if (total > 0) {
          setKickingPct(Math.round((makes / total) * 100))
        } else {
          setKickingPct(null)
        }
      }
    }

    fetchKickingStats()
  }, [player.id])

  // Debounced save for coach notes
  const saveNotes = useCallback(async (value: string) => {
    const { error } = await supabase
      .from('players')
      .update({ notes: value.trim() || null })
      .eq('id', player.id)

    if (!error) {
      setNotesSaveStatus('saved')
      setTimeout(() => setNotesSaveStatus('idle'), 1800)
    } else {
      setNotesSaveStatus('error')
    }
  }, [player.id])

  function handleNotesInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setCoachNotes(val)
    setNotesSaveStatus('idle')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => saveNotes(val), 800)
  }

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  function handleCaptainToggle() {
    const newVal = !captainState
    setCaptainState(newVal)
    onSetCaptain(newVal)
  }

  // Availability display
  const av = availabilityResponse?.availability ?? null
  const avLabel = av === 'Available' ? 'Available' : av === 'TBC' ? 'TBC' : '—'
  const avColor = av === 'Available' ? '#22c55e' : av === 'TBC' ? '#f59e0b' : undefined

  // Positions
  const primaryPos = player.primary_position ?? null
  const secondaryPos = player.secondary_positions ?? []
  const allPositions = primaryPos
    ? [primaryPos, ...secondaryPos.filter(p => p !== primaryPos)]
    : secondaryPos

  // Selection note (availability_note from player's submission)
  const selectionNote = availabilityResponse?.availability_note ?? null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 51,
        background: '#111',
        borderRadius: '16px 16px 0 0',
        maxHeight: '88vh',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* Drag pill */}
        <div style={{ width: 36, height: 4, background: '#333', borderRadius: 2, margin: '12px auto 0' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 16px 12px' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{player.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>
              {primaryPos ?? 'Unspecified'}{slot ? ` · Slot ${slot}` : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: '50%', background: '#222', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Section 1 — Captain toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Captain</span>
            <CaptainToggle on={captainState} onToggle={handleCaptainToggle} />
          </div>

          {/* Section 2 — Info grid (2x2) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <InfoCell label="Last Team"   value={lastTeam   ?? '—'} />
            <InfoCell label="Last Played" value={lastPlayed ?? '—'} />
            <InfoCell label="Availability" value={avLabel} valueColor={avColor} />
            <InfoCell label="Kicking %" value={kickingPct !== null ? `${kickingPct}%` : '—'} />
          </div>

          {/* Section 3 — Positions */}
          {allPositions.length > 0 && (
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', marginBottom: 8, fontWeight: 600 }}>
                Positions
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allPositions.map((pos, i) => (
                  <span
                    key={pos}
                    style={{
                      padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: i === 0 ? 'rgba(107,33,168,0.15)' : '#1a1a1a',
                      border: i === 0 ? '1px solid rgba(107,33,168,0.35)' : '1px solid #2a2a2a',
                      color: i === 0 ? '#a855f7' : 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {pos}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section 4 — Coach Notes (auto-save debounced) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', fontWeight: 600 }}>
                Coach Notes
              </div>
              {notesSaveStatus === 'saved' && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>✓ Saved</span>
              )}
              {notesSaveStatus === 'error' && (
                <span style={{ fontSize: 11, color: '#ef4444' }}>Save failed</span>
              )}
            </div>
            <textarea
              value={coachNotes}
              onChange={handleNotesInput}
              placeholder="Add a note…"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: 10, padding: '10px 12px',
                fontSize: 14, color: '#fff', resize: 'vertical',
                outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                minHeight: 72,
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(107,33,168,0.5)')}
              onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
            />
          </div>

          {/* Section 5 — Availability Note (amber callout, conditional, read-only) */}
          {selectionNote && selectionNote.trim().length > 0 && (
            <div style={{ background: '#FEF9C3', borderRadius: 10, borderLeft: '3px solid #EAB308', padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>
                Availability Note{weekLabel ? ` — Week of ${weekLabel}` : ''}
              </div>
              <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.5 }}>
                {selectionNote}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
