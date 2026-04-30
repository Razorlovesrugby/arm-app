// src/pages/Attendance.tsx
// Phase 15.1 — Training Attendance Matrix

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface AttendancePlayer {
  id: string
  name: string
  status: string
}

interface AttendanceWeek {
  id: string
  label: string
  start_date: string
}

interface TrainingDay {
  id: string
  label: string
}

// key: `${playerId}:${weekId}:${sessionId}` → attended boolean
type AttendanceMap = Record<string, boolean>

function formatWeekDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export default function Attendance() {
  const { activeClubId } = useAuth()
  const [players, setPlayers] = useState<AttendancePlayer[]>([])
  const [weeks, setWeeks] = useState<AttendanceWeek[]>([])
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([])
  const [attendanceMap, setAttendanceMap] = useState<AttendanceMap>({})
  const [showInactive, setShowInactive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastError, setToastError] = useState<string | null>(null)

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
        .order('start_date', { ascending: true }),
      supabase
        .from('club_settings')
        .select('training_days')
        .limit(1)
        .single(),
    ])

    if (playersRes.error) { setError(playersRes.error.message); setLoading(false); return }
    if (weeksRes.error) { setError(weeksRes.error.message); setLoading(false); return }

    const fetchedPlayers = (playersRes.data ?? []) as AttendancePlayer[]
    const fetchedWeeks = (weeksRes.data ?? []) as AttendanceWeek[]
    const days: TrainingDay[] = (settingsRes.data?.training_days as TrainingDay[] | null) ?? [{ id: '1', label: 'Wednesday' }]

    setPlayers(fetchedPlayers)
    setWeeks(fetchedWeeks)
    setTrainingDays(days.length > 0 ? days : [{ id: '1', label: 'Wednesday' }])

    if (fetchedPlayers.length === 0 || fetchedWeeks.length === 0) {
      setAttendanceMap({})
      setLoading(false)
      return
    }

    const weekIds = fetchedWeeks.map(w => w.id)
    const playerIds = fetchedPlayers.map(p => p.id)

    const { data: attData, error: attError } = await supabase
      .from('training_attendance')
      .select('player_id, week_id, session_id, attended')
      .in('week_id', Array.isArray(weekIds) ? weekIds : [])
      .in('player_id', Array.isArray(playerIds) ? playerIds : [])

    if (attError) { setError(attError.message); setLoading(false); return }

    const map: AttendanceMap = {}
    for (const row of attData ?? []) {
      map[`${row.player_id}:${row.week_id}:${row.session_id}`] = row.attended
    }
    setAttendanceMap(map)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function toggleAttendance(playerId: string, weekId: string, sessionId: string) {
    if (!activeClubId) {
      console.error('toggleAttendance aborted: no active club ID')
      setToastError('Failed to save attendance')
      setTimeout(() => setToastError(null), 3000)
      return
    }

    const key = `${playerId}:${weekId}:${sessionId}`
    const current = attendanceMap[key] ?? false
    const next = !current

    // Optimistic update
    setAttendanceMap(prev => ({ ...prev, [key]: next }))

    const { error: upsertError } = await supabase
      .from('training_attendance')
      .upsert(
        {
          player_id: playerId,
          week_id: weekId,
          session_id: sessionId,
          attended: next,
          club_id: activeClubId,
        },
        { onConflict: 'player_id,week_id,session_id' }
      )

    if (upsertError) {
      // Rollback
      setAttendanceMap(prev => ({ ...prev, [key]: current }))
      setToastError('Failed to save attendance')
      setTimeout(() => setToastError(null), 3000)
    }
  }

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
          Failed to load attendance: {error}
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

  if (weeks.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', gap: 12, textAlign: 'center' }}>
        <span style={{ fontSize: 40 }}>📅</span>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>No current week</p>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Open a week to start tracking attendance.</p>
      </div>
    )
  }

  if (trainingDays.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', gap: 12, textAlign: 'center' }}>
        <span style={{ fontSize: 40 }}>🗓️</span>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>No training days configured</p>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Add training days in Club Settings to start tracking attendance.</p>
      </div>
    )
  }

  const visiblePlayers = showInactive ? players : players.filter(p => p.status === 'Active')

  // Build column list: [{weekId, weekLabel, weekDate, sessionId, sessionLabel}]
  const columns = weeks.flatMap(week =>
    trainingDays.map(day => ({
      weekId: week.id,
      weekLabel: week.label,
      weekDate: week.start_date,
      sessionId: day.id,
      sessionLabel: day.label,
    }))
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F8F8F8' }}>
      {/* Page header */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '14px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>Attendance</h1>
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
          {visiblePlayers.length} players · {weeks.length} week{weeks.length !== 1 ? 's' : ''} · {trainingDays.length} session{trainingDays.length !== 1 ? 's' : ''} per week
        </p>
      </div>

      {/* Toast error */}
      {toastError && (
        <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '10px 16px', fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
          {toastError}
        </div>
      )}

      {/* Scrollable matrix */}
      <div style={{ flex: 1, overflow: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' as any }}>
        <table style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
          <thead>
            {/* Row 1: Week labels spanning sessions */}
            <tr>
              <th
                rowSpan={2}
                style={{
                  position: 'sticky', top: 0, left: 0, zIndex: 30,
                  background: '#FFFFFF',
                  borderRight: '1px solid #E5E7EB',
                  borderBottom: '2px solid #E5E7EB',
                  padding: '10px 14px',
                  minWidth: 140,
                  textAlign: 'left',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Player</span>
              </th>

              {weeks.map(week => (
                <th
                  key={week.id}
                  colSpan={trainingDays.length}
                  style={{
                    position: 'sticky', top: 0, zIndex: 20,
                    background: '#FFFFFF',
                    borderBottom: '1px solid #E5E7EB',
                    borderRight: '1px solid #E5E7EB',
                    padding: '8px 12px',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    {formatWeekDate(week.start_date)}
                  </div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', margin: '1px auto 0' }}>
                    {week.label}
                  </div>
                </th>
              ))}
            </tr>

            {/* Row 2: Session (training day) labels */}
            <tr>
              {weeks.flatMap(week =>
                trainingDays.map(day => (
                  <th
                    key={`${week.id}-${day.id}`}
                    style={{
                      position: 'sticky', top: 40, zIndex: 20,
                      background: '#FAFAFA',
                      borderBottom: '2px solid #E5E7EB',
                      borderRight: '1px solid #F3F4F6',
                      padding: '6px 8px',
                      textAlign: 'center',
                      minWidth: 56,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#6B7280' }}>{day.label}</span>
                  </th>
                ))
              )}
            </tr>
          </thead>

          <tbody>
            {visiblePlayers.map((player, idx) => {
              const isOdd = idx % 2 === 1
              return (
                <tr key={player.id} style={{ background: isOdd ? '#F9FAFB' : '#FFFFFF' }}>
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
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{player.name}</span>
                  </td>

                  {/* Attendance cells */}
                  {columns.map(col => {
                    const key = `${player.id}:${col.weekId}:${col.sessionId}`
                    const attended = attendanceMap[key] ?? false
                    return (
                      <td
                        key={`${player.id}-${col.weekId}-${col.sessionId}`}
                        style={{
                          borderBottom: '1px solid #E5E7EB',
                          borderRight: '1px solid #F3F4F6',
                          padding: '8px',
                          textAlign: 'center',
                        }}
                      >
                        <button
                          onClick={() => toggleAttendance(player.id, col.weekId, col.sessionId)}
                          className={`h-12 w-12 flex items-center justify-center rounded-lg border text-sm font-bold ${
                            attended
                              ? 'border-green-200 bg-green-50 text-green-700'
                              : 'border-gray-200 bg-gray-50 text-gray-400'
                          }`}
                          style={{ cursor: 'pointer' }}
                        >
                          {attended ? '✓' : '–'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>

        {visiblePlayers.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: 12, textAlign: 'center' }}>
            <span style={{ fontSize: 36 }}>🏉</span>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>No active players</p>
          </div>
        )}
      </div>
    </div>
  )
}
