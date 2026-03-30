// src/hooks/useSelectionBoard.ts
// CP7-B additions on top of CP7-A:
// • activeWeekId is now internal state — expose setActiveWeekId
// • playerHistory from get_player_last_selections RPC (fetched once per week, not per overlay open)
// • allWeekTeams: all week_teams including hidden (for gear-button fallback)
// • saveTeamSettings: atomic rename/starters/visibility update
// • Players fetch is week-agnostic — no re-fetch on week switch
// • useMemo for teams + unassignedPlayers — stable references for useEffect deps

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { Player, WeekTeam, TeamSelection, AvailabilityResponse } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerHistoryEntry {
  lastTeam: string
  lastPlayed: string   // formatted "d MMM" e.g. "22 Mar"
}

export interface SelectionTeam {
  weekTeam: WeekTeam
  selection: TeamSelection | null
  players: Player[]
  captainId: string | null
}

export interface UseSelectionBoardReturn {
  activeWeekId: string | null
  setActiveWeekId: (id: string | null) => void
  teams: SelectionTeam[]           // visible=true teams only (for tabs + board)
  allWeekTeams: WeekTeam[]         // ALL teams incl. hidden (for gear-button fallback)
  allPlayers: Player[]
  unassignedPlayers: Player[]
  availabilityMap: Record<string, AvailabilityResponse>
  playerHistory: Record<string, PlayerHistoryEntry>
  loading: boolean
  error: string | null
  saveStatus: 'idle' | 'saved' | 'error'
  setSaveStatus: (s: 'idle' | 'saved' | 'error') => void
  assignPlayer: (teamId: string, playerId: string) => Promise<void>
  removePlayer: (teamId: string, playerId: string) => Promise<void>
  reorderTeam: (teamId: string, newOrder: string[]) => Promise<void>
  movePlayer: (fromTeamId: string, toTeamId: string, playerId: string) => Promise<void>
  setCaptain: (teamId: string, playerId: string | null) => Promise<void>
  saveTeamSettings: (
    teamId: string,
    patch: Partial<Pick<WeekTeam, 'team_name' | 'starters_count' | 'visible'>>
  ) => Promise<boolean>  // true = success, false = failure (stays open, error badge shown)
}

// ─── Date helper ──────────────────────────────────────────────────────────────

