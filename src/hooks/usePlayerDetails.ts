// Client-side aggregation (MVP). TODO: RPC migration for scaling.
import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { PlayerStatus } from '../lib/supabase'

export interface PlayerStats {
  tries: number
  conversions: number
  penalties: number
  dropGoals: number
  yellowCards: number
  redCards: number
  dotd: number
  mvpPoints: number // Sum of points column for mvp_3/mvp_2/mvp_1 events
}

export interface PlayerCRMPatch {
  historical_caps?: number
  court_fines?: string | null
  status?: PlayerStatus
}

export function usePlayerDetails() {
  const fetchPlayerStats = useCallback(async (playerId: string): Promise<PlayerStats> => {
    const { data, error } = await supabase
      .from('match_events')
      .select('event_type, points')
      .eq('player_id', playerId)

    if (error) throw new Error(error.message)

    const stats: PlayerStats = {
      tries: 0, conversions: 0, penalties: 0, dropGoals: 0,
      yellowCards: 0, redCards: 0, dotd: 0, mvpPoints: 0,
    }

    for (const event of (data ?? [])) {
      switch (event.event_type) {
        case 'try':         stats.tries++;                         break
        case 'conversion':  stats.conversions++;                   break
        case 'penalty':     stats.penalties++;                     break
        case 'drop_goal':   stats.dropGoals++;                     break
        case 'yellow_card': stats.yellowCards++;                   break
        case 'red_card':    stats.redCards++;                      break
        case 'dotd':        stats.dotd++;                          break
        case 'mvp_3':
        case 'mvp_2':
        case 'mvp_1':       stats.mvpPoints += (event.points ?? 0); break
      }
    }

    return stats
  }, [])

  // Invalidate usePlayers cache: caller must invoke refetch() on the parent after this resolves
  const updatePlayerCRM = useCallback(async (playerId: string, patch: PlayerCRMPatch): Promise<void> => {
    const { error } = await supabase
      .from('players')
      .update(patch)
      .eq('id', playerId)

    if (error) throw new Error(error.message)
  }, [])

  return { fetchPlayerStats, updatePlayerCRM }
}
