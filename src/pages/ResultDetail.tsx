import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useWeeks } from '../hooks/useWeeks'
import { useMatchEvents, type PlayerEventCounts } from '../hooks/useMatchEvents'
import { useClubSettings } from '../hooks/useClubSettings'
import { PDFDownloadButton } from '../components/PDFDownloadLink'
import type { WeekTeam, Player, PDFTeam, PDFPlayer } from '../lib/supabase'

// ─── Stepper ─────────────────────────────────────────────────────────────────

function Stepper({
  label, value, onChange,
}: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center"
        onClick={() => onChange(Math.max(0, value - 1))}
      >−</button>
      <span className="w-8 text-center font-medium">{value}</span>
      <button
        className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center"
        onClick={() => onChange(value + 1)}
      >+</button>
      <span className="ml-2 text-sm text-gray-600">{label}</span>
    </div>
  )
}

// ─── Match Events Sheet ───────────────────────────────────────────────────────

interface MatchEventsSheetProps {
  weekId: string
  weekTeamId: string
  players: Player[]
  initialCounts: PlayerEventCounts[]
  saving: boolean
  onSave: (counts: PlayerEventCounts[]) => void
  onClose: () => void
}

function MatchEventsSheet({
  players, initialCounts, saving, onSave, onClose,
}: MatchEventsSheetProps) {
  const [counts, setCounts] = useState<PlayerEventCounts[]>(initialCounts)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function updateCount(
    playerId: string,
    field: keyof Omit<PlayerEventCounts, 'playerId'>,
    value: number,
  ) {
    setCounts(prev => prev.map(p =>
      p.playerId === playerId ? { ...p, [field]: value } : p
    ))
  }

  function getCount(playerId: string, field: keyof Omit<PlayerEventCounts, 'playerId'>) {
    return counts.find(p => p.playerId === playerId)?.[field] ?? 0
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl max-h-[88vh] flex flex-col">
        {/* Handle */}
        <div className="w-9 h-1 bg-gray-300 rounded-full mx-auto mt-3 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <span className="text-base font-bold text-gray-900">Match Events</span>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm">✕</button>
        </div>

        {/* Player list */}
        <div className="overflow-y-auto overscroll-contain flex-1">
          {players.map(player => {
            const isExpanded = expandedId === player.id
            const hasEvents = (['try','conversion','penalty','drop_goal','yellow_card','red_card','conversionMisses','penaltyMisses'] as const)
              .some(f => getCount(player.id, f) > 0)
            return (
              <div key={player.id} className="border-b border-gray-100">
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : player.id)}
                >
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{player.name}</span>
                    {hasEvents && (
                      <span className="ml-2 text-xs text-purple-700 font-medium">●</span>
                    )}
                  </div>
                  <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <Stepper label="Tries"        value={getCount(player.id, 'try')}         onChange={v => updateCount(player.id, 'try', v)} />

                    {/* Conversions - Made vs Attempted */}
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-gray-700">Conversions</div>
                      <div className="flex gap-3">
                        {/* MADE */}
                        <div className="flex-1 flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                          <span className="text-xs text-gray-600">Made</span>
                          <div className="flex items-center gap-2">
                            <button
                              className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center"
                              onClick={() => updateCount(player.id, 'conversion', Math.max(0, getCount(player.id, 'conversion') - 1))}
                            >−</button>
                            <span className="w-6 text-center font-medium">{getCount(player.id, 'conversion')}</span>
                            <button
                              className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center"
                              onClick={() => updateCount(player.id, 'conversion', getCount(player.id, 'conversion') + 1)}
                            >+</button>
                          </div>
                        </div>
                        {/* ATTEMPTED */}
                        <div className="flex-1 flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                          <span className="text-xs text-gray-600">Attempted</span>
                          <div className="flex items-center gap-2">
                            <button
                              className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center"
                              onClick={() => {
                                const misses = getCount(player.id, 'conversionMisses')
                                if (misses > 0) updateCount(player.id, 'conversionMisses', misses - 1)
                              }}
                            >−</button>
                            <span className="w-6 text-center font-medium">
                              {getCount(player.id, 'conversion') + getCount(player.id, 'conversionMisses')}
                            </span>
                            <button
                              className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center"
                              onClick={() => updateCount(player.id, 'conversionMisses', getCount(player.id, 'conversionMisses') + 1)}
                            >+</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Penalties - Made vs Attempted */}
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-gray-700">Penalties</div>
                      <div className="flex gap-3">
                        {/* MADE */}
                        <div className="flex-1 flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                          <span className="text-xs text-gray-600">Made</span>
                          <div className="flex items-center gap-2">
                            <button
                              className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center"
                              onClick={() => updateCount(player.id, 'penalty', Math.max(0, getCount(player.id, 'penalty') - 1))}
                            >−</button>
                            <span className="w-6 text-center font-medium">{getCount(player.id, 'penalty')}</span>
                            <button
                              className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center"
                              onClick={() => updateCount(player.id, 'penalty', getCount(player.id, 'penalty') + 1)}
                            >+</button>
                          </div>
                        </div>
                        {/* ATTEMPTED */}
                        <div className="flex-1 flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                          <span className="text-xs text-gray-600">Attempted</span>
                          <div className="flex items-center gap-2">
                            <button
                              className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center"
                              onClick={() => {
                                const misses = getCount(player.id, 'penaltyMisses')
                                if (misses > 0) updateCount(player.id, 'penaltyMisses', misses - 1)
                              }}
                            >−</button>
                            <span className="w-6 text-center font-medium">
                              {getCount(player.id, 'penalty') + getCount(player.id, 'penaltyMisses')}
                            </span>
                            <button
                              className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center"
                              onClick={() => updateCount(player.id, 'penaltyMisses', getCount(player.id, 'penaltyMisses') + 1)}
                            >+</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Stepper label="Drop Goals"   value={getCount(player.id, 'drop_goal')}   onChange={v => updateCount(player.id, 'drop_goal', v)} />
                    <Stepper label="Yellow Cards" value={getCount(player.id, 'yellow_card')} onChange={v => updateCount(player.id, 'yellow_card', v)} />
                    <Stepper label="Red Cards"    value={getCount(player.id, 'red_card')}    onChange={v => updateCount(player.id, 'red_card', v)} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Save button */}
        <div className="flex-shrink-0 p-4 border-t border-gray-100">
          <button
            onClick={() => onSave(counts)}
            disabled={saving}
            className="w-full h-12 bg-purple-800 disabled:bg-gray-300 text-white font-bold rounded-xl text-sm tracking-wide"
          >
            {saving ? 'Saving…' : 'SAVE EVENTS'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Opponent Input ───────────────────────────────────────────────────────────

interface OpponentInputProps {
  team: WeekTeam
  weekTeamId: string
}

function OpponentInput({ team, weekTeamId }: OpponentInputProps) {
  const { activeClubId } = useAuth()
  const [localOpponent, setLocalOpponent] = useState(team.opponent || '')
  const [isSaving, setIsSaving] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleSave = useCallback(async () => {
    if (!activeClubId) {
      console.error('OpponentInput save aborted: no active club ID')
      return
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('week_teams')
        .update({ opponent: localOpponent.trim() || null, club_id: activeClubId })
        .eq('id', weekTeamId)
        .eq('club_id', activeClubId)

      if (abortControllerRef.current.signal.aborted) return

      if (error) {
        console.error('Failed to save opponent:', error.message)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to save opponent:', err.message)
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsSaving(false)
      }
    }
  }, [weekTeamId, localOpponent, activeClubId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-sm font-medium text-gray-700">{team.team_name}</span>
      <span className="text-sm text-gray-400">vs</span>
      <input
        type="text"
        value={localOpponent}
        onChange={e => setLocalOpponent(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        placeholder="Opponent name"
        maxLength={100}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
      />
      {isSaving && (
        <div className="w-4 h-4 border-2 border-gray-300 border-t-purple-800 rounded-full animate-spin" />
      )}
    </div>
  )
}

// ─── Team Result Card ─────────────────────────────────────────────────────────

interface TeamResultCardProps {
  weekId: string
  team: WeekTeam
  players: Player[]
  onScoreSave: (weekTeamId: string, sf: number | null, sa: number | null) => Promise<void>
  onReportSave: (weekTeamId: string, report: string | null) => Promise<void>
}

function TeamResultCard({ weekId, team, players, onScoreSave, onReportSave }: TeamResultCardProps) {
  const { loading: eventsLoading, saving, fetchMatchEvents, saveMatchEvents, saveAward, getTeamStats, getPlayerCounts, getAwardWinner } = useMatchEvents()

  const [scoreFor,     setScoreFor]     = useState<string>(team.score_for?.toString() ?? '')
  const [scoreAgainst, setScoreAgainst] = useState<string>(team.score_against?.toString() ?? '')
  const [report,       setReport]       = useState<string>(team.match_report ?? '')
  const [showEvents,   setShowEvents]   = useState(false)
  const [scoreSaving,  setScoreSaving]  = useState(false)

  useEffect(() => {
    fetchMatchEvents(weekId, team.id)
  }, [weekId, team.id, fetchMatchEvents])

  // Re-sync from prop if parent refetches
  useEffect(() => {
    setScoreFor(team.score_for?.toString() ?? '')
    setScoreAgainst(team.score_against?.toString() ?? '')
    setReport(team.match_report ?? '')
  }, [team.score_for, team.score_against, team.match_report])

  const stats = getTeamStats()
  const playerIds = players.map(p => p.id)
  const playerCounts = getPlayerCounts(playerIds)

  async function handleSaveResult() {
    setScoreSaving(true)
    const sf = scoreFor     !== '' ? parseInt(scoreFor,     10) : null
    const sa = scoreAgainst !== '' ? parseInt(scoreAgainst, 10) : null
    await onScoreSave(team.id, sf, sa)
    await onReportSave(team.id, report.trim() || null)
    setScoreSaving(false)
  }

  async function handleSaveEvents(counts: PlayerEventCounts[]) {
    await saveMatchEvents(weekId, team.id, counts)
    setShowEvents(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 overflow-hidden">
      {/* Team name + opponent */}
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <OpponentInput team={team} weekTeamId={team.id} />
      </div>

      {/* Score inputs */}
      <div className="flex items-center justify-center gap-2 py-5 px-4">
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Us</span>
          <input
            type="number" min="0" max="200"
            value={scoreFor}
            onChange={e => setScoreFor(e.target.value)}
            className="text-4xl font-bold text-center w-24 border-0 focus:ring-0 focus:outline-none text-gray-900"
            placeholder="0"
          />
        </div>
        <span className="text-2xl font-bold text-gray-400 mb-0 mt-4 mx-2">–</span>
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Opposition</span>
          <input
            type="number" min="0" max="200"
            value={scoreAgainst}
            onChange={e => setScoreAgainst(e.target.value)}
            className="text-4xl font-bold text-center w-24 border-0 focus:ring-0 focus:outline-none text-gray-900"
            placeholder="0"
          />
        </div>
      </div>

      {/* Team stats */}
      {!eventsLoading && (
        <div className="px-4 pb-3 grid grid-cols-3 gap-2 text-sm border-t border-gray-100 pt-3">
          <div className="text-center">
            <div className="font-bold text-gray-900">{stats.tries}</div>
            <div className="text-gray-400 text-xs">Tries</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-gray-900">{stats.conversions}/{stats.tries}</div>
            <div className="text-gray-400 text-xs">Conv.</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-gray-900">{stats.penalties}</div>
            <div className="text-gray-400 text-xs">Pens</div>
          </div>
          <div className="text-center col-span-3 mt-1">
            <span className="text-gray-500 text-xs">
              Cards: {stats.yellowCards} Yellow, {stats.redCards} Red
            </span>
          </div>
        </div>
      )}

      {/* Add Match Events button */}
      <div className="px-4 pb-3">
        <button
          onClick={() => setShowEvents(true)}
          className="w-full h-10 border border-purple-200 text-purple-800 rounded-lg text-sm font-semibold hover:bg-purple-50 transition-colors"
        >
          + Add Match Events
        </button>
      </div>

      {/* Post-Match Awards */}
      <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Post-Match Awards</p>
        {(['mvp_3','mvp_2','mvp_1','dotd'] as const).map(award => {
          const labels: Record<string, string> = {
            mvp_3: 'MVP (3 Pts)', mvp_2: 'MVP (2 Pts)', mvp_1: 'MVP (1 Pt)', dotd: 'Dick of the Day',
          }
          return (
            <div key={award} className="flex items-center justify-between gap-3">
              <label className="text-sm text-gray-600 flex-shrink-0 w-28">{labels[award]}</label>
              <select
                value={getAwardWinner(award) ?? ''}
                onChange={e => saveAward(weekId, team.id, award, e.target.value || null)}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 bg-white"
              >
                <option value="">— Select —</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )
        })}
      </div>

      {/* Match notes */}
      <div className="px-4 pb-4 border-t border-gray-100 pt-3">
        <textarea
          className="w-full h-32 border border-gray-300 rounded-lg p-3 text-sm text-gray-900 resize-none focus:outline-none focus:border-purple-400"
          placeholder="MATCH NOTES (OPTIONAL)"
          value={report}
          onChange={e => setReport(e.target.value)}
        />
      </div>

      {/* Save button */}
      <div className="px-4 pb-4">
        <button
          onClick={handleSaveResult}
          disabled={scoreSaving}
          className="w-full h-12 bg-purple-800 disabled:bg-gray-300 text-white font-bold rounded-xl tracking-wide"
        >
          {scoreSaving ? 'Saving…' : 'SAVE RESULT'}
        </button>
      </div>

      {/* Match Events Sheet */}
      {showEvents && (
        <MatchEventsSheet
          weekId={weekId}
          weekTeamId={team.id}
          players={players}
          initialCounts={playerCounts}
          saving={saving}
          onSave={handleSaveEvents}
          onClose={() => setShowEvents(false)}
        />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const RUGBY_POSITIONS: Record<number, string> = {
  1: 'Loosehead Prop',   2: 'Hooker',             3: 'Tighthead Prop',
  4: 'Lock',             5: 'Lock',               6: 'Blindside Flanker',
  7: 'Openside Flanker', 8: 'Number 8',           9: 'Scrum-half',
  10: 'Fly-half',        11: 'Left Wing',          12: 'Inside Centre',
  13: 'Outside Centre',  14: 'Right Wing',         15: 'Fullback',
}

export default function ResultDetail() {
  const { weekId } = useParams<{ weekId: string }>()
  const navigate   = useNavigate()
  const { weeks, updateMatchScore, updateMatchReport } = useWeeks()
  const { clubSettings } = useClubSettings()

  const week = weeks.find(w => w.id === weekId)

  // Players for each team (keyed by week_team_id)
  const [teamPlayers,  setTeamPlayers]  = useState<Record<string, Player[]>>({})
  const [teamCaptains, setTeamCaptains] = useState<Record<string, string | null>>({})

  useEffect(() => {
    if (!week) return
    const activeTeams = week.week_teams.filter(t => t.is_active !== false)

    async function loadPlayers() {
      const results = await Promise.all(
        activeTeams.map(async team => {
          // Get team_selections to find player order and captain
          const { data: selData } = await supabase
            .from('team_selections')
            .select('player_order, captain_id')
            .eq('week_id', week!.id)
            .eq('week_team_id', team.id)
            .single()

          if (!selData) return { teamId: team.id, players: [] as Player[], captainId: null }

          const playerIds = (selData.player_order as (string | null)[])
            .filter((id): id is string => id !== null)

          if (playerIds.length === 0) return { teamId: team.id, players: [] as Player[], captainId: selData.captain_id ?? null }

          const { data: playerData } = await supabase
            .from('players')
            .select('*')
            .in('id', playerIds)

          // Maintain squad order
          const ordered = playerIds
            .map(id => (playerData ?? []).find((p: Player) => p.id === id))
            .filter((p): p is Player => !!p)

          return { teamId: team.id, players: ordered, captainId: selData.captain_id ?? null }
        })
      )
      setTeamPlayers(Object.fromEntries(results.map(r => [r.teamId, r.players])))
      setTeamCaptains(Object.fromEntries(results.map(r => [r.teamId, r.captainId])))
    }

    loadPlayers()
  }, [week])

  if (!week) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-800 rounded-full animate-spin" />
      </div>
    )
  }

  const activeTeams = week.week_teams.filter(t => t.is_active !== false)

  // Build PDF data from loaded players
  const pdfTeams: PDFTeam[] = activeTeams
    .filter(team => (teamPlayers[team.id] ?? []).length > 0)
    .map(team => {
      const players = teamPlayers[team.id] ?? []
      const captainId = teamCaptains[team.id] ?? null
      const pdfPlayers: PDFPlayer[] = players.map((p, idx) => {
        const shirtNumber = idx + 1
        return {
          id:          p.id,
          shirtNumber,
          fullName:    p.name,
          isCaptain:   captainId === p.id,
          position:    RUGBY_POSITIONS[shirtNumber],
        }
      })
      return {
        teamName:   team.team_name,
        players:    pdfPlayers,
        matchNotes: team.match_report ?? undefined,
        opponent:   team.opponent ?? undefined,
        matchDate:  week.label,
      }
    })

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20">
      {/* Header */}
      <div className="flex items-center py-3 mb-2">
        <button
          onClick={() => navigate('/results')}
          className="p-1 -ml-1 text-gray-500 hover:text-gray-900"
          aria-label="Back"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold text-gray-900">
          {week.label}
        </h1>
        <PDFDownloadButton
          teams={pdfTeams}
          brandColor={clubSettings?.primary_color ?? '#1e40af'}
          clubName={clubSettings?.club_name}
          fileName={`team-sheet-${week.label.replace(/\s+/g, '-').toLowerCase()}.pdf`}
        />
      </div>

      {activeTeams.length === 0 && (
        <p className="text-center text-gray-400 py-12">No active teams for this week.</p>
      )}

      {activeTeams.map(team => (
        <TeamResultCard
          key={team.id}
          weekId={week.id}
          team={team}
          players={teamPlayers[team.id] ?? []}
          onScoreSave={updateMatchScore}
          onReportSave={updateMatchReport}
        />
      ))}
    </div>
  )
}