function formatLastPlayed(dateStr: string): string {
  // "2026-03-22" → "22 Mar"
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSelectionBoard(initialWeekId: string | null): UseSelectionBoardReturn {

  const [activeWeekId, setActiveWeekIdState]   = useState<string | null>(initialWeekId)
  const [weekTeams,    setWeekTeams]            = useState<WeekTeam[]>([])       // visible only
  const [allWeekTeams, setAllWeekTeams]         = useState<WeekTeam[]>([])       // all incl. hidden
  const [selections,   setSelections]           = useState<TeamSelection[]>([])
  const [allPlayers,   setAllPlayers]           = useState<Player[]>([])
  const [availabilityMap, setAvailabilityMap]   = useState<Record<string, AvailabilityResponse>>({})
  const [playerHistory,   setPlayerHistory]     = useState<Record<string, PlayerHistoryEntry>>({})
  const [loading,    setLoading]                = useState(true)
  const [error,      setError]                  = useState<string | null>(null)
  const [saveStatus, setSaveStatus]             = useState<'idle' | 'saved' | 'error'>('idle')

  const setActiveWeekId = useCallback((id: string | null) => {
    setActiveWeekIdState(id)
  }, [])

  // ── Players fetch — week-agnostic, runs once on mount ────────────────────

  useEffect(() => {
    supabase
      .from('players')
      .select('*')
      .neq('status', 'Archived')
      .order('name')
      .then(({ data }) => setAllPlayers(data ?? []))
  }, [])

  // ── Week-scoped fetch — runs when activeWeekId changes ───────────────────

  const fetchWeekData = useCallback(async (wid: string | null) => {
    if (!wid) {
      setWeekTeams([])
      setAllWeekTeams([])
      setSelections([])
      setAvailabilityMap({})
      setPlayerHistory({})
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [
        visibleTeamsRes,
        allTeamsRes,
        selectionsRes,
        availRes,
        historyRes,
      ] = await Promise.all([
        // Visible teams only (for tabs + board)
        supabase
          .from('week_teams')
          .select('*')
          .eq('week_id', wid)
          .eq('visible', true)
          .order('sort_order'),

        // All teams including hidden (gear-button fallback)
        supabase
          .from('week_teams')
          .select('*')
          .eq('week_id', wid)
          .order('sort_order'),

        supabase
          .from('team_selections')
          .select('*')
          .eq('week_id', wid),

        supabase
          .from('availability_responses')
          .select('*')
          .eq('week_id', wid)
          .order('created_at', { ascending: false }),

        // RPC: last selection history per player, excluding current week
        supabase.rpc('get_player_last_selections', { p_week_id: wid }),
      ])

      if (visibleTeamsRes.error) throw visibleTeamsRes.error
      if (allTeamsRes.error)     throw allTeamsRes.error
      if (selectionsRes.error)   throw selectionsRes.error
      if (availRes.error)        throw availRes.error
      // historyRes is soft — RPC may not exist in older deployments
      if (historyRes.error) {
        console.warn('get_player_last_selections RPC error (apply migration 007):', historyRes.error.message)
      }

      setWeekTeams(visibleTeamsRes.data ?? [])
      setAllWeekTeams(allTeamsRes.data ?? [])
      setSelections(selectionsRes.data ?? [])

      // Dedupe availability: latest response per player (already sorted DESC)
      const avMap: Record<string, AvailabilityResponse> = {}
      for (const r of (availRes.data ?? [])) {
        if (!avMap[r.player_id]) avMap[r.player_id] = r
      }
      setAvailabilityMap(avMap)

      // Build player history map
      const histMap: Record<string, PlayerHistoryEntry> = {}
      for (const row of (historyRes.data ?? [])) {
        histMap[row.player_id] = {
          lastTeam:   row.last_team ?? '—',
          lastPlayed: row.last_played ? formatLastPlayed(row.last_played) : '—',
        }
      }
      setPlayerHistory(histMap)

    } catch (err: unknown) {
      console.error('useSelectionBoard fetchWeekData error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load board')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWeekData(activeWeekId)
  }, [activeWeekId, fetchWeekData])

  // ── Derived: teams (visible only) — memoised for stable reference ─────────

  const teams = useMemo<SelectionTeam[]>(() =>
    weekTeams.map(wt => {
      const selection    = selections.find(s => s.week_team_id === wt.id) ?? null
      const playerOrder  = selection?.player_order ?? []
      const orderedPlayers = playerOrder
        .map(id => allPlayers.find(p => p.id === id))
        .filter((p): p is Player => p !== undefined)

      return {
        weekTeam:  wt,
        selection,
        players:   orderedPlayers,
        captainId: selection?.captain_id ?? null,
      }
    }),
    [weekTeams, selections, allPlayers]
  )

  // ── Derived: unassigned players — memoised ────────────────────────────────

  // BUG-FIX-C: pool must only show Available or TBC players for the current week.
  // Players with no response or Unavailable are excluded (PRD §4.5.1).
  const unassignedPlayers = useMemo(() => {
    const assignedIds = new Set(selections.flatMap(s => s.player_order ?? []))

    return allPlayers
      .filter(p => {
        if (assignedIds.has(p.id)) return false
        const av = availabilityMap[p.id]?.availability
        return av === 'Available' || av === 'TBC'
      })
      .sort((a, b) => {
        const order = (p: Player) => {
          const av = availabilityMap[p.id]?.availability
          if (av === 'Available') return 0
          if (av === 'TBC')       return 1
          return 2
        }
        const diff = order(a) - order(b)
        if (diff !== 0) return diff
        return a.name.localeCompare(b.name)
      })
  }, [allPlayers, selections, availabilityMap])

  // ── Helper: find which team a player is on ────────────────────────────────

  function findPlayerTeam(playerId: string): { teamId: string; order: string[] } | null {
    for (const sel of selections) {
      if (sel.player_order?.includes(playerId)) {
        return { teamId: sel.week_team_id, order: sel.player_order }
      }
    }
    return null
  }

  // ── Save feedback helpers ─────────────────────────────────────────────────

  function flashSaved() {
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 1800)
  }

  function flashError() {
    setSaveStatus('error')
  }

  // ── Upsert helper ─────────────────────────────────────────────────────────

  async function upsertSelection(weekTeamId: string, patch: Partial<TeamSelection>) {
    if (!activeWeekId) return
    const { error } = await supabase
      .from('team_selections')
      .upsert(
        { week_id: activeWeekId, week_team_id: weekTeamId, ...patch },
        { onConflict: 'week_id,week_team_id' }
      )
    if (error) throw error
  }

  // ── Mutation: assignPlayer ────────────────────────────────────────────────

  const assignPlayer = useCallback(async (teamId: string, playerId: string) => {
    if (!activeWeekId) return

    const prevSelections = [...selections]
    const existing = findPlayerTeam(playerId)

    let newSelections = selections.map(s => {
      if (existing && s.week_team_id === existing.teamId) {
        return { ...s, player_order: s.player_order.filter(id => id !== playerId) }
      }
      return s
    })

    const targetSel = newSelections.find(s => s.week_team_id === teamId)
    if (targetSel) {
      newSelections = newSelections.map(s =>
        s.week_team_id === teamId
          ? { ...s, player_order: [...s.player_order, playerId] }
          : s
      )
    } else {
      newSelections = [
        ...newSelections,
        {
          id:            `optimistic-${teamId}`,
          week_id:       activeWeekId,
          week_team_id:  teamId,
          player_order:  [playerId],
          captain_id:    null,
          saved_at:      new Date().toISOString(),
          created_at:    new Date().toISOString(),
          updated_at:    new Date().toISOString(),
        } as TeamSelection,
      ]
    }

    setSelections(newSelections)

    try {
      if (existing) {
        const updatedOrder = existing.order.filter(id => id !== playerId)
        await upsertSelection(existing.teamId, { player_order: updatedOrder })
      }
      const currentOrder = newSelections.find(s => s.week_team_id === teamId)?.player_order ?? [playerId]
      await upsertSelection(teamId, { player_order: currentOrder })
      flashSaved()
    } catch (err) {
      console.error('assignPlayer error:', err)
      setSelections(prevSelections)
      flashError()
      setError('Save failed')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWeekId, selections, allPlayers])

  // ── Mutation: removePlayer ────────────────────────────────────────────────

  const removePlayer = useCallback(async (teamId: string, playerId: string) => {
    if (!activeWeekId) return

    const prevSelections = [...selections]
    const teamSel = selections.find(s => s.week_team_id === teamId)
    if (!teamSel) return

    const newOrder      = teamSel.player_order.filter(id => id !== playerId)
    const newCaptainId  = teamSel.captain_id === playerId ? null : teamSel.captain_id

    setSelections(prev => prev.map(s =>
      s.week_team_id === teamId
        ? { ...s, player_order: newOrder, captain_id: newCaptainId }
        : s
    ))

    try {
      await upsertSelection(teamId, { player_order: newOrder, captain_id: newCaptainId })
      flashSaved()
    } catch (err) {
      console.error('removePlayer error:', err)
      setSelections(prevSelections)
      flashError()
      setError('Save failed')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWeekId, selections])

  // ── Mutation: reorderTeam ─────────────────────────────────────────────────

  const reorderTeam = useCallback(async (teamId: string, newOrder: string[]) => {
    if (!activeWeekId) return

    const prevSelections = [...selections]
    setSelections(prev => prev.map(s =>
      s.week_team_id === teamId ? { ...s, player_order: newOrder } : s
    ))

    try {
      await upsertSelection(teamId, { player_order: newOrder })
      flashSaved()
    } catch (err) {
      console.error('reorderTeam error:', err)
      setSelections(prevSelections)
      flashError()
      setError('Save failed')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWeekId, selections])

  // ── Mutation: movePlayer (cross-team drag) ────────────────────────────────

  const movePlayer = useCallback(async (_fromTeamId: string, toTeamId: string, playerId: string) => {
    await assignPlayer(toTeamId, playerId)
  }, [assignPlayer])

  // ── Mutation: setCaptain ──────────────────────────────────────────────────

  const setCaptain = useCallback(async (teamId: string, playerId: string | null) => {
    if (!activeWeekId) return

    const prevSelections = [...selections]
    setSelections(prev => prev.map(s =>
      s.week_team_id === teamId ? { ...s, captain_id: playerId } : s
    ))

    try {
      const { error } = await supabase
        .from('team_selections')
        .update({ captain_id: playerId })
        .eq('week_id', activeWeekId)
        .eq('week_team_id', teamId)
      if (error) throw error
      flashSaved()
    } catch (err) {
      console.error('setCaptain error:', err)
      setSelections(prevSelections)
      flashError()
      setError('Save failed')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWeekId, selections])

  // ── Mutation: saveTeamSettings (CP7-B) ───────────────────────────────────
  // Single atomic update: team_name / starters_count / visible in week_teams
  // Optimistic update + rollback on failure

  const saveTeamSettings = useCallback(async (
    teamId: string,
    patch: Partial<Pick<WeekTeam, 'team_name' | 'starters_count' | 'visible'>>
  ): Promise<boolean> => {
    const prevWeekTeams    = [...weekTeams]
    const prevAllWeekTeams = [...allWeekTeams]

    // Optimistic update both state arrays
    setWeekTeams(prev    => prev.map(t => t.id === teamId ? { ...t, ...patch } : t))
    setAllWeekTeams(prev => prev.map(t => t.id === teamId ? { ...t, ...patch } : t))

    try {
      const { error } = await supabase
        .from('week_teams')
        .update(patch)
        .eq('id', teamId)
      if (error) throw error
      flashSaved()
      return true
    } catch (err) {
      console.error('saveTeamSettings error:', err)
      setWeekTeams(prevWeekTeams)
      setAllWeekTeams(prevAllWeekTeams)
      flashError()
      setError('Save failed')
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekTeams, allWeekTeams])

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    activeWeekId,
    setActiveWeekId,
    teams,
    allWeekTeams,
    allPlayers,
    unassignedPlayers,
    availabilityMap,
    playerHistory,
    loading,
    error,
    saveStatus,
    setSaveStatus,
    assignPlayer,
    removePlayer,
    reorderTeam,
    movePlayer,
    setCaptain,
    saveTeamSettings,
  }
}
