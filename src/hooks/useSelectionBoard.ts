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
import type { Player, WeekTeam, TeamSelection, AvailabilityResponse, PDFTeam, PDFPlayer } from '../lib/supabase'
import { RUGBY_POSITION_ORDER, DEFAULT_PLAYER_TYPES } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useClubSettings } from './useClubSettings'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerHistoryEntry {
  lastTeam: string
  lastPlayed: string   // formatted "d MMM" e.g. "22 Mar"
}

export interface SelectionTeam {
  weekTeam: WeekTeam
  selection: TeamSelection | null
  players: (Player | null)[]   // sparse: index = slot-1, null = empty slot
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
  toast: string | null
  saveStatus: 'idle' | 'saved' | 'error'
  setSaveStatus: (s: 'idle' | 'saved' | 'error') => void
  assignPlayer: (teamId: string, playerId: string) => Promise<void>
  removePlayer: (teamId: string, playerId: string) => Promise<void>
  reorderTeam: (teamId: string, newOrder: (string | null)[]) => Promise<void>
  movePlayer: (fromTeamId: string, toTeamId: string, playerId: string) => Promise<void>
  setCaptain: (teamId: string, playerId: string | null) => Promise<void>
  saveTeamSettings: (
    teamId: string,
    patch: Partial<Pick<WeekTeam, 'team_name' | 'starters_count' | 'visible' | 'is_active'>>
  ) => Promise<boolean>  // true = success, false = failure (stays open, error badge shown)
}

// ─── Rugby position labels (shirt number → position name) ─────────────────────

const RUGBY_POSITIONS: Record<number, string> = {
  1: 'Loosehead Prop',   2: 'Hooker',             3: 'Tighthead Prop',
  4: 'Lock',             5: 'Lock',               6: 'Blindside Flanker',
  7: 'Openside Flanker', 8: 'Number 8',           9: 'Scrum-half',
  10: 'Fly-half',        11: 'Left Wing',          12: 'Inside Centre',
  13: 'Outside Centre',  14: 'Right Wing',         15: 'Fullback',
}

// ─── PDF data transformer ─────────────────────────────────────────────────────

/**
 * Transforms SelectionTeam[] (from useSelectionBoard) into PDFTeam[] for TeamSheetPDF.
 * Shirt numbers are derived from slot position (index + 1).
 */
