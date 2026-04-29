// src/pages/Grid.tsx
// Phase 15.1 — Availability Dashboard (training + availability combined)

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { Availability } from '../lib/supabase'

interface AvPlayer {
  id: string
  name: string
  status: string
}

interface AvWeek {
  id: string
  label: string
  start_date: string
}

interface AvailabilityRow {
  playerId: string
  playerName: string
  trainingAttended: number
  totalSessions: number
  currentAvailability: Availability | null
  nextAvailability: Availability | null
}

const STATUS_CONFIG: Record<Availability, { bg: string; color: string; label: string }> = {
  Available:   { bg: '#DCFCE7', color: '#15803D', label: 'Available' },
  TBC:         { bg: '#FEF3C7', color: '#B45309', label: 'TBC' },
  Unavailable: { bg: '#FEE2E2', color: '#B91C1C', label: 'Unavailable' },
}

function StatusBadge({ status }: { status: Availability | null | undefined }) {
  if (!status) {
    return (
      <span style={{
        display: 'inline-block', padding: '3px 8px', borderRadius: 6,
        background: '#F3F4F6', color: '#9CA3AF', fontSize: 12, fontWeight: 600,
      }}>
        —
      </span>
    )
  }
  const cfg = STATUS_CONFIG[status]
  return (
    <span style={{
      display: 'inline-block', padding: '3px 8px', borderRadius: 6,
      background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600,
    }}>
      {cfg.label}
    </span>
  )
}

function formatWeekDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export default function Grid() {
  const [players, setPlayers] = useState<AvPlayer[]>([])
  const [weeks, setWeeks] = useState<AvWeek[]>([]) // weeks[0] = current, weeks[1] = next
  const [totalSessions, setTotalSessions] = useState(1)
  // attendance: Record<playerId, attended count for current week>
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({})
  // availability: Record<`${playerId}:${weekId}`, Availability>
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, Availability>>({})
  const [showInactive, setShowInactive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    const today = new Date().toISOString().split('T')[0]

    const [playersRes, weeksRes, settingsRes] = await Promise.all([
      supabase
        .from('players')
        .select('id, name, status')
        .eq('is_retired', false)
        .in('status', ['Active', 'Injured', 'Unavailable'])
        .order('name', { ascending: true }),
      supabase
        .from('weeks')
        .select('id, label, start_date')
        .gte('end_date', today)
        .eq('status', 'Open')
        .order('start_date', { ascending: true })
        .limit(2),
      supabase
        .from('club_settings')
        .select('training_days')
        .limit(1)
        .single(),
    ])

    if (playersRes.error) { setError(playersRes.error.message); setLoading(false); return }
    if (weeksRes.error) { setError(weeksRes.error.message); setLoading(false); return }

    const fetchedPlayers = (playersRes.data ?? []) as AvPlayer[]
    const fetchedWeeks = (weeksRes.data ?? []) as AvWeek[]
    const trainingDays = (settingsRes.data?.training_days as { id: string }[] | null) ?? [{ id: '1' }]
    const total = trainingDays.length > 0 ? trainingDays.length : 1

    setPlayers(fetchedPlayers)
    setWeeks(fetchedWeeks)
    setTotalSessions(total)

    if (fetchedPlayers.length === 0 || fetchedWeeks.length === 0) {
      setAttendanceCounts({})
      setAvailabilityMap({})
      setLoading(false)
      return
    }

    const playerIds = fetchedPlayers.map(p => p.id)
    const weekIds = fetchedWeeks.map(w => w.id)
    const currentWeekId = fetchedWeeks[0]?.id

    const [attRes, avRes] = await Promise.all([
      currentWeekId
        ? supabase
            .from('training_attendance')
            .select('player_id, attended')
            .eq('week_id', currentWeekId)
            .in('player_id', Array.isArray(playerIds) ? playerIds : [])
            .eq('attended', true)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('availability_responses')
        .select('player_id, week_id, availability')
        .in('week_id', Array.isArray(weekIds) ? weekIds : [])
        .in('player_id', Array.isArray(playerIds) ? playerIds : []),
    ])

    if (attRes.error) { setError(attRes.error.message); setLoading(false); return }
    if (avRes.error) { setError(avRes.error.message); setLoading(false); return }

    // Build attendance count per player for current week
    const counts: Record<string, number> = {}
    for (const row of attRes.data ?? []) {
      counts[row.player_id] = (counts[row.player_id] ?? 0) + 1
    }
    setAttendanceCounts(counts)

    // Build availability map
    const avMap: Record<string, Availability> = {}
    for (const row of avRes.data ?? []) {
      avMap[`${row.player_id}:${row.week_id}`] = row.availability
    }
    setAvailabilityMap(avMap)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const visiblePlayers = useMemo(
    () => showInactive ? players : players.filter(p => p.status === 'Active'),
    [players, showInactive]
  )

  const rows = useMemo<AvailabilityRow[]>(() => {
    const currentWeekId = weeks[0]?.id ?? null
    const nextWeekId = weeks[1]?.id ?? null
    return visiblePlayers.map(p => ({
      playerId: p.id,
      playerName: p.name,
      trainingAttended: attendanceCounts[p.id] ?? 0,
      totalSessions,
      currentAvailability: currentWeekId ? (availabilityMap[`${p.id}:${currentWeekId}`] ?? null) : null,
      nextAvailability: nextWeekId ? (availabilityMap[`${p.id}:${nextWeekId}`] ?? null) : null,
    }))
  }, [visiblePlayers, weeks, attendanceCounts, availabilityMap, totalSessions])

  const currentWeek = weeks[0] ?? null
  const nextWeek = weeks[1] ?? null

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <div style={{
          width: 36, height: 36,
          border: '3px solid #E5E7EB',
          borderTopColor: '#0062F4',
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
        <div style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: 10, padding: 16, fontSize: 14 }}>
          Failed to load availability: {error}
          <button
            onClick={fetchAll}
            style={{ marginLeft: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #B91C1C', background: 'transparent', color: '#B91C1C', fontSize: 13, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!currentWeek) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', gap: 12, textAlign: 'center' }}>
        <span style={{ fontSize: 40 }}>📅</span>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>No current week</p>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
          Create open weeks with future dates to see the availability dashboard.
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
          Add players to the roster to see them here.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F8F8F8' }}>
      {/* Page header */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '14px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>Availability</h1>
          <button
            onClick={() => setShowInactive(v => !v)}
            style={{
              fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', border: 'none',
              background: showInactive ? '#E8F0FE' : '#F3F4F6',
              color: showInactive ? '#0062F4' : '#6B7280',
            }}
          >
            {showInactive ? 'Active + Inactive' : 'Active only'}
          </button>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>
          {visiblePlayers.length} players · {currentWeek.label}
          {nextWeek ? ` + ${nextWeek.label}` : ''}
        </p>
      </div>

      {/* Scrollable table */}
      <div style={{ flex: 1, overflow: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' as any }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto' }}>
          <thead>
            <tr>
              {/* Player col — sticky top + left */}
              <th style={{
                position: 'sticky', top: 0, left: 0, zIndex: 30,
                background: '#FFFFFF',
                borderRight: '1px solid #E5E7EB',
                borderBottom: '2px solid #E5E7EB',
                padding: '10px 14px',
                minWidth: 140,
                textAlign: 'left',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Player</span>
              </th>

              {/* Training — current week */}
              <th style={{
                position: 'sticky', top: 0, zIndex: 20,
                background: '#FFFFFF',
                borderBottom: '2px solid #E5E7EB',
                borderRight: '1px solid #F3F4F6',
                padding: '10px 12px',
                minWidth: 90,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Training</div>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{formatWeekDate(currentWeek.start_date)}</div>
              </th>

              {/* Availability — current week */}
              <th style={{
                position: 'sticky', top: 0, zIndex: 20,
                background: '#FFFFFF',
                borderBottom: '2px solid #E5E7EB',
                borderRight: '1px solid #F3F4F6',
                padding: '10px 12px',
                minWidth: 110,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Availability</div>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{formatWeekDate(currentWeek.start_date)}</div>
              </th>

              {/* Availability — next week (only if exists) */}
              {nextWeek && (
                <th style={{
                  position: 'sticky', top: 0, zIndex: 20,
                  background: '#FFFFFF',
                  borderBottom: '2px solid #E5E7EB',
                  borderRight: '1px solid #F3F4F6',
                  padding: '10px 12px',
                  minWidth: 110,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Availability</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{formatWeekDate(nextWeek.start_date)}</div>
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => {
              const isOdd = idx % 2 === 1
              return (
                <tr key={row.playerId} style={{ background: isOdd ? '#F9FAFB' : '#FFFFFF' }}>
                  {/* Sticky player name */}
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 10,
                    background: isOdd ? '#F9FAFB' : '#FFFFFF',
                    borderRight: '1px solid #E5E7EB',
                    borderBottom: '1px solid #E5E7EB',
                    padding: '10px 14px',
                    minWidth: 140, maxWidth: 180,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{row.playerName}</span>
                  </td>

                  {/* Training ratio */}
                  <td style={{
                    borderBottom: '1px solid #E5E7EB',
                    borderRight: '1px solid #F3F4F6',
                    padding: '10px 12px',
                    textAlign: 'center',
                  }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: row.trainingAttended > 0 ? '#15803D' : '#9CA3AF',
                    }}>
                      {row.trainingAttended}/{row.totalSessions}
                    </span>
                  </td>

                  {/* Current week availability */}
                  <td style={{
                    borderBottom: '1px solid #E5E7EB',
                    borderRight: '1px solid #F3F4F6',
                    padding: '10px 12px',
                    textAlign: 'center',
                  }}>
                    <StatusBadge status={row.currentAvailability} />
                  </td>

                  {/* Next week availability */}
                  {nextWeek && (
                    <td style={{
                      borderBottom: '1px solid #E5E7EB',
                      borderRight: '1px solid #F3F4F6',
                      padding: '10px 12px',
                      textAlign: 'center',
                    }}>
                      <StatusBadge status={row.nextAvailability} />
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
