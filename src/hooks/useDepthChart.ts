import { useEffect, useState, useCallback } from 'react'
import { supabase, Player, Position, POSITIONS } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// One column per position — players in display order
export interface PositionColumn {
  position: Position
  orderRowId: string       // depth_chart_order.id — needed for upsert
  players: Player[]        // ordered: explicit order first, then unordered appended by name
}

interface UseDepthChartResult {
  columns: PositionColumn[]
  loading: boolean
  error: string | null
  updateOrder: (position: Position, orderedPlayerIds: string[]) => Promise<void>
  refetch: () => void
}

// Merge depth_chart_order with players into ordered columns
function buildColumns(
  players: Player[],
  orderRows: { id: string; position: Position; player_order: string[] }[]
): PositionColumn[] {
  return POSITIONS.map((position) => {
    const row = orderRows.find((r) => r.position === position)
    const orderRowId = row?.id ?? ''
    const explicitOrder: string[] = row?.player_order ?? []

    // Players whose primary_position matches this column
    const positionPlayers = players.filter((p) => p.primary_position === position)

    // Split into: explicitly ordered vs unordered
    const orderedPlayers: Player[] = []
    explicitOrder.forEach((id) => {
      const p = positionPlayers.find((pl) => pl.id === id)
      if (p) orderedPlayers.push(p)
    })

    const orderedIds = new Set(explicitOrder)
    const unorderedPlayers = positionPlayers
      .filter((p) => !orderedIds.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name))

    return {
      position,
      orderRowId,
      players: [...orderedPlayers, ...unorderedPlayers],
    }
  })
}

export function useDepthChart(): UseDepthChartResult {
  const { activeClubId } = useAuth()
  const [columns, setColumns] = useState<PositionColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!activeClubId) {
      console.error('activeClubId is null - cannot fetch depth chart')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const [playersRes, orderRes] = await Promise.all([
      supabase.from('players').select('*').eq('club_id', activeClubId).order('name', { ascending: true }),
      supabase.from('depth_chart_order').select('*').eq('club_id', activeClubId),
    ])

    if (playersRes.error) {
      setError(playersRes.error.message)
      setLoading(false)
      return
    }
    if (orderRes.error) {
      setError(orderRes.error.message)
      setLoading(false)
      return
    }

    const built = buildColumns(playersRes.data ?? [], orderRes.data ?? [])
    setColumns(built)
    setLoading(false)
  }, [activeClubId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Optimistic update + Supabase upsert
  const updateOrder = useCallback(
    async (position: Position, orderedPlayerIds: string[]) => {
      // Optimistic: update local state immediately
      setColumns((prev) =>
        prev.map((col) => {
          if (col.position !== position) return col
          const playerMap = new Map(col.players.map((p) => [p.id, p]))
          const reordered = orderedPlayerIds
            .map((id) => playerMap.get(id))
            .filter((p): p is Player => p !== undefined)
          return { ...col, players: reordered }
        })
      )

      // Persist to Supabase
      const col = columns.find((c) => c.position === position)
      if (!col?.orderRowId) return

      const { error } = await supabase
        .from('depth_chart_order')
        .update({ player_order: orderedPlayerIds, updated_at: new Date().toISOString() })
        .eq('id', col.orderRowId)

      if (error) {
        // Roll back on failure
        setError(error.message)
        fetchAll()
      }
    },
    [columns, fetchAll]
  )

  return { columns, loading, error, updateOrder, refetch: fetchAll }
}
