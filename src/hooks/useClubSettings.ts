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
      .single()
    
    if (error) {
      setError(error.message)
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