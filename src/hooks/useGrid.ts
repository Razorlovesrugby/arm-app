import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase, AvailabilityResponse, Availability } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface GridPlayer {
  id: string
  name: string
}

export interface GridWeek {
  id: string
  label: string
  start_date: string
  end_date: string
}

// 2D lookup: availabilityMatrix[playerId][weekId] = Availability | null
export type AvailabilityMatrix = Record<string, Record<string, Availability | null>>

interface UseGridResult {
  players: GridPlayer[]
  weeks: GridWeek[]
  matrix: AvailabilityMatrix
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useGrid(): UseGridResult {
  const { activeClubId } = useAuth()
  const [players, setPlayers] = useState<GridPlayer[]>([])
  const [weeks, setWeeks] = useState<GridWeek[]>([])
  const [responses, setResponses] = useState<AvailabilityResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async (sig?: { cancelled: boolean }) => {
    if (!activeClubId) {
      setPlayers([])
      setWeeks([])
      setResponses([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const today = new Date().toISOString().split('T')[0]

    const [playersRes, weeksRes] = await Promise.all([
      supabase
        .from('players')
        .select('id, name')
        .eq('club_id', activeClubId)
        .eq('is_retired', false)
        .order('name', { ascending: true }),
      supabase
        .from('weeks')
        .select('id, label, start_date, end_date')
        .eq('club_id', activeClubId)
        .gte('end_date', today)
        .eq('status', 'Open')
        .order('start_date', { ascending: true }),
    ])

    if (sig?.cancelled) return
    if (playersRes.error) {
      setError(playersRes.error.message)
      setLoading(false)
      return
    }
    if (weeksRes.error) {
      setError(weeksRes.error.message)
      setLoading(false)
      return
    }

    const fetchedPlayers = (playersRes.data ?? []) as GridPlayer[]
    const fetchedWeeks = (weeksRes.data ?? []) as GridWeek[]

    setPlayers(fetchedPlayers)
    setWeeks(fetchedWeeks)

    if (fetchedPlayers.length === 0 || fetchedWeeks.length === 0) {
      setResponses([])
      setLoading(false)
      return
    }

    const playerIds = fetchedPlayers.map(p => p.id)
    const weekIds = fetchedWeeks.map(w => w.id)

    const { data: respData, error: respError } = await supabase
      .from('availability_responses')
      .select('player_id, week_id, availability')
      .in('player_id', playerIds)
      .in('week_id', weekIds)

    if (sig?.cancelled) return
    if (respError) {
      setError(respError.message)
      setLoading(false)
      return
    }

    setResponses((respData ?? []) as AvailabilityResponse[])
    setLoading(false)
  }, [activeClubId])

  useEffect(() => {
    const sig = { cancelled: false }
    fetchAll(sig)
    return () => { sig.cancelled = true }
  }, [fetchAll])

  // Build 2D dictionary: matrix[playerId][weekId] = Availability | null
  const matrix = useMemo<AvailabilityMatrix>(() => {
    const m: AvailabilityMatrix = {}
    for (const r of responses) {
      if (!m[r.player_id]) m[r.player_id] = {}
      m[r.player_id][r.week_id] = r.availability
    }
    return m
  }, [responses])

  return { players, weeks, matrix, loading, error, refetch: fetchAll }
}
