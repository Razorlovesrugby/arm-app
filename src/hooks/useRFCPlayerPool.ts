// src/hooks/useRFCPlayerPool.ts
// Phase 17.5 — Fetches all players across RDO-managed clubs via RPC
// Phase 17.8 — Also fetches club settings player types for dynamic filter options

import { useEffect, useState } from 'react'
import { supabase, type PlayerPoolRow } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useRFCPlayerPool() {
  const { user, role } = useAuth()
  const [data, setData] = useState<PlayerPoolRow[]>([])
  const [playerTypeOptions, setPlayerTypeOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (role !== 'rdo' || !user) {
      setData([])
      setPlayerTypeOptions([])
      setLoading(false)
      return
    }

    let ignore = false
    const userId = user.id

    async function fetchPlayerPool() {
      setLoading(true)
      setError(null)

      try {
        const [poolResult, clubAccessResult] = await Promise.all([
          supabase.rpc('get_rfc_player_pool', { user_uuid: userId }),
          supabase.from('rdo_club_access').select('club_id').eq('user_id', userId),
        ])

        if (ignore) return

        if (poolResult.error) throw new Error(poolResult.error.message)
        if (clubAccessResult.error) throw new Error(clubAccessResult.error.message)

        const poolData = (poolResult.data as PlayerPoolRow[]) ?? []
        const clubIds = (clubAccessResult.data ?? []).map(r => r.club_id)

        setData(poolData)

        // Fetch player_types from all managed clubs' settings for accurate filter options
        if (clubIds.length > 0) {
          const { data: settingsData } = await supabase
            .from('club_settings')
            .select('player_types')
            .in('club_id', Array.isArray(clubIds) ? clubIds : [])

          if (!ignore && settingsData) {
            const allTypes = [...new Set(settingsData.flatMap(s => (s.player_types as string[]) ?? []))]
            setPlayerTypeOptions(allTypes.sort())
          }
        }

        if (!ignore) setLoading(false)
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

  return { data, loading, error, playerTypeOptions }
}
