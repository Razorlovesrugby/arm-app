import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Copy, Share2, Plus, Check, Link, Pencil, X } from 'lucide-react'
import { useWeeks, WeekWithTeams, AvailabilityCounts } from '../hooks/useWeeks'
import { useClubSettings } from '../hooks/useClubSettings'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCurrentMonday(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

function getCurrentSunday(): string {
  const monday = new Date(getCurrentMonday())
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return sunday.toISOString().split('T')[0]
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function autoLabel(startDate: string): string {
  if (!startDate) return ''
  const d = new Date(startDate + 'T00:00:00')
  return `Week of ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
}

function availabilityUrl(token: string): string {
  return `${window.location.origin}/availability/${token}`
}

function shareMessage(week: WeekWithTeams, clubName?: string): string {
  const url = availabilityUrl(week.availability_link_token)
  const club = clubName || 'ARM'
  return `${club} — ${week.label}. Please submit your availability for this week: ${url}. Takes 30 seconds, no login needed.`
}

/** "2026-03" → "Mar 2026" */
function formatMonthPill(ym: string): string {
  const [year, month] = ym.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

/** "2026-03-17" → "2026-03" */
function weekToYearMonth(startDate: string): string {
  return startDate.slice(0, 7)
}

// ─── Create Week Form ────────────────────────────────────────────────────────

interface CreateWeekFormProps {
  onClose: () => void
  onCreated: () => void
  createWeek: ReturnType<typeof useWeeks>['createWeek']
  defaultTeams?: string[]
}

function CreateWeekForm({ onClose, onCreated, createWeek, defaultTeams }: CreateWeekFormProps) {
  const defaultStart = getCurrentMonday()
  const defaultEnd = getCurrentSunday()

  const initialTeams = defaultTeams && defaultTeams.length > 0
    ? [...defaultTeams]
    : ['1st XV', '2nd XV']

  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [label, setLabel] = useState(autoLabel(defaultStart))
  const [labelTouched, setLabelTouched] = useState(false)
  const [teamNames, setTeamNames] = useState<string[]>(initialTeams)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ start?: string; end?: string; label?: string; teams?: string }>({})

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Auto-update label when start date changes (unless user manually edited it)
  const handleStartChange = useCallback((val: string) => {
    setStartDate(val)
    if (!labelTouched && val) setLabel(autoLabel(val))
  }, [labelTouched])

  function addTeam() {
    setTeamNames(prev => [...prev, ''])
  }

  function removeTeam(idx: number) {
    setTeamNames(prev => prev.filter((_, i) => i !== idx))
  }

  function updateTeamName(idx: number, value: string) {
    setTeamNames(prev => prev.map((n, i) => i === idx ? value : n))
  }

  function validate(): boolean {
    const e: typeof errors = {}
    if (!startDate) e.start = 'Start date is required'
    if (!endDate) e.end = 'End date is required'
    if (startDate && endDate && endDate < startDate) e.end = 'End date must be after start date'
    if (!label.trim()) e.label = 'Label is required'

    const trimmed = teamNames.map(n => n.trim()).filter(Boolean)
    if (trimmed.length === 0) {
      e.teams = 'At least one team is required'
    } else {
      const lower = trimmed.map(n => n.toLowerCase())
      const hasDupe = lower.some((n, i) => lower.indexOf(n) !== i)
      if (hasDupe) e.teams = 'Team names must be unique'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    const trimmedTeams = teamNames.map(n => n.trim()).filter(Boolean)
    const { error } = await createWeek({
      start_date: startDate,
      end_date: endDate,
      label: label.trim(),
      teamNames: trimmedTeams,
      notes: notes.trim() || undefined,
    })
    setSaving(false)
    if (error) {
      setErrors({ label: error })
    } else {
      onCreated()
      onClose()
    }
  }

  const isMobile = window.innerWidth < 768

  const sheetStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 51,
        background: '#FFFFFF',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        maxHeight: '90vh',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }
    : {
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 51,
        background: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '90vh',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
      }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50 }}
      />

      <div style={sheetStyle}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 16px',
          position: 'sticky', top: 0,
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>
            Create New Week
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px', borderRadius: '8px', color: '#6B7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minWidth: '44px', minHeight: '44px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Form body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Start date */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
              Start date <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              value={startDate}
              onChange={e => handleStartChange(e.target.value)}
              placeholder="YYYY-MM-DD"
              pattern="\d{4}-\d{2}-\d{2}"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 12px', borderRadius: '8px',
                border: `1px solid ${errors.start ? '#DC2626' : '#E5E7EB'}`,
                fontSize: '15px', color: '#111827', background: '#FFFFFF',
                outline: 'none', minHeight: '44px',
              }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
              Format: YYYY-MM-DD (e.g., {new Date().toISOString().split('T')[0]})
            </p>
            {errors.start && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#DC2626' }}>{errors.start}</p>}
          </div>

          {/* End date */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
              End date <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              placeholder="YYYY-MM-DD"
              pattern="\d{4}-\d{2}-\d{2}"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 12px', borderRadius: '8px',
                border: `1px solid ${errors.end ? '#DC2626' : '#E5E7EB'}`,
                fontSize: '15px', color: '#111827', background: '#FFFFFF',
                outline: 'none', minHeight: '44px',
              }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
              Format: YYYY-MM-DD (e.g., {new Date().toISOString().split('T')[0]})
            </p>
            {errors.end && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#DC2626' }}>{errors.end}</p>}
          </div>

          {/* Label */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
              Week label <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={e => { setLabel(e.target.value); setLabelTouched(true) }}
              placeholder="e.g. Week of 17 Mar"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 12px', borderRadius: '8px',
                border: `1px solid ${errors.label ? '#DC2626' : '#E5E7EB'}`,
                fontSize: '15px', color: '#111827', background: '#FFFFFF',
                outline: 'none', minHeight: '44px',
              }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
              Auto-generated from start date — edit if needed
            </p>
            {errors.label && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#DC2626' }}>{errors.label}</p>}
          </div>

          {/* Teams */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                Teams <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <button
                type="button"
                onClick={addTeam}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '4px 10px', borderRadius: '6px',
                  border: '1px solid #0062F4', background: 'transparent',
                  color: '#0062F4', fontSize: '13px', fontWeight: '600',
                  cursor: 'pointer', minHeight: '32px',
                }}
              >
                <Plus size={13} />
                Add team
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {teamNames.map((name, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={name}
                    onChange={e => updateTeamName(idx, e.target.value)}
                    placeholder={`Team ${idx + 1}`}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      fontSize: '15px', color: '#111827', background: '#FFFFFF',
                      outline: 'none', minHeight: '44px', boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeTeam(idx)}
                    disabled={teamNames.length === 1}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: '44px', minHeight: '44px',
                      border: '1px solid #E5E7EB', borderRadius: '8px',
                      background: '#FFFFFF', color: teamNames.length === 1 ? '#D1D5DB' : '#6B7280',
                      cursor: teamNames.length === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>

            {errors.teams && <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#DC2626' }}>{errors.teams}</p>}
          </div>

          {/* Game Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
              Game Notes
            </label>
            <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#6B7280' }}>
              Optional — kickoff time, location, bus info, etc.
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. KO 3pm, Riverside Park, Bus departs clubhouse at 2pm"
              maxLength={1000}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 12px', borderRadius: '8px',
                border: '1px solid #E5E7EB',
                fontSize: '14px', color: '#111827', background: '#FFFFFF',
                outline: 'none', resize: 'vertical',
              }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9CA3AF', textAlign: 'right' }}>
              {notes.length}/1000
            </p>
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '12px',
                borderRadius: '10px',
                border: '1px solid #E5E7EB',
                background: '#FFFFFF',
                fontSize: '15px', fontWeight: '600', color: '#374151',
                cursor: 'pointer', minHeight: '44px',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 2, padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: saving ? '#9CA3AF' : '#0062F4',
                fontSize: '15px', fontWeight: '600', color: '#FFFFFF',
                cursor: saving ? 'not-allowed' : 'pointer', minHeight: '44px',
              }}
            >
              {saving ? 'Creating…' : 'Create Week'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Week Card ───────────────────────────────────────────────────────────────

interface WeekCardProps {
  week: WeekWithTeams
  counts: AvailabilityCounts
  updateWeek: (weekId: string, label: string, notes?: string) => Promise<{ error: string | null }>
  onOpenBoard: () => void
  clubName?: string
}

function WeekCard({ week, counts, updateWeek, onOpenBoard, clubName }: WeekCardProps) {
  const [editing, setEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(week.label)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Notes state
  const [notesExpanded, setNotesExpanded] = useState(false)
  const [editNotes, setEditNotes] = useState(week.notes ?? '')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaveError, setNotesSaveError] = useState<string | null>(null)

  const url = availabilityUrl(week.availability_link_token)
  const total = counts.available + counts.tbc + counts.unavailable

  async function saveLabel() {
    const trimmed = editLabel.trim()
    if (trimmed === week.label) { setEditing(false); return }
    if (!trimmed) { setSaveError('Label cannot be empty'); return }
    setSaving(true)
    const { error } = await updateWeek(week.id, trimmed)
    setSaving(false)
    if (error) {
      setSaveError(error)
    } else {
      setEditing(false)
      setSaveError(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') saveLabel()
    if (e.key === 'Escape') {
      setEditLabel(week.label)
      setEditing(false)
      setSaveError(null)
    }
  }

  function startEdit() {
    setEditLabel(week.label)
    setSaveError(null)
    setEditing(true)
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveNotes() {
    setNotesSaving(true)
    setNotesSaveError(null)
    const { error } = await updateWeek(week.id, week.label, editNotes)
    setNotesSaving(false)
    if (error) {
      setNotesSaveError(error)
    } else {
      setNotesExpanded(false)
    }
  }

  async function handleShare() {
    const message = shareMessage(week, clubName)
    if (navigator.share) {
      try {
        await navigator.share({ title: week.label, text: message })
      } catch {
        // User cancelled — no-op
      }
    } else {
      try {
        await navigator.clipboard.writeText(message)
        alert('Share message copied to clipboard!')
      } catch {
        alert(message)
      }
    }
  }

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
      overflow: 'hidden',
    }}>
      {/* Header — label + date */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #F3F4F6',
      }}>
        {/* Editable label row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Calendar size={16} color="#0062F4" style={{ flexShrink: 0 }} />

          {editing ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  autoFocus
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={saveLabel}
                  style={{
                    flex: 1,
                    fontSize: '17px', fontWeight: '700', color: '#111827',
                    border: `1px solid ${saveError ? '#DC2626' : '#0062F4'}`,
                    borderRadius: '6px', padding: '4px 8px',
                    outline: 'none', background: '#FFFFFF',
                    minHeight: '36px',
                  }}
                />
                {saving && (
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>Saving…</span>
                )}
              </div>
              {saveError && (
                <p style={{ margin: 0, fontSize: '12px', color: '#DC2626' }}>{saveError}</p>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '17px', fontWeight: '700', color: '#111827' }}>
                {week.label}
              </span>
              <button
                onClick={startEdit}
                title="Edit label"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#9CA3AF', padding: '4px', borderRadius: '6px',
                  minWidth: '44px', minHeight: '44px',
                }}
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>

        <p style={{ margin: 0, fontSize: '13px', color: '#6B7280', paddingLeft: '24px' }}>
          {formatDate(week.start_date)} – {formatDate(week.end_date)}
        </p>
      </div>

      {/* Availability dashboard */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #F3F4F6',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginRight: '4px' }}>
          {total > 0 ? `${total} responses` : 'No responses yet'}
        </span>

        {total > 0 && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '2px 8px', borderRadius: '999px',
              background: '#DCFCE7', color: '#15803D',
              fontSize: '12px', fontWeight: '600',
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
              {counts.available}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '2px 8px', borderRadius: '999px',
              background: '#FEF3C7', color: '#B45309',
              fontSize: '12px', fontWeight: '600',
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#D97706', display: 'inline-block' }} />
              {counts.tbc}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '2px 8px', borderRadius: '999px',
              background: '#FEE2E2', color: '#B91C1C',
              fontSize: '12px', fontWeight: '600',
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#DC2626', display: 'inline-block' }} />
              {counts.unavailable}
            </span>
          </div>
        )}
      </div>

      {/* Availability link */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: '#F8F8F8',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '10px',
        }}>
          <Link size={14} color="#6B7280" style={{ flexShrink: 0 }} />
          <span style={{
            fontSize: '12px', color: '#6B7280',
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {url}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '10px 12px', minHeight: '44px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              background: copied ? '#DCFCE7' : '#FFFFFF',
              color: copied ? '#15803D' : '#374151',
              fontSize: '14px', fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>

          <button
            onClick={handleShare}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '10px 12px', minHeight: '44px',
              borderRadius: '8px',
              border: 'none',
              background: '#0062F4',
              color: '#FFFFFF',
              fontSize: '14px', fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <Share2 size={15} />
            Share
          </button>
        </div>
      </div>

      {/* Teams */}
      <div style={{
        padding: '12px 16px',
        display: 'flex', gap: '6px', flexWrap: 'wrap',
        borderBottom: '1px solid #F3F4F6',
      }}>
        {week.week_teams.map(team => (
          <span
            key={team.id}
            style={{
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '12px', fontWeight: '500',
              background: '#E8F0FE',
              color: '#0062F4',
            }}
          >
            {team.team_name}
          </span>
        ))}
        {week.week_teams.length === 0 && (
          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>No teams</span>
        )}
      </div>

      {/* Game Notes */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #F3F4F6' }}>
        {!notesExpanded ? (
          <button
            onClick={() => { setEditNotes(week.notes ?? ''); setNotesExpanded(true) }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: '500',
              color: week.notes ? '#374151' : '#9CA3AF',
              padding: 0, textAlign: 'left', width: '100%',
            }}
          >
            {week.notes
              ? <span><span style={{ color: '#6B7280', marginRight: '6px' }}>📋</span>{week.notes}</span>
              : '+ Add game notes'}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <textarea
              autoFocus
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Kickoff time, location, bus info…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '8px 10px', borderRadius: '8px',
                border: '1px solid #0062F4',
                fontSize: '13px', color: '#111827', background: '#FFFFFF',
                outline: 'none', resize: 'vertical',
              }}
            />
            {notesSaveError && (
              <p style={{ margin: 0, fontSize: '12px', color: '#DC2626' }}>{notesSaveError}</p>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setNotesExpanded(false)}
                style={{
                  padding: '6px 12px', borderRadius: '6px',
                  border: '1px solid #E5E7EB', background: '#FFFFFF',
                  fontSize: '13px', fontWeight: '500', color: '#374151',
                  cursor: 'pointer', minHeight: '36px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveNotes}
                disabled={notesSaving}
                style={{
                  padding: '6px 12px', borderRadius: '6px',
                  border: 'none', background: notesSaving ? '#9CA3AF' : '#0062F4',
                  fontSize: '13px', fontWeight: '600', color: '#FFFFFF',
                  cursor: notesSaving ? 'not-allowed' : 'pointer', minHeight: '36px',
                }}
              >
                {notesSaving ? 'Saving…' : 'Save Notes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Open Board */}
      <div style={{ padding: '12px 16px' }}>
        <button
          onClick={onOpenBoard}
          style={{
            width: '100%',
            height: '48px',
            background: '#0062F4',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          Open Board →
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Weeks() {
  const { openWeeks, loading, error, refetch, createWeek, updateWeek, availabilityCounts } = useWeeks()
  const { clubSettings } = useClubSettings()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const navigate = useNavigate()

  // Derive sorted unique months from open weeks
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    openWeeks.forEach(w => months.add(weekToYearMonth(w.start_date)))
    return Array.from(months).sort()
  }, [openWeeks])

  // Filter weeks by selected month
  const filteredWeeks = useMemo(() => {
    if (!selectedMonth) return openWeeks
    return openWeeks.filter(w => weekToYearMonth(w.start_date) === selectedMonth)
  }, [openWeeks, selectedMonth])

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '40vh',
      }}>
        <div style={{ textAlign: 'center', color: '#6B7280' }}>
          <div style={{
            width: '32px', height: '32px',
            border: '3px solid #E5E7EB',
            borderTopColor: '#0062F4',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px',
          }} />
          <p style={{ margin: 0, fontSize: '14px' }}>Loading weeks…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          background: '#FEE2E2', borderRadius: '10px', padding: '16px',
          color: '#B91C1C', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span>Error loading weeks: {error}</span>
          <button
            onClick={refetch}
            style={{
              padding: '4px 10px', borderRadius: '6px', minHeight: '44px',
              border: '1px solid #B91C1C', background: 'transparent',
              color: '#B91C1C', cursor: 'pointer', fontSize: '13px', flexShrink: 0,
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{ padding: '16px', maxWidth: '680px', margin: '0 auto', paddingBottom: '80px' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 14px', minHeight: '44px',
              borderRadius: '8px',
              border: 'none',
              background: '#0062F4',
              color: '#FFFFFF',
              fontSize: '14px', fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={16} />
            New Week
          </button>
        </div>

        {/* Month filter — only shown when 2+ months exist */}
        {availableMonths.length > 1 && (
          <div style={{
            display: 'flex', gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
            marginBottom: '16px',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          } as React.CSSProperties}>
            {/* ALL pill */}
            <button
              onClick={() => setSelectedMonth(null)}
              style={{
                flexShrink: 0,
                padding: '6px 14px', minHeight: '44px',
                borderRadius: '999px',
                border: selectedMonth === null ? 'none' : '1px solid #E5E7EB',
                background: selectedMonth === null ? '#0062F4' : '#FFFFFF',
                color: selectedMonth === null ? '#FFFFFF' : '#374151',
                fontSize: '13px', fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ALL
            </button>

            {availableMonths.map(ym => (
              <button
                key={ym}
                onClick={() => setSelectedMonth(ym)}
                style={{
                  flexShrink: 0,
                  padding: '6px 14px', minHeight: '44px',
                  borderRadius: '999px',
                  border: selectedMonth === ym ? 'none' : '1px solid #E5E7EB',
                  background: selectedMonth === ym ? '#0062F4' : '#FFFFFF',
                  color: selectedMonth === ym ? '#FFFFFF' : '#374151',
                  fontSize: '13px', fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatMonthPill(ym)}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {openWeeks.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '64px 16px', textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, marginBottom: 16,
            }}>
              📅
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>
              No weeks created yet
            </h3>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
              Tap + to start a new match week.
            </p>
          </div>
        )}

        {/* Filtered empty state */}
        {openWeeks.length > 0 && filteredWeeks.length === 0 && (
          <div style={{
            padding: '40px 24px', textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
              No weeks in {selectedMonth ? formatMonthPill(selectedMonth) : 'this period'}.
            </p>
          </div>
        )}

        {/* Week cards */}
        {filteredWeeks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredWeeks.map(week => (
              <WeekCard
                key={week.id}
                week={week}
                counts={availabilityCounts[week.id] ?? { available: 0, tbc: 0, unavailable: 0 }}
                updateWeek={updateWeek}
                onOpenBoard={() => navigate(`/board?week=${week.id}`)}
                clubName={clubSettings?.club_name}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Week overlay */}
      {showCreate && (
        <CreateWeekForm
          onClose={() => setShowCreate(false)}
          onCreated={() => {}}
          createWeek={createWeek}
          defaultTeams={
            clubSettings?.default_teams && clubSettings.default_teams.length > 0
              ? clubSettings.default_teams
              : ['1st XV', '2nd XV']
          }
        />
      )}
    </>
  )
}
