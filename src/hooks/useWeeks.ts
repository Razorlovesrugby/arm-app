import { useEffect, useState, useCallback } from 'react'
import { supabase, Week, WeekTeam } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface WeekWithTeams extends Week {
  week_teams: WeekTeam[]
}

export interface CloseWeekWarning {
  teamName: string
}

export interface AvailabilityCounts {
  available: number
  tbc: number
  unavailable: number
}

interface UseWeeksResult {
  weeks: WeekWithTeams[]
  openWeeks: WeekWithTeams[]
  closedWeeks: WeekWithTeams[]
  pastWeeks: WeekWithTeams[]
  loading: boolean
  error: string | null
  refetch: () => void
  availabilityCounts: Record<string, AvailabilityCounts>
  createWeek: (params: CreateWeekParams) => Promise<{ data: Week | null; error: string | null }>
  updateWeek: (weekId: string, label: string, notes?: string) => Promise<{ error: string | null }>
  closeWeek: (weekId: string, force?: boolean) => Promise<{
    warnings: CloseWeekWarning[]
    error: string | null
  }>
  updateMatchScore: (weekTeamId: string, score_for: number | null, score_against: number | null) => Promise<void>
  updateMatchReport: (weekTeamId: string, match_report: string | null) => Promise<void>
}

export interface CreateWeekParams {
  start_date: string
  end_date: string
  label: string
  teamNames: string[] // COPIED from default_teams, not referenced
  notes?: string // NEW
}

export function useWeeks(): UseWeeksResult {
  const { activeClubId } = useAuth()
  const [weeks, setWeeks] = useState<WeekWithTeams[]>([])
  const [availabilityCounts, setAvailabilityCounts] = useState<Record<string, AvailabilityCounts>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWeeks = useCallback(async () => {
    if (!activeClubId) {
      console.error('activeClubId is null - cannot fetch weeks')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const [weeksResult, avResult] = await Promise.all([
      supabase
        .from('weeks')
        .select('*, week_teams(*)')
        .eq('club_id', activeClubId)
        .order('start_date', { ascending: false }),
      supabase
        .from('availability_responses')
        .select('week_id, availability')
        .eq('club_id', activeClubId),
    ])


    if (weeksResult.error) {
      setError(weeksResult.error.message)
      setWeeks([])
    } else {
      const mapped = (weeksResult.data ?? []).map((w: any) => ({
        ...w,
        week_teams: (w.week_teams ?? []).sort(
          (a: WeekTeam, b: WeekTeam) => a.sort_order - b.sort_order
        ),
      }))
      setWeeks(mapped)
    }

    // Aggregate availability counts per week
    const counts: Record<string, AvailabilityCounts> = {}
    for (const row of avResult.data ?? []) {
      if (!counts[row.week_id]) counts[row.week_id] = { available: 0, tbc: 0, unavailable: 0 }
      if (row.availability === 'Available') counts[row.week_id].available++
      else if (row.availability === 'TBC') counts[row.week_id].tbc++
      else if (row.availability === 'Unavailable') counts[row.week_id].unavailable++
    }
    setAvailabilityCounts(counts)

    setLoading(false)
  }, [activeClubId])

  useEffect(() => {
    fetchWeeks()
  }, [fetchWeeks])

  const createWeek = useCallback(
    async ({ start_date, end_date, label, teamNames, notes }: CreateWeekParams) => {
      if (!activeClubId) {
        console.error('activeClubId is null - cannot create week')
        return { data: null, error: 'No active club' }
      }
      const token = crypto.randomUUID()

      const { data: weekData, error: weekError } = await supabase
        .from('weeks')
        .insert({
          start_date,
          end_date,
          label,
          status: 'Open',
          availability_link_token: token,
          club_id: activeClubId,
          ...(notes ? { notes: notes.trim() } : {}),
        })
        .select()
        .maybeSingle()

      if (weekError || !weekData) {
        return { data: null, error: weekError?.message ?? 'Failed to create week' }
      }

      const teamRows = teamNames.map((name, i) => ({
        week_id: weekData.id,
        team_name: name,
        sort_order: i + 1,
        starters_count: 15,
      }))

      const { error: teamsError } = await supabase
        .from('week_teams')
        .insert(teamRows)

      if (teamsError) {
        console.error('Failed to insert week_teams:', teamsError)
        return { data: weekData, error: `Week created but teams failed: ${teamsError.message}` }
      }

      await fetchWeeks()
      return { data: weekData, error: null }
    },
    [fetchWeeks, activeClubId]
  )

  const updateWeek = useCallback(
    async (weekId: string, label: string, notes?: string): Promise<{ error: string | null }> => {
      const updateData: Record<string, string | null> = { label }
      if (notes !== undefined) updateData.notes = notes.trim() || null
      const { error } = await supabase
        .from('weeks')
        .update(updateData)
        .eq('id', weekId)
      if (!error) await fetchWeeks()
      return { error: error?.message ?? null }
    },
    [fetchWeeks]
  )

  const closeWeek = useCallback(
    async (weekId: string, force = false): Promise<{ warnings: CloseWeekWarning[]; error: string | null }> => {
      const week = weeks.find(w => w.id === weekId)
      if (!week) return { warnings: [], error: 'Week not found' }

      const { data: selections, error: selErr } = await supabase
        .from('team_selections')
        .select('week_team_id, player_order')
        .eq('week_id', weekId)

      if (selErr) return { warnings: [], error: selErr.message }

      const countMap: Record<string, number> = {}
      for (const sel of selections ?? []) {
        const filled = (sel.player_order as (string | null)[])
          .filter((id): id is string => id !== null).length
        countMap[sel.week_team_id] = filled
      }

      const warnings: CloseWeekWarning[] = week.week_teams
        .filter(t => (t.is_active ?? true) && (countMap[t.id] ?? 0) === 0)
        .map(t => ({ teamName: t.team_name }))

      if (warnings.length > 0 && !force) {
        return { warnings, error: null }
      }

      const { error: rpcErr } = await supabase.rpc('close_week', { p_week_id: weekId })
      if (rpcErr) return { warnings: [], error: rpcErr.message }

      await fetchWeeks()
      return { warnings: [], error: null }
    },
    [weeks, fetchWeeks]
  )

  const updateMatchScore = async (
    weekTeamId: string,
    score_for: number | null,
    score_against: number | null,
  ) => {
    await supabase
      .from('week_teams')
      .update({ score_for, score_against })
      .eq('id', weekTeamId)
    await fetchWeeks()
  }

  const updateMatchReport = async (weekTeamId: string, match_report: string | null) => {
    await supabase
      .from('week_teams')
      .update({ match_report })
      .eq('id', weekTeamId)
    await fetchWeeks()
  }

  const openWeeks   = weeks.filter(w => w.status === 'Open')
  const closedWeeks = weeks.filter(w => w.status === 'Closed')
  const pastWeeks   = weeks.filter(w => new Date(w.end_date) < new Date())

  return {
    weeks, openWeeks, closedWeeks, pastWeeks,
    loading, error, refetch: fetchWeeks,
    availabilityCounts,
    createWeek, updateWeek, closeWeek,
    updateMatchScore, updateMatchReport,
  }
}
