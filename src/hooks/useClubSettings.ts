import { useEffect, useState, useCallback } from 'react'
import { supabase, ClubSettings } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface UseClubSettingsResult {
  clubSettings: ClubSettings | null
  loading: boolean
  error: string | null
  refetch: () => void
  updateClubSettings: (settings: Partial<ClubSettings>) => Promise<{ error: string | null }>
}

export function useClubSettings(): UseClubSettingsResult {
  const { activeClubId } = useAuth()
  const [clubSettings, setClubSettings] = useState<ClubSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClubSettings = useCallback(async () => {
    if (!activeClubId) {
      console.error('activeClubId is null - cannot fetch club settings')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('club_settings')
      .select('*')
      .eq('club_id', activeClubId)
      .limit(1)
      .maybeSingle()

    if (error) {
      setError(error.message)
      setClubSettings(null)
    } else if (!data) {
      // No row yet for this club — treat as "not configured" rather than an error.
      setClubSettings(null)
    } else {
      setClubSettings(data)
    }

    setLoading(false)
  }, [activeClubId])

  useEffect(() => {
    fetchClubSettings()
  }, [fetchClubSettings])

  const updateClubSettings = useCallback(async (
    settings: Partial<ClubSettings>
  ): Promise<{ error: string | null }> => {
    if (!activeClubId) {
      return { error: 'No active club' }
    }

    // Validate default_teams
    if (settings.default_teams !== undefined && settings.default_teams !== null) {
      if (settings.default_teams.length > 10) {
        return { error: 'Maximum 10 default teams allowed' }
      }
      if (settings.default_teams.some(t => !t.trim())) {
        return { error: 'Team names cannot be empty' }
      }
    }

    // Strip id from incoming patch — upsert resolves conflict on club_id, not id.
    // Including a null/undefined id would otherwise force a new insert path.
    const patch: Partial<ClubSettings> = { ...settings }
    delete patch.id

    const { error } = await supabase
      .from('club_settings')
      .upsert(
        {
          ...patch,
          club_id: activeClubId,
        },
        { onConflict: 'club_id' }
      )

    if (error) {
      return { error: error.message }
    }

    await fetchClubSettings()
    return { error: null }
  }, [activeClubId, fetchClubSettings])

  return { 
    clubSettings, 
    loading, 
    error, 
    refetch: fetchClubSettings,
    updateClubSettings
  }
}