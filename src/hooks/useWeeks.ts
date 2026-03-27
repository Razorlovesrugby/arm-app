import { useEffect, useState, useCallback } from 'react'
import { supabase, Week, WeekTeam } from '../lib/supabase'

export interface WeekWithTeams extends Week {
  week_teams: WeekTeam[]
}

interface UseWeeksResult {
  weeks: WeekWithTeams[]
  openWeeks: WeekWithTeams[]
  closedWeeks: WeekWithTeams[]
  loading: boolean
  error: string | null
  refetch: () => void
  createWeek: (params: CreateWeekParams) => Promise<{ data: Week | null; error: string | null }>
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

  const openWeeks = weeks.filter(w => w.status === 'Open')
  const closedWeeks = weeks.filter(w => w.status === 'Closed')

  return { weeks, openWeeks, closedWeeks, loading, error, refetch: fetchWeeks, createWeek }
}
