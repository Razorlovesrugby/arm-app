// src/hooks/useRDOReadiness.ts
// Phase 17.4 — Aggregated club readiness data for RDO dashboard

import { useEffect, useState } from 'react'
import { supabase, type ClubReadiness, type SelectionStatus } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ── Raw Supabase shape ─────────────────────────────────────────────────────────

interface RawAvailabilityResponse {
  id: string
  player_id: string
  availability: string
}

interface RawTeamSelection {
  id: string
  player_order: unknown[]
}

interface RawWeek {
  id: string
  start_date: string
  availability_responses: RawAvailabilityResponse[]
  team_selections: RawTeamSelection[]
}

interface RawClub {
  id: string
  name: string
  club_settings: Array<{ logo_url: string | null }>
  weeks: RawWeek[]
}

interface RawRdoAccess {
  club_id: string
  clubs: RawClub | null
}

// ── Data transformation ────────────────────────────────────────────────────────

function deriveSelectionStatus(currentWeek: RawWeek | null): SelectionStatus {
  if (!currentWeek || currentWeek.team_selections.length === 0) return 'missing'
  const hasPlayers = currentWeek.team_selections.some((ts) => ts.player_order.length > 0)
  return hasPlayers ? 'locked' : 'draft'
}

function transformEntry(entry: RawRdoAccess): ClubReadiness | null {
  const club = entry.clubs
  if (!club) return null

  // Current week = most recent by start_date
  const sortedWeeks = [...club.weeks].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  )
  const currentWeek = sortedWeeks[0] ?? null

  // Roster size = players who submitted availability this week (any response)
  const rosterSize = currentWeek?.availability_responses.length ?? 0
  const availableCount =
    currentWeek?.availability_responses.filter((ar) => ar.availability === 'Available').length ?? 0
  const availabilityPercent =
    rosterSize > 0 ? Math.round((availableCount / rosterSize) * 100) : 0

  return {
    clubId: entry.club_id,
    clubName: club.name,
    logoUrl: club.club_settings?.[0]?.logo_url ?? null,
    rosterSize,
    availabilityPercent,
    selectionStatus: deriveSelectionStatus(currentWeek),
    currentWeekId: currentWeek?.id ?? null,
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useRDOReadiness() {
  const { user, role } = useAuth()
  const [data, setData] = useState<ClubReadiness[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (role !== 'rdo' || !user) {
      setData([])
      setLoading(false)
      return
    }

    let ignore = false
    const userId = user.id

    async function fetchReadinessData() {
      setLoading(true)
      setError(null)

      const { data: raw, error: fetchError } = await supabase
        .from('rdo_club_access')
        .select(`
          club_id,
          clubs (
            id,
            name,
            club_settings (logo_url),
            weeks (
              id,
              start_date,
              availability_responses (
                id,
                player_id,
                availability
              ),
              team_selections (
                id,
                player_order
              )
            )
          )
        `)
        .eq('user_id', userId)

      if (ignore) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      const readiness = ((raw ?? []) as unknown as RawRdoAccess[])
        .map(transformEntry)
        .filter((r): r is ClubReadiness => r !== null)
        .sort((a, b) => a.clubName.localeCompare(b.clubName))

      setData(readiness)
      setLoading(false)
    }

    fetchReadinessData()

    return () => {
      ignore = true
    }
  }, [user, role])

  return { data, loading, error }
}
