import { useState, useEffect, useRef } from 'react'
import { Info } from 'lucide-react'
import { useClubSettings } from '../hooks/useClubSettings'
import { getContrastColor, isValidHexColor } from '../lib/colorUtils'

export default function ClubSettings() {
  const { clubSettings, loading, updateClubSettings } = useClubSettings()

  const [clubName, setClubName] = useState('')
  const [brandColor, setBrandColor] = useState('#6B21A8')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoValid, setLogoValid] = useState(false)
  const [defaultTeams, setDefaultTeams] = useState<string[]>(['1st XV', '2nd XV'])
  const [defaultSquadSize, setDefaultSquadSize] = useState(22)
  const [requirePositions, setRequirePositions] = useState(true)
  const [requireContactInfo, setRequireContactInfo] = useState(false)
  const [requireBirthday, setRequireBirthday] = useState(false)
  const [trainingDays, setTrainingDays] = useState<{ id: string; label: string }[]>([{ id: '1', label: 'Wednesday' }])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Sync from loaded settings
  useEffect(() => {
    if (!clubSettings) return
    setClubName(clubSettings.club_name ?? '')
    setBrandColor(clubSettings.primary_color ?? '#6B21A8')
    setLogoUrl(clubSettings.logo_url ?? '')
    if (clubSettings.logo_url) {
      const testImg = new Image()
      testImg.onload = () => setLogoValid(true)
      testImg.onerror = () => setLogoValid(false)
      testImg.src = clubSettings.logo_url
    }
    setDefaultTeams(
      clubSettings.default_teams && clubSettings.default_teams.length > 0
        ? clubSettings.default_teams
        : ['1st XV', '2nd XV']
    )
    setDefaultSquadSize(clubSettings.default_squad_size ?? 22)
    setRequirePositions(clubSettings.require_positions_in_form ?? true)
    setRequireContactInfo(clubSettings.require_contact_info ?? false)
    setRequireBirthday(clubSettings.require_birthday ?? false)
    const days = clubSettings.training_days
    setTrainingDays(
      days && days.length > 0 ? days : [{ id: '1', label: 'Wednesday' }]
    )
  }, [clubSettings])

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (abortRef.current) abortRef.current.abort() }
  }, [])

  function addTeam() {
    if (defaultTeams.length >= 10) return
    setDefaultTeams(prev => [...prev, ''])
  }

  function removeTeam(idx: number) {
    if (defaultTeams.length <= 1) return
    setDefaultTeams(prev => prev.filter((_, i) => i !== idx))
  }

  function updateTeamName(idx: number, value: string) {
    setDefaultTeams(prev => prev.map((t, i) => i === idx ? value : t))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!clubName.trim()) e.clubName = 'Club name is required'
    if (brandColor && !isValidHexColor(brandColor)) e.brandColor = 'Invalid hex color (e.g. #6B21A8)'
    const trimmedTeams = defaultTeams.map(t => t.trim()).filter(Boolean)
    if (trimmedTeams.length === 0) e.teams = 'At least one team is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setSaving(true)
    setSaveSuccess(false)

    const trimmedTeams = defaultTeams.map(t => t.trim()).filter(Boolean)
    const trimmedDays = trainingDays.map(d => ({ id: d.id, label: d.label.trim() })).filter(d => d.label)

    const { error } = await updateClubSettings({
      club_name: clubName.trim(),
      primary_color: brandColor || '#6B21A8',
      logo_url: logoUrl.trim() || null,
      default_teams: trimmedTeams,
      default_squad_size: defaultSquadSize,
      require_positions_in_form: requirePositions,
      require_contact_info: requireContactInfo,
      require_birthday: requireBirthday,
      training_days: trimmedDays.length > 0 ? trimmedDays : [{ id: '1', label: 'Wednesday' }],
    })

    setSaving(false)
    if (error) {
      setErrors({ save: error })
    } else {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  const safeColor = isValidHexColor(brandColor) ? brandColor : '#6B21A8'
  const textClass = getContrastColor(safeColor)

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-800 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-20">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Club Settings</h1>
      <p className="text-sm font-normal text-gray-500 mb-6">
        Customize your club's branding and default teams
      </p>

      <div className="space-y-6">

        {/* Club Name */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Club Name</label>
          <input
            type="text"
            value={clubName}
            onChange={e => {
              setClubName(e.target.value)
              if (errors.clubName) setErrors(prev => { const { clubName: _, ...rest } = prev; return rest })
            }}
            placeholder="e.g. Riverside RFC"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
          />
          {errors.clubName && <p className="text-xs font-medium text-red-600 mt-1">{errors.clubName}</p>}
        </div>

        {/* Brand Color */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Brand Color</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={brandColor}
              onChange={e => {
                const val = e.target.value
                setBrandColor(val)
                if (!isValidHexColor(val)) {
                  setErrors(prev => ({ ...prev, brandColor: 'Invalid hex color' }))
                } else {
                  setErrors(prev => { const { brandColor: _, ...rest } = prev; return rest })
                }
              }}
              placeholder="#6B21A8"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
            <input
              type="color"
              value={brandColor.startsWith('#') ? brandColor : '#6B21A8'}
              onChange={e => setBrandColor(e.target.value)}
              className="w-12 h-12 p-1 border border-gray-300 rounded-lg cursor-pointer"
            />
          </div>
          {errors.brandColor && <p className="text-xs font-medium text-red-600 mt-1">{errors.brandColor}</p>}
          <p className="text-xs text-gray-500 mt-1">
            Primary color for buttons and headers.{' '}
            {textClass === 'text-gray-900' ? 'Will use black text.' : 'Will use white text.'}
          </p>
        </div>

        {/* Logo URL */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Logo URL</label>
          <input
            type="text"
            value={logoUrl}
            onChange={e => {
              setLogoUrl(e.target.value)
              if (e.target.value) {
                const testImg = new Image()
                testImg.onload = () => setLogoValid(true)
                testImg.onerror = () => setLogoValid(false)
                testImg.src = e.target.value
              } else {
                setLogoValid(false)
              }
            }}
            placeholder="https://example.com/logo.png"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
          />
          {logoUrl && !logoValid && (
            <p className="text-xs font-medium text-amber-600 mt-1">Warning: Could not load image from this URL</p>
          )}
          {logoUrl && logoValid && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">Preview:</p>
              <img
                src={logoUrl}
                alt="Logo preview"
                className="max-h-12 max-w-full object-contain"
                onError={() => setLogoValid(false)}
              />
            </div>
          )}
        </div>

        {/* Training Schedule */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Training Schedule</label>
          <p className="text-xs text-gray-500 mb-3">Days used for tracking attendance each week</p>

          <div className="space-y-3">
            {trainingDays.map((day, idx) => (
              <div key={day.id} className="flex items-center gap-3">
                <input
                  type="text"
                  value={day.label}
                  onChange={e => setTrainingDays(prev => prev.map((d, i) => i === idx ? { ...d, label: e.target.value } : d))}
                  placeholder="e.g. Wednesday"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => setTrainingDays(prev => prev.filter((_, i) => i !== idx))}
                  disabled={trainingDays.length <= 1}
                  className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setTrainingDays(prev => [...prev, { id: String(Date.now()), label: '' }])}
              className="w-full rounded-lg bg-purple-100 px-4 py-3 text-sm font-medium text-purple-700"
            >
              + Add Training Day
            </button>
          </div>
        </div>

        {/* Default Teams */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium text-gray-700">Default Teams</label>
            <div className="group relative">
              <Info className="w-4 h-4 text-gray-400" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Changing defaults won't update existing weeks
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3">These teams will pre-fill when creating a new week</p>

          <div className="space-y-3">
            {defaultTeams.map((team, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={team}
                  onChange={e => updateTeamName(idx, e.target.value)}
                  placeholder="e.g., 1st XV"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => removeTeam(idx)}
                  disabled={defaultTeams.length <= 1}
                  className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addTeam}
              disabled={defaultTeams.length >= 10}
              className="text-sm font-medium text-purple-700 hover:text-purple-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              + Add Team
            </button>

            {defaultTeams.length >= 10 && (
              <p className="text-xs text-gray-500">Maximum 10 teams</p>
            )}
          </div>

          {errors.teams && <p className="text-xs font-medium text-red-600 mt-1">{errors.teams}</p>}
        </div>

        {/* Default Squad Size */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Default Squad Size</label>
          <input
            type="number"
            value={defaultSquadSize}
            onChange={e => {
              const val = parseInt(e.target.value, 10)
              setDefaultSquadSize(isNaN(val) ? 22 : val)
            }}
            placeholder="22"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
          />
          <p className="text-xs text-gray-500 mt-1">
            Total players (starters + bench) for new weeks. Current week: {clubSettings?.default_squad_size ?? 22}
          </p>
        </div>

        {/* Availability Form */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Availability Form</h3>
          <div className="space-y-4">

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Ask for positions</label>
                <p className="text-xs text-gray-500">Players will see primary/secondary position dropdowns</p>
              </div>
              <button
                type="button"
                onClick={() => setRequirePositions(v => !v)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${requirePositions ? 'bg-purple-700' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={requirePositions}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${requirePositions ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Ask for Email and Phone</label>
                <p className="text-xs text-gray-500">Collect contact info to build out your roster database</p>
              </div>
              <button
                type="button"
                onClick={() => setRequireContactInfo(v => !v)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${requireContactInfo ? 'bg-purple-700' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={requireContactInfo}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${requireContactInfo ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Ask for Birthday</label>
                <p className="text-xs text-gray-500">Collect date of birth for player records</p>
              </div>
              <button
                type="button"
                onClick={() => setRequireBirthday(v => !v)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${requireBirthday ? 'bg-purple-700' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={requireBirthday}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${requireBirthday ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

          </div>
        </div>

        {/* Save error */}
        {errors.save && (
          <p className="text-sm font-medium text-red-600">{errors.save}</p>
        )}

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{ backgroundColor: safeColor }}
          className={`w-full h-12 hover:opacity-90 ${textClass} text-sm font-semibold rounded-xl transition-opacity disabled:opacity-50`}
        >
          {saving ? 'Saving…' : saveSuccess ? 'Saved!' : 'Save Settings'}
        </button>

      </div>
    </div>
  )
}
