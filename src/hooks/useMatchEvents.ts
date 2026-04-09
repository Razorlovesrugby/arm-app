import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { MatchEvent, MatchEventType } from '../lib/supabase'

export interface TeamStats {
  tries: number
  conversions: number
  penalties: number
  dropGoals: number
  yellowCards: number
  redCards: number
}

// One row per player per event-type — used to drive steppers
export interface PlayerEventCounts {
  playerId: string
  try: number
  conversion: number
  penalty: number
  drop_goal: number
  yellow_card: number
  red_card: number
  conversionMisses: number
  penaltyMisses: number
}

export function useMatchEvents() {
  const [events, setEvents]   = useState<MatchEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)

  const fetchMatchEvents = useCallback(async (weekId: string, weekTeamId: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('match_events')
      .select('*')
      .eq('week_id', weekId)
      .eq('week_team_id', weekTeamId)
    setEvents((data ?? []) as MatchEvent[])
    setLoading(false)
  }, [])

  // Save all player events for a team in a single batch (delete-then-insert)
  const saveMatchEvents = useCallback(async (
    weekId: string,
    weekTeamId: string,
    playerCounts: PlayerEventCounts[],
  ): Promise<void> => {
    setSaving(true)

    const SCORING_POINTS: Record<string, number> = {
      try: 5, conversion: 2, penalty: 3, drop_goal: 3,
      yellow_card: 0, red_card: 0,
      'Conversion Miss': 0, 'Penalty Miss': 0,
    }

    // Delete all scoring events for this team (not awards — handled separately)
    await supabase
      .from('match_events')
      .delete()
      .eq('week_id', weekId)
      .eq('week_team_id', weekTeamId)
      .in('event_type', ['try', 'conversion', 'penalty', 'drop_goal', 'yellow_card', 'red_card', 'Conversion Miss', 'Penalty Miss'])

    // Build insert rows — one row per occurrence
    const rows: Omit<MatchEvent, 'id' | 'created_at'>[] = []
    for (const p of playerCounts) {
      const types: (keyof Omit<PlayerEventCounts, 'playerId'>)[] = [
        'try', 'conversion', 'penalty', 'drop_goal', 'yellow_card', 'red_card',
        'conversionMisses', 'penaltyMisses',
      ]
      for (const t of types) {
        const count = p[t]
        const eventType = (
          t === 'conversionMisses' ? 'Conversion Miss' :
          t === 'penaltyMisses'    ? 'Penalty Miss'    :
          t
        ) as MatchEventType
        for (let i = 0; i < count; i++) {
          rows.push({
            week_id:      weekId,
            week_team_id: weekTeamId,
            player_id:    p.playerId,
            event_type:   eventType,
            points:       SCORING_POINTS[eventType] ?? 0,
          })
        }
      }
    }

    if (rows.length > 0) {
      await supabase.from('match_events').insert(rows)
    }

    // Refresh local state
    await fetchMatchEvents(weekId, weekTeamId)
    setSaving(false)
  }, [fetchMatchEvents])

  // Save a single award (mvp_3, mvp_2, mvp_1, dotd) — unique per type per team
  const saveAward = useCallback(async (
    weekId: string,
    weekTeamId: string,
    awardType: 'mvp_3' | 'mvp_2' | 'mvp_1' | 'dotd',
    playerId: string | null,
  ): Promise<void> => {
    // Remove old award of this type for this team
    await supabase
      .from('match_events')
      .delete()
      .eq('week_id', weekId)
      .eq('week_team_id', weekTeamId)
      .eq('event_type', awardType)

    if (playerId) {
      await supabase.from('match_events').insert({
        week_id:      weekId,
        week_team_id: weekTeamId,
        player_id:    playerId,
        event_type:   awardType,
        points:       0,
      })
    }

    await fetchMatchEvents(weekId, weekTeamId)
  }, [fetchMatchEvents])

  // Derive team-level stats from loaded events
  function getTeamStats(): TeamStats {
    const count = (type: MatchEventType) => events.filter(e => e.event_type === type).length
    return {
      tries:       count('try'),
      conversions: count('conversion'),
      penalties:   count('penalty'),
      dropGoals:   count('drop_goal'),
      yellowCards: count('yellow_card'),
      redCards:    count('red_card'),
    }
  }

  // Build per-player event counts from loaded events
  function getPlayerCounts(playerIds: string[]): PlayerEventCounts[] {
    return playerIds.map(playerId => {
      const pEvents = events.filter(e => e.player_id === playerId)
      const count = (t: MatchEventType) => pEvents.filter(e => e.event_type === t).length
      return {
        playerId,
        try:              count('try'),
        conversion:       count('conversion'),
        penalty:          count('penalty'),
        drop_goal:        count('drop_goal'),
        yellow_card:      count('yellow_card'),
        red_card:         count('red_card'),
        conversionMisses: count('Conversion Miss'),
        penaltyMisses:    count('Penalty Miss'),
      }
    })
  }

  // Get award winner for a given type
  function getAwardWinner(awardType: 'mvp_3' | 'mvp_2' | 'mvp_1' | 'dotd'): string | null {
    return events.find(e => e.event_type === awardType)?.player_id ?? null
  }

  return {
    events,
    loading,
    saving,
    fetchMatchEvents,
    saveMatchEvents,
    saveAward,
    getTeamStats,
    getPlayerCounts,
    getAwardWinner,
  }
}
