// src/hooks/useSelectionBoard.ts
// CP7A.2 — Extended for CP7-A
// Changes from Phase 7:
//   • Reads week_teams.visible — filters tab list
//   • Reads team_selections.captain_id — exposes per-team captain
//   • New mutation: setCaptain(teamId, playerId | null)
//   • All existing mutations (assignPlayer, removePlayer, reorderTeam, movePlayer) retained unchanged
//   • Optimistic update + rollback pattern retained throughout

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Player, WeekTeam, TeamSelection, AvailabilityResponse } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectionTeam {
  weekTeam: WeekTeam               // includes visible, starters_count
  selection: TeamSelection | null  // includes captain_id, player_order
  players: Player[]                // ordered per player_order
  captainId: string | null         // derived from selection.captain_id
}

export interface UseSelectionBoardReturn {
  teams: SelectionTeam[]           // only visible=true teams, ordered by team_name
  allPlayers: Player[]
  unassignedPlayers: Player[]
  availabilityMap: Record<string, AvailabilityResponse>  // player_id → latest response
  loading: boolean
  error: string | null
  saveStatus: 'idle' | 'saved' | 'error'
  setSaveStatus: (s: 'idle' | 'saved' | 'error') => void
  assignPlayer: (teamId: string, playerId: string) => Promise<void>
  removePlayer: (teamId: string, playerId: string) => Promise<void>
  reorderTeam: (teamId: string, newOrder: string[]) => Promise<void>
  movePlayer: (fromTeamId: string, toTeamId: string, playerId: string) => Promise<void>
  setCaptain: (teamId: string, playerId: string | null) => Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useSelectionBoard(weekId: string | null): UseSelectionBoardReturn {
  const [weekTeams, setWeekTeams] = useState<WeekTeam[]>([])
  const [selections, setSelections] = useState<TeamSelection[]>([])
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, AvailabilityResponse>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!weekId) {
      setWeekTeams([])
      setSelections([])
      setAvailabilityMap({})
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [teamsRes, selectionsRes, playersRes, availRes] = await Promise.all([
        // CP7-A: filter visible=true
        supabase
          .from('week_teams')
          .select('*')
          .eq('week_id', weekId)
          .eq('visible', true)
          .order('team_name'),

        supabase
          .from('team_selections')
          .select('*')
          .eq('week_id', weekId),

        supabase
          .from('players')
          .select('*')
          .neq('status', 'Archived')
          .order('name'),

        // Latest response per player: fetch all and dedupe client-side
        supabase
          .from('availability_responses')
          .select('*')
          .eq('week_id', weekId)
          .order('created_at', { ascending: false }),
      ])

      if (teamsRes.error) throw teamsRes.error
      if (selectionsRes.error) throw selectionsRes.error
      if (playersRes.error) throw playersRes.error
      if (availRes.error) throw availRes.error

      setWeekTeams(teamsRes.data ?? [])
      setSelections(selectionsRes.data ?? [])
      setAllPlayers(playersRes.data ?? [])

      // Dedupe availability: latest response per player (already sorted DESC)
      const avMap: Record<string, AvailabilityResponse> = {}
      for (const r of (availRes.data ?? [])) {
        if (!avMap[r.player_id]) avMap[r.player_id] = r
      }
      setAvailabilityMap(avMap)

    } catch (err: unknown) {
      console.error('useSelectionBoard fetchData error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load board')
    } finally {
      setLoading(false)
    }
  }, [weekId])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Derived: teams (visible only) ────────────────────────────────────────

  const teams: SelectionTeam[] = weekTeams.map(wt => {
    const selection = selections.find(s => s.week_team_id === wt.id) ?? null
    const playerOrder: string[] = selection?.player_order ?? []
    const orderedPlayers = playerOrder
      .map(id => allPlayers.find(p => p.id === id))
      .filter((p): p is Player => p !== undefined)

    return {
      weekTeam: wt,
      selection,
      players: orderedPlayers,
      captainId: selection?.captain_id ?? null,
    }
  })

  // ── Derived: unassigned players ──────────────────────────────────────────

  const assignedIds = new Set(
    selections.flatMap(s => s.player_order ?? [])
  )

  const unassignedPlayers = allPlayers
    .filter(p => !assignedIds.has(p.id))
    .sort((a, b) => {
      // Available first, then TBC, then no response, then alpha
      const order = (p: Player) => {
        const av = availabilityMap[p.id]?.availability
        if (av === 'Available') return 0
        if (av === 'TBC') return 1
        return 2
      }
      const diff = order(a) - order(b)
      if (diff !== 0) return diff
      return a.name.localeCompare(b.name)
    })

  // ── Helper: find which team a player is on ───────────────────────────────

  function findPlayerTeam(playerId: string): { teamId: string; order: string[] } | null {
    for (const sel of selections) {
      if (sel.player_order?.includes(playerId)) {
        return { teamId: sel.week_team_id, order: sel.player_order }
      }
    }
    return null
  }

  // ── Save feedback helper ─────────────────────────────────────────────────

  function flashSaved() {
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 1800)
  }

  function flashError() {
    setSaveStatus('error')
  }

  // ── Upsert helper ────────────────────────────────────────────────────────

  async function upsertSelection(weekTeamId: string, patch: Partial<TeamSelection>) {
    if (!weekId) return
    const { error } = await supabase
      .from('team_selections')
      .upsert(
        { week_id: weekId, week_team_id: weekTeamId, ...patch },
        { onConflict: 'week_id,week_team_id' }
      )
    if (error) throw error
  }

  // ── Mutation: assignPlayer ────────────────────────────────────────────────

  const assignPlayer = useCallback(async (teamId: string, playerId: string) => {
    if (!weekId) return

    const prevSelections = [...selections]

    // Remove from any existing team
    const existing = findPlayerTeam(playerId)
    let newSelections = selections.map(s => {
      if (existing && s.week_team_id === existing.teamId) {
        return { ...s, player_order: s.player_order.filter(id => id !== playerId) }
      }
      return s
    })

    // Add to target team
    const targetSel = newSelections.find(s => s.week_team_id === teamId)
    if (targetSel) {
      newSelections = newSelections.map(s =>
        s.week_team_id === teamId
          ? { ...s, player_order: [...s.player_order, playerId] }
          : s
      )
    } else {
      // No existing selection row — add synthetic for optimistic UI
      newSelections = [
        ...newSelections,
        {
          id: `optimistic-${teamId}`,
          week_id: weekId,
          week_team_id: teamId,
          player_order: [playerId],
          captain_id: null,
          saved_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
  }, [weekId, selections, allPlayers])

  // ── Mutation: removePlayer ────────────────────────────────────────────────

  const removePlayer = useCallback(async (teamId: string, playerId: string) => {
    if (!weekId) return

    const prevSelections = [...selections]
    const teamSel = selections.find(s => s.week_team_id === teamId)
    if (!teamSel) return

    const newOrder = teamSel.player_order.filter(id => id !== playerId)
    const newCaptainId = teamSel.captain_id === playerId ? null : teamSel.captain_id

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
  }, [weekId, selections])

  // ── Mutation: reorderTeam ─────────────────────────────────────────────────

  const reorderTeam = useCallback(async (teamId: string, newOrder: string[]) => {
    if (!weekId) return

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
  }, [weekId, selections])

  // ── Mutation: movePlayer (cross-team drag) ────────────────────────────────

  const movePlayer = useCallback(async (fromTeamId: string, toTeamId: string, playerId: string) => {
    await assignPlayer(toTeamId, playerId)
  }, [assignPlayer])

  // ── Mutation: setCaptain (CP7-A new) ──────────────────────────────────────

  const setCaptain = useCallback(async (teamId: string, playerId: string | null) => {
    if (!weekId) return

    const prevSelections = [...selections]

    // Optimistic update
    setSelections(prev => prev.map(s =>
      s.week_team_id === teamId ? { ...s, captain_id: playerId } : s
    ))

    try {
      // Targeted single-column update — does NOT replace player_order
      const { error } = await supabase
        .from('team_selections')
        .update({ captain_id: playerId })
        .eq('week_id', weekId)
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
  }, [weekId, selections])

  return {
    teams,
    allPlayers,
    unassignedPlayers,
    availabilityMap,
    loading,
    error,
    saveStatus,
    setSaveStatus,
    assignPlayer,
    removePlayer,
    reorderTeam,
    movePlayer,
    setCaptain,
  }
}
