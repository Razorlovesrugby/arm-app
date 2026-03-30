// src/pages/Board.tsx
// CP7A.1 — Board screen: hosts the Selection Board
// Fetches weeks list; passes initialWeekId + weeks to SelectionBoard
// CP7-B: week switching is now managed inside SelectionBoard / useSelectionBoard
// BUG-1: reads ?week= query param and passes as initialWeekId

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Week } from '../lib/supabase'
import SelectionBoard from '../components/SelectionBoard'

export default function Board() {
  const [searchParams] = useSearchParams()
  const [weeks, setWeeks] = useState<Week[]>([])
  const [activeWeekId, setActiveWeekId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWeeks() {
      const { data, error } = await supabase
        .from('weeks')
        .select('*')
        .order('start_date', { ascending: false })

      if (!error && data) {
        setWeeks(data)
        // Use week query param if present, otherwise auto-select most recent open week
        const queryWeekId = searchParams.get('week')
        if (queryWeekId) {
          setActiveWeekId(queryWeekId)
        } else {
          const openWeek = data.find((w: Week) => w.status === 'Open')
          setActiveWeekId(openWeek?.id ?? data[0]?.id ?? null)
        }
      }
      setLoading(false)
    }
    fetchWeeks()
  }, [searchParams])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)' }}>
        Loading…
      </div>
    )
  }

  return (
    <SelectionBoard
      initialWeekId={activeWeekId}
      weeks={weeks}
    />
  )
}
