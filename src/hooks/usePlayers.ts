import { useEffect, useState, useCallback } from 'react'
import { supabase, Player } from '../lib/supabase'

interface UsePlayersResult {
  players: Player[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePlayers(): UsePlayersResult {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name', { ascending: true })
    if (error) {
      setError(error.message)
    } else {
      setPlayers(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  return { players, loading, error, refetch: fetchPlayers }
}