export function selectionTeamsToPDF(
  teams: SelectionTeam[],
  options?: { matchDate?: string },
): PDFTeam[] {
  return teams.map(team => {
    const players: PDFPlayer[] = team.players
      .map((player, idx): PDFPlayer | null => {
        if (!player) return null
        const shirtNumber = idx + 1
        return {
          id:          player.id,
          shirtNumber,
          fullName:    player.name,
          isCaptain:   team.captainId === player.id,
          totalCaps:   player.total_caps,
          position:    RUGBY_POSITIONS[shirtNumber],
        }
      })
      .filter((p): p is PDFPlayer => p !== null)

    return {
      teamName:   team.weekTeam.team_name,
      players,
      matchNotes: team.weekTeam.match_report ?? undefined,
      opponent:   team.weekTeam.opponent ?? undefined,
      matchDate:  options?.matchDate,
    }
  })
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
  const { activeClubId } = useAuth()
  const { clubSettings } = useClubSettings()

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
  const [toast,      setToast]                  = useState<string | null>(null)

  const setActiveWeekId = useCallback((id: string | null) => {
    setActiveWeekIdState(id)
  }, [])

  // ── Players fetch — week-agnostic, runs when activeClubId is available ───

  useEffect(() => {
    if (!activeClubId) {
      setAllPlayers([])
      return
    }
    let ignore = false
    supabase
      .rpc('get_club_players', { p_club_id: activeClubId })
      .then(({ data }) => { if (!ignore) setAllPlayers((data as Player[]) ?? []) })
    return () => { ignore = true }
  }, [activeClubId])

  // ── Week-scoped fetch — runs when activeWeekId changes ───────────────────

  const fetchWeekData = useCallback(async (wid: string | null, sig?: { cancelled: boolean }) => {
    if (!wid) {
      setWeekTeams([])
      setAllWeekTeams([])
      setSelections([])
      setAvailabilityMap({})
      setPlayerHistory({})
      setLoading(false)
      return
    }

    if (!activeClubId) {
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
          .eq('club_id', activeClubId)
          .eq('visible', true)
          .order('sort_order'),

        // All teams including hidden (gear-button fallback)
        supabase
          .from('week_teams')
          .select('*')
          .eq('week_id', wid)
          .eq('club_id', activeClubId)
          .order('sort_order'),

        supabase
          .from('team_selections')
          .select('*')
          .eq('week_id', wid)
          .eq('club_id', activeClubId),

        supabase
          .from('availability_responses')
          .select('*')
          .eq('week_id', wid)
          .eq('club_id', activeClubId)
          .order('created_at', { ascending: false }),

        // RPC: last selection history per player, excluding current week
        supabase.rpc('get_player_last_selections', { p_week_id: wid }),
      ])

      if (sig?.cancelled) return

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
      if (sig?.cancelled) return
      console.error('useSelectionBoard fetchWeekData error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load board')
    } finally {
      if (!sig?.cancelled) setLoading(false)
    }
  }, [activeClubId])

  useEffect(() => {
    const sig = { cancelled: false }
    fetchWeekData(activeWeekId, sig)
    return () => { sig.cancelled = true }
  }, [activeWeekId, fetchWeekData])

  // ── Derived: teams (visible only) — memoised for stable reference ─────────

  const teams = useMemo<SelectionTeam[]>(() =>
    weekTeams.map(wt => {
      const selection   = selections.find(s => s.week_team_id === wt.id) ?? null
      const playerOrder = selection?.player_order ?? []
      // Sparse array: null entries represent empty slots, preserving exact slot positions.
      // Unknown IDs (deleted players) map to null — safe fallback.
      const orderedPlayers: (Player | null)[] = playerOrder.map(
        id => (id ? (allPlayers.find(p => p.id === id) ?? null) : null)
      )

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
    // Filter out null sentinels — they represent empty slots, not assigned players
    const assignedIds = new Set(
      selections.flatMap(s => (s.player_order ?? []).filter((id): id is string => id !== null))
    )

    const typeOrder = clubSettings?.player_types ?? DEFAULT_PLAYER_TYPES

    return allPlayers
      .filter(p => {
        if (assignedIds.has(p.id)) return false
        const av = availabilityMap[p.id]?.availability
        return av === 'Available' || av === 'TBC'
      })
      .sort((a, b) => {
        // 1. Sort by Player Type (custom club order)
        const typeIndexA = typeOrder.indexOf(a.player_type)
        const typeIndexB = typeOrder.indexOf(b.player_type)
        if (typeIndexA !== typeIndexB) {
          if (typeIndexA === -1) return 1   // unknown types go last
          if (typeIndexB === -1) return -1
          return typeIndexA - typeIndexB
        }

        // 2. Sort by Rugby Position
        const posA = a.primary_position ?? 'Unspecified'
        const posB = b.primary_position ?? 'Unspecified'
        const posIndexA = RUGBY_POSITION_ORDER.indexOf(posA)
        const posIndexB = RUGBY_POSITION_ORDER.indexOf(posB)
        if (posIndexA !== posIndexB) {
          if (posIndexA === -1) return 1
          if (posIndexB === -1) return -1
          return posIndexA - posIndexB
        }

        // 3. Alphabetical fallback
        return a.name.localeCompare(b.name)
      })
  }, [allPlayers, selections, availabilityMap, clubSettings])

  // ── Helper: trim trailing nulls (keeps array compact in storage) ─────────

  function trimTrailingNulls(arr: (string | null)[]): (string | null)[] {
    let len = arr.length
    while (len > 0 && arr[len - 1] === null) len--
    return arr.slice(0, len)
  }

  // ── Helper: find which team a player is on ────────────────────────────────

  function findPlayerTeam(playerId: string): { teamId: string; order: (string | null)[] } | null {
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

  function flashToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3500)
  }

  // ── Upsert helper ─────────────────────────────────────────────────────────

  async function upsertSelection(weekTeamId: string, patch: Partial<TeamSelection>) {
    if (!activeWeekId) return
    if (!activeClubId) {
      console.error('upsertSelection aborted: no active club ID found')
      throw new Error('No active club')
    }
    const { error } = await supabase
      .from('team_selections')
      .upsert(
        { week_id: activeWeekId, week_team_id: weekTeamId, club_id: activeClubId, ...patch },
        { onConflict: 'week_id,week_team_id' }
      )
    if (error) throw error
  }

  // ── Mutation: assignPlayer ────────────────────────────────────────────────

  const assignPlayer = useCallback(async (teamId: string, playerId: string) => {
    if (!activeWeekId) return

    const squadSize = clubSettings?.default_squad_size ?? 22
    const prevSelections = [...selections]
    const existing = findPlayerTeam(playerId)

    // ── Step 1: Remove player from any existing team ──────────────────────
    let newSelections = selections.map(s => {
      if (existing && s.week_team_id === existing.teamId) {
        return { ...s, player_order: s.player_order.filter(id => id !== playerId) }
      }
      return s
    })

    const targetSel = newSelections.find(s => s.week_team_id === teamId)
    if (!targetSel) {
      // No selection exists yet — create one with just this player
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
    } else {
      const currentOrder = targetSel.player_order ?? []
      const trimmed = trimTrailingNulls(currentOrder)

      // ── Capacity Check 1: Append if room ──────────────────────────────
      if (trimmed.length < squadSize) {
        newSelections = newSelections.map(s =>
          s.week_team_id === teamId
            ? { ...s, player_order: [...trimmed, playerId] }
            : s
        )
      } else {
        // ── Capacity Check 2: Backfill null gaps ────────────────────────
        const gapIndex = currentOrder.slice(0, squadSize).indexOf(null)
        if (gapIndex !== -1) {
          const newOrder = [...currentOrder]
          newOrder[gapIndex] = playerId
          newSelections = newSelections.map(s =>
            s.week_team_id === teamId
              ? { ...s, player_order: newOrder }
              : s
          )
        } else {
          // ── Capacity Check 3: Team is completely full ─────────────────
          flashToast('Team is full (maximum squad size reached)')
          return
        }
      }
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
  }, [activeWeekId, selections, allPlayers, clubSettings])

  // ── Mutation: removePlayer ────────────────────────────────────────────────

  const removePlayer = useCallback(async (teamId: string, playerId: string) => {
    if (!activeWeekId) return

    const prevSelections = [...selections]
    const teamSel = selections.find(s => s.week_team_id === teamId)
    if (!teamSel) return

    // Replace the player's slot with null (preserves other players' slot positions),
    // then trim trailing nulls so storage stays compact.
    const newOrder      = trimTrailingNulls(
      teamSel.player_order.map((id): string | null => id === playerId ? null : id)
    )
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

  const reorderTeam = useCallback(async (teamId: string, newOrder: (string | null)[]) => {
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
    if (!activeClubId) {
      console.error('setCaptain aborted: no active club ID')
      flashError()
      return
    }

    const prevSelections = [...selections]
    setSelections(prev => prev.map(s =>
      s.week_team_id === teamId ? { ...s, captain_id: playerId } : s
    ))

    try {
      const { error } = await supabase
        .from('team_selections')
        .update({ captain_id: playerId, club_id: activeClubId })
        .eq('week_id', activeWeekId)
        .eq('week_team_id', teamId)
        .eq('club_id', activeClubId)
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
    patch: Partial<Pick<WeekTeam, 'team_name' | 'starters_count' | 'visible' | 'is_active'>>
  ): Promise<boolean> => {
    if (!activeClubId) {
      console.error('saveTeamSettings aborted: no active club ID')
      flashError()
      setError('Save failed')
      return false
    }

    const prevWeekTeams    = [...weekTeams]
    const prevAllWeekTeams = [...allWeekTeams]

    // Optimistic update both state arrays
    setWeekTeams(prev    => prev.map(t => t.id === teamId ? { ...t, ...patch } : t))
    setAllWeekTeams(prev => prev.map(t => t.id === teamId ? { ...t, ...patch } : t))

    try {
      const { error } = await supabase
        .from('week_teams')
        .update({ ...patch, club_id: activeClubId })
        .eq('id', teamId)
        .eq('club_id', activeClubId)
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
  }, [weekTeams, allWeekTeams, activeClubId])

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
    toast,
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
