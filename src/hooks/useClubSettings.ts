import { useEffect, useState, useCallback } from 'react'
import { supabase, ClubSettings } from '../lib/supabase'

interface UseClubSettingsResult {
  clubSettings: ClubSettings | null
  loading: boolean
  error: string | null
  refetch: () => void
  updateClubSettings: (settings: Partial<ClubSettings>) => Promise<{ error: string | null }>
}

export function useClubSettings(): UseClubSettingsResult {
  const [clubSettings, setClubSettings] = useState<ClubSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClubSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    // There should only be one row in club_settings table
    const { data, error } = await supabase
      .from('club_settings')
      .select('*')
      .limit(1)
      .single()
    
    if (error) {
      setError(error.message)
      setClubSettings(null)
    } else {
      setClubSettings(data)
    }
    
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchClubSettings()
  }, [fetchClubSettings])

  const updateClubSettings = useCallback(async (
    settings: Partial<ClubSettings>
  ): Promise<{ error: string | null }> => {
    const currentSettings = clubSettings
    if (!currentSettings) {
      return { error: 'No club settings found' }
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

    const { error } = await supabase
      .from('club_settings')
      .update(settings)
      .eq('id', currentSettings.id)

    if (error) {
      return { error: error.message }
    }

    await fetchClubSettings()
    return { error: null }
  }, [clubSettings, fetchClubSettings])

  return { 
    clubSettings, 
    loading, 
    error, 
    refetch: fetchClubSettings,
    updateClubSettings
  }
}