import { useEffect, useState, useCallback } from 'react'
import { supabase, Week, WeekTeam } from '../lib/supabase'

export interface WeekWithTeams extends Week {
  week_teams: WeekTeam[]
}

// Returned by closeWeek — describes any empty-active-team warning
export interface CloseWeekWarning {
  teamName: string
}

interface UseWeeksResult {
  weeks: WeekWithTeams[]
  openWeeks: WeekWithTeams[]
  closedWeeks: WeekWithTeams[]
  loading: boolean
  error: string | null
  refetch: () => void
  createWeek: (params: CreateWeekParams) => Promise<{ data: Week | null; error: string | null }>
  // CP8: returns warnings (empty active teams) before committing; force=true skips them
  closeWeek: (weekId: string, force?: boolean) => Promise<{
    warnings: CloseWeekWarning[]
    error: string | null
  }>
  // v2.0: Update match scoring and reports
  updateMatchScore: (weekTeamId: string, scoreFor: number | null, scoreAgainst: number | null) => Promise<{ error: string | null }>
  updateMatchReport: (weekTeamId: string, matchReport: string | null) => Promise<{ error: string | null }>
}

export interface CreateWeekParams {
  start_date: string   // ISO date string: YYYY-MM-DD
  end_date: string     // ISO date string: YYYY-MM-DD
  label: string
}

const DEFAULT_TEAM_NAMES = ['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5']

export function useWeeks(): UseWeeksResult {
  const [weeks, setWeeks] = useState<WeekWithTeams[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWeeks = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('weeks')
      .select('*, week_teams(*)')
      .order('start_date', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setWeeks([])
    } else {
      const mapped = (data ?? []).map((w: any) => ({
        ...w,
        week_teams: (w.week_teams ?? []).sort(
          (a: WeekTeam, b: WeekTeam) => a.sort_order - b.sort_order
        ),
      }))
      setWeeks(mapped)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchWeeks()
  }, [fetchWeeks])

  const createWeek = useCallback(
    async ({ start_date, end_date, label }: CreateWeekParams) => {
      // Generate a UUID token for the availability link
      const token = crypto.randomUUID()

      // Insert the week
      const { data: weekData, error: weekError } = await supabase
        .from('weeks')
        .insert({
          start_date,
          end_date,
          label,
          status: 'Open',
          availability_link_token: token,
        })
        .select()
        .single()

      if (weekError || !weekData) {
        return { data: null, error: weekError?.message ?? 'Failed to create week' }
      }

      // Auto-insert 5 week_teams rows
      const teamRows = DEFAULT_TEAM_NAMES.map((name, i) => ({
        week_id: weekData.id,
        team_name: name,
        sort_order: i + 1,
        starters_count: 15,
      }))

      const { error: teamsError } = await supabase
        .from('week_teams')
        .insert(teamRows)

      if (teamsError) {
        // Week was created but teams failed — surface the error but don't block
        console.error('Failed to insert week_teams:', teamsError)
        return { data: weekData, error: `Week created but teams failed: ${teamsError.message}` }
      }

      await fetchWeeks()
      return { data: weekData, error: null }
    },
    [fetchWeeks]
  )

  // ── closeWeek ────────────────────────────────────────────────────────────────
  // 1. Checks for active teams with zero assigned players → returns warnings
  // 2. If force=false and warnings exist, returns them without closing (caller shows dialog)
  // 3. If force=true (or no warnings), calls close_week RPC and refetches

  const closeWeek = useCallback(
    async (weekId: string, force = false): Promise<{ warnings: CloseWeekWarning[]; error: string | null }> => {
      // Find the week in local state to check team player counts
      const week = weeks.find(w => w.id === weekId)
      if (!week) return { warnings: [], error: 'Week not found' }

      // Fetch current team_selections for this week to check player counts
      const { data: selections, error: selErr } = await supabase
        .from('team_selections')
        .select('week_team_id, player_order')
        .eq('week_id', weekId)

      if (selErr) return { warnings: [], error: selErr.message }

      // Build a map of non-null player counts per team
      const countMap: Record<string, number> = {}
      for (const sel of selections ?? []) {
        const filled = (sel.player_order as (string | null)[])
          .filter((id): id is string => id !== null).length
        countMap[sel.week_team_id] = filled
      }

      // Warn for any is_active team with 0 players
      const warnings: CloseWeekWarning[] = week.week_teams
        .filter(t => (t.is_active ?? true) && (countMap[t.id] ?? 0) === 0)
        .map(t => ({ teamName: t.team_name }))

      if (warnings.length > 0 && !force) {
        // Return warnings — caller must call closeWeek(id, true) to proceed
        return { warnings, error: null }
      }

      // Execute the close_week RPC
      const { error: rpcErr } = await supabase.rpc('close_week', { p_week_id: weekId })
      if (rpcErr) return { warnings: [], error: rpcErr.message }

      await fetchWeeks()
      return { warnings: [], error: null }
    },
    [weeks, fetchWeeks]
  )

  // v2.0: Update match score for a week team
  const updateMatchScore = useCallback(async (
    weekTeamId: string, 
    scoreFor: number | null, 
    scoreAgainst: number | null
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase
      .from('week_teams')
      .update({ 
        score_for: scoreFor,
        score_against: scoreAgainst 
      })
      .eq('id', weekTeamId)
    
    if (error) {
      return { error: error.message }
    }
    
    // Refetch weeks to update local state
    await fetchWeeks()
    return { error: null }
  }, [fetchWeeks])

  // v2.0: Update match report for a week team
  const updateMatchReport = useCallback(async (
    weekTeamId: string, 
    matchReport: string | null
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase
      .from('week_teams')
      .update({ match_report: matchReport })
      .eq('id', weekTeamId)
    
    if (error) {
      return { error: error.message }
    }
    
    // Refetch weeks to update local state
    await fetchWeeks()
    return { error: null }
  }, [fetchWeeks])

  const openWeeks   = weeks.filter(w => w.status === 'Open')
  const closedWeeks = weeks.filter(w => w.status === 'Closed')

  return { 
    weeks, 
    openWeeks, 
    closedWeeks, 
    loading, 
    error, 
    refetch: fetchWeeks, 
    createWeek, 
    closeWeek,
    updateMatchScore,
    updateMatchReport
  }
}
