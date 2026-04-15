// src/hooks/useRFCPlayerPool.ts
// Phase 17.5 — Fetches all players across RDO-managed clubs via RPC

import { useEffect, useState } from 'react'
import { supabase, type PlayerPoolRow } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useRFCPlayerPool() {
  const { user, role } = useAuth()
  const [data, setData] = useState<PlayerPoolRow[]>([])
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

    async function fetchPlayerPool() {
      setLoading(true)
      setError(null)

      try {
        const { data: poolData, error: poolError } = await supabase
          .rpc('get_rfc_player_pool', { user_uuid: userId })

        if (ignore) return

        if (poolError) throw new Error(poolError.message)
        setData((poolData as PlayerPoolRow[]) ?? [])
        setLoading(false)
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to fetch player pool')
          setLoading(false)
        }
      }
    }

    fetchPlayerPool()

    return () => { ignore = true }
  }, [user, role])

  return { data, loading, error }
}
