import { useEffect, useState, useCallback } from 'react'
import { supabase, Player } from '../lib/supabase'

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
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    let query = supabase
      .from('players')
      .select('*')
    
    // Apply filters at database level for efficiency
    if (excludeRetired) {
      query = query.eq('is_retired', false)
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
  }, [excludeRetired, excludeArchived])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  return { players, loading, error, refetch: fetchPlayers }
}
