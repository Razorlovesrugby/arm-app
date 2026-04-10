import { useEffect, useState, useCallback } from 'react'
import { supabase, Player } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface UsePlayersOptions {
  excludeRetired?: boolean
  excludeArchived?: boolean
}

interface UsePlayersResult {
  players: Player[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePlayers(options?: UsePlayersOptions): UsePlayersResult {
  const { excludeRetired = false, excludeArchived = false } = options || {}
  const { activeClubId } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlayers = useCallback(async () => {
    if (!activeClubId) {
      console.error('activeClubId is null - cannot fetch players')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    let query = supabase
      .from('players')
      .select('*')
      .eq('club_id', activeClubId)

    // Apply filters at database level for efficiency
    if (excludeRetired) {
      query = query.neq('status', 'Retired')
    }
    if (excludeArchived) {
      query = query.neq('status', 'Archived')
    }

    const { data, error } = await query.order('name', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setPlayers(data ?? [])
    }
    setLoading(false)
  }, [excludeRetired, excludeArchived, activeClubId])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  return { players, loading, error, refetch: fetchPlayers }
}
