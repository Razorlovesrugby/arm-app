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

    // Strip id from incoming patch — we resolve update vs insert ourselves.
    const patch: Partial<ClubSettings> = { ...settings }
    delete patch.id

    // Re-check for an existing row at save time (avoids races vs the cached state)
    // and decide whether to UPDATE the existing row or INSERT a new one. This
    // sidesteps the need for a UNIQUE constraint on club_settings.club_id.
    const { data: existing, error: lookupError } = await supabase
      .from('club_settings')
      .select('id')
      .eq('club_id', activeClubId)
      .limit(1)
      .maybeSingle()

    if (lookupError) {
      return { error: lookupError.message }
    }

    if (existing?.id) {
      const { error } = await supabase
        .from('club_settings')
        .update({ ...patch, club_id: activeClubId })
        .eq('id', existing.id)
        .eq('club_id', activeClubId)

      if (error) {
        return { error: error.message }
      }
    } else {
      const { error } = await supabase
        .from('club_settings')
        .insert({ ...patch, club_id: activeClubId })

      if (error) {
        return { error: error.message }
      }
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