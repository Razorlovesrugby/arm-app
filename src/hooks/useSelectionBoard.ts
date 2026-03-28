import { useEffect, useState, useCallback } from 'react'
import { supabase, Player, AvailabilityResponse } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerWithAvailability extends Player {
  latestAvailability: 'Available' | 'TBC' | 'Unavailable' | null
  availabilityNote: string | null
}

export interface TeamSelectionState {
  weekTeamId: string
  weekId: string
  teamName: string
  sortOrder: number
  startersCount: number
  playerIds: string[]
}

interface UseSelectionBoardResult {
  playerMap: Record<string, PlayerWithAvailability>
  unassignedPlayers: PlayerWithAvailability[]
  teams: TeamSelectionState[]
  loading: boolean
  error: string | null
  assignPlayer: (playerId: string, toWeekTeamId: string) => Promise<void>
  removePlayer: (playerId: string, fromWeekTeamId: string) => Promise<void>
  reorderTeam: (weekTeamId: string, newPlayerIds: string[]) => Promise<void>
  movePlayer: (playerId: string, fromWeekTeamId: string | null, toWeekTeamId: string) => Promise<void>
  refetch: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSelectionBoard(weekId: string | null): UseSelectionBoardResult {
  const [playerMap, setPlayerMap] = useState<Record<string, PlayerWithAvailability>>({})
  const [teams, setTeams] = useState<TeamSelectionState[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!weekId) {
      setPlayerMap({})
      setTeams([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Run all fetches in parallel
      const [playersRes, availRes, teamsRes, selectionsRes] = await Promise.all([
        supabase
          .from('players')
          .select('*')
          .neq('status', 'Archived')
          .order('name'),

        supabase
          .from('availability_responses')
          .select('*')
          .eq('week_id', weekId)
          .order('created_at', { ascending: false }),

        supabase
          .from('week_teams')
          .select('*')
          .eq('week_id', weekId)
          .order('sort_order'),

        supabase
          .from('team_selections')
          .select('*')
          .eq('week_id', weekId),
      ])

      if (playersRes.error) throw new Error(playersRes.error.message)
      if (availRes.error) throw new Error(availRes.error.message)
      if (teamsRes.error) throw new Error(teamsRes.error.message)
      if (selectionsRes.error) throw new Error(selectionsRes.error.message)

      // Build latest availability per player (responses are DESC by created_at)
      const latestAvail: Record<string, AvailabilityResponse> = {}
      for (const resp of (availRes.data ?? [])) {
        if (!latestAvail[resp.player_id]) {
          latestAvail[resp.player_id] = resp
        }
      }

      // Build player map
      const map: Record<string, PlayerWithAvailability> = {}
      for (const p of (playersRes.data ?? [])) {
        const avail = latestAvail[p.id]
        map[p.id] = {
          ...p,
          latestAvailability: avail?.availability ?? null,
          availabilityNote: avail?.availability_note ?? null,
        }
      }
      setPlayerMap(map)

      // Build selections map: week_team_id → player_ids
      const selectionsMap: Record<string, string[]> = {}
      for (const sel of (selectionsRes.data ?? [])) {
        selectionsMap[sel.week_team_id] = sel.player_order ?? []
      }

      // Build team states
      const teamStates: TeamSelectionState[] = (teamsRes.data ?? []).map((wt: any) => ({
        weekTeamId: wt.id,
        weekId,
        teamName: wt.team_name,
        sortOrder: wt.sort_order,
        startersCount: wt.starters_count,
        playerIds: selectionsMap[wt.id] ?? [],
      }))
      setTeams(teamStates)

    } catch (err: any) {
      setError(err.message ?? 'Failed to load selection board')
    } finally {
      setLoading(false)
    }
  }, [weekId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Derived state ──────────────────────────────────────────────────────────

  const allAssignedIds = new Set(teams.flatMap(t => t.playerIds))

  // Unassigned = non-Archived players who are Available / TBC / no response
  // and not yet placed in any team
  function availSortOrder(avail: string | null): number {
    if (avail === 'Available') return 0
    if (avail === 'TBC') return 1
    if (avail === null) return 2
    return 3
  }

  const unassignedPlayers = Object.values(playerMap)
    .filter(p => !allAssignedIds.has(p.id) && p.latestAvailability !== 'Unavailable')
    .sort((a, b) => {
      const ao = availSortOrder(a.latestAvailability)
      const bo = availSortOrder(b.latestAvailability)
      if (ao !== bo) return ao - bo
      return a.name.localeCompare(b.name)
    })

  // ─── Persistence helper ─────────────────────────────────────────────────────

  const saveTeamSelection = useCallback(async (
    weekTeamId: string,
    playerIds: string[],
  ) => {
    if (!weekId) return
    const { error: saveError } = await supabase
      .from('team_selections')
      .upsert(
        {
          week_id: weekId,
          week_team_id: weekTeamId,
          player_order: playerIds,
          saved_at: new Date().toISOString(),
        },
        { onConflict: 'week_id,week_team_id' }
      )
    if (saveError) throw new Error(saveError.message)
  }, [weekId])

  // ─── Mutations ──────────────────────────────────────────────────────────────

  /** Add a player to a team (from unassigned pool) */
  const assignPlayer = useCallback(async (
    playerId: string,
    toWeekTeamId: string,
  ) => {
    setTeams(prev => {
      return prev.map(t => {
        if (t.weekTeamId !== toWeekTeamId) return t
        if (t.playerIds.includes(playerId)) return t
        return { ...t, playerIds: [...t.playerIds, playerId] }
      })
    })
    // Read current state to build new ids list
    const targetTeam = teams.find(t => t.weekTeamId === toWeekTeamId)
    if (!targetTeam) return
    const newIds = targetTeam.playerIds.includes(playerId)
      ? targetTeam.playerIds
      : [...targetTeam.playerIds, playerId]
    try {
      await saveTeamSelection(toWeekTeamId, newIds)
    } catch (err: any) {
      setError(err.message)
      fetchData() // rollback
    }
  }, [teams, saveTeamSelection, fetchData])

  /** Remove a player from a team (back to unassigned) */
  const removePlayer = useCallback(async (
    playerId: string,
    fromWeekTeamId: string,
  ) => {
    const sourceTeam = teams.find(t => t.weekTeamId === fromWeekTeamId)
    if (!sourceTeam) return
    const newIds = sourceTeam.playerIds.filter(id => id !== playerId)
    setTeams(prev =>
      prev.map(t =>
        t.weekTeamId === fromWeekTeamId ? { ...t, playerIds: newIds } : t
      )
    )
    try {
      await saveTeamSelection(fromWeekTeamId, newIds)
    } catch (err: any) {
      setError(err.message)
      fetchData()
    }
  }, [teams, saveTeamSelection, fetchData])

  /** Reorder players within a single team */
  const reorderTeam = useCallback(async (
    weekTeamId: string,
    newPlayerIds: string[],
  ) => {
    setTeams(prev =>
      prev.map(t =>
        t.weekTeamId === weekTeamId ? { ...t, playerIds: newPlayerIds } : t
      )
    )
    try {
      await saveTeamSelection(weekTeamId, newPlayerIds)
    } catch (err: any) {
      setError(err.message)
      fetchData()
    }
  }, [saveTeamSelection, fetchData])

  /**
   * Move a player between teams (desktop drag-drop or reassign).
   * fromWeekTeamId = null means moving from unassigned pool.
   */
  const movePlayer = useCallback(async (
    playerId: string,
    fromWeekTeamId: string | null,
    toWeekTeamId: string,
  ) => {
    if (fromWeekTeamId === toWeekTeamId) return

    let updatedTeams = teams.map(t => {
      if (fromWeekTeamId && t.weekTeamId === fromWeekTeamId) {
        return { ...t, playerIds: t.playerIds.filter(id => id !== playerId) }
      }
      if (t.weekTeamId === toWeekTeamId) {
        if (t.playerIds.includes(playerId)) return t
        return { ...t, playerIds: [...t.playerIds, playerId] }
      }
      return t
    })

    setTeams(updatedTeams)

    try {
      const saves: Promise<void>[] = []
      if (fromWeekTeamId) {
        const from = updatedTeams.find(t => t.weekTeamId === fromWeekTeamId)
        if (from) saves.push(saveTeamSelection(fromWeekTeamId, from.playerIds))
      }
      const to = updatedTeams.find(t => t.weekTeamId === toWeekTeamId)
      if (to) saves.push(saveTeamSelection(toWeekTeamId, to.playerIds))
      await Promise.all(saves)
    } catch (err: any) {
      setError(err.message)
      fetchData()
    }
  }, [teams, saveTeamSelection, fetchData])

  return {
    playerMap,
    unassignedPlayers,
    teams,
    loading,
    error,
    assignPlayer,
    removePlayer,
    reorderTeam,
    movePlayer,
    refetch: fetchData,
  }
}
