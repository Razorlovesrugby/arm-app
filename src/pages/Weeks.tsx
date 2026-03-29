import { useState, useEffect } from 'react'
import { Calendar, Copy, Share2, Plus, Check, ChevronDown, Link } from 'lucide-react'
import { useWeeks, WeekWithTeams } from '../hooks/useWeeks'

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns the Monday of the current week as YYYY-MM-DD */
function getCurrentMonday(): string {
  const now = new Date()
  const day = now.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

/** Returns the Sunday of the current week as YYYY-MM-DD */
function getCurrentSunday(): string {
  const monday = new Date(getCurrentMonday())
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return sunday.toISOString().split('T')[0]
}

/** Format ISO date string to "17 Mar 2026" */
function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Auto-generate week label from start date: "Week of 17 Mar" */
function autoLabel(startDate: string): string {
  if (!startDate) return ''
  const d = new Date(startDate + 'T00:00:00')
  return `Week of ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
}

/** Build the public availability URL from token */
function availabilityUrl(token: string): string {
  return `${window.location.origin}/availability/${token}`
}

/** Build the pre-formatted share message */
function shareMessage(week: WeekWithTeams): string {
  const url = availabilityUrl(week.availability_link_token)
  return `Belsize Park RFC — ${week.label}. Please submit your availability for this week: ${url}. Takes 30 seconds, no login needed.`
}

// ─── Create Week Form ────────────────────────────────────────────────────────

interface CreateWeekFormProps {
  onClose: () => void
  onCreated: () => void
  createWeek: ReturnType<typeof useWeeks>['createWeek']
}

function CreateWeekForm({ onClose, onCreated, createWeek }: CreateWeekFormProps) {
  const defaultStart = getCurrentMonday()
  const defaultEnd = getCurrentSunday()

  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [label, setLabel] = useState(autoLabel(defaultStart))
  const [labelTouched, setLabelTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ start?: string; end?: string; label?: string }>({})

  // Auto-update label when start date changes (unless user manually edited it)
  useEffect(() => {
    if (!labelTouched && startDate) {
      setLabel(autoLabel(startDate))
    }
  }, [startDate, labelTouched])

  function validate(): boolean {
    const e: typeof errors = {}
    if (!startDate) e.start = 'Start date is required'
    if (!endDate) e.end = 'End date is required'
    if (startDate && endDate && endDate < startDate) {
      e.end = 'End date must be after start date'
    }
    if (!label.trim()) e.label = 'Label is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    const { error } = await createWeek({ start_date: startDate, end_date: endDate, label: label.trim() })
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
        maxHeight: '85vh',
        overflowY: 'auto',
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
      }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 50,
        }}
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
              fontSize: '18px', lineHeight: 1,
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
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 12px', borderRadius: '8px',
                border: `1px solid ${errors.start ? '#DC2626' : '#E5E7EB'}`,
                fontSize: '15px', color: '#111827', background: '#FFFFFF',
                outline: 'none',
              }}
            />
            {errors.start && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#DC2626' }}>{errors.start}</p>
            )}
          </div>

          {/* End date */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
              End date <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 12px', borderRadius: '8px',
                border: `1px solid ${errors.end ? '#DC2626' : '#E5E7EB'}`,
                fontSize: '15px', color: '#111827', background: '#FFFFFF',
                outline: 'none',
              }}
            />
            {errors.end && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#DC2626' }}>{errors.end}</p>
            )}
          </div>

          {/* Label */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
              Week label <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={e => {
                setLabel(e.target.value)
                setLabelTouched(true)
              }}
              placeholder="e.g. Week of 17 Mar"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 12px', borderRadius: '8px',
                border: `1px solid ${errors.label ? '#DC2626' : '#E5E7EB'}`,
                fontSize: '15px', color: '#111827', background: '#FFFFFF',
                outline: 'none',
              }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
              Auto-generated from start date — edit if needed
            </p>
            {errors.label && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#DC2626' }}>{errors.label}</p>
            )}
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
                cursor: 'pointer',
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
                background: saving ? '#9CA3AF' : '#6B21A8',
                fontSize: '15px', fontWeight: '600', color: '#FFFFFF',
                cursor: saving ? 'not-allowed' : 'pointer',
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

// ─── Week Detail Card ────────────────────────────────────────────────────────

interface WeekDetailProps {
  week: WeekWithTeams
}

function WeekDetail({ week }: WeekDetailProps) {
  const [copied, setCopied] = useState(false)
  const url = availabilityUrl(week.availability_link_token)
  const isOpen = week.status === 'Open'

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

  async function handleShare() {
    const message = shareMessage(week)
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
      {/* Week header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #F3F4F6',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Calendar size={16} color="#6B21A8" />
            <span style={{ fontSize: '17px', fontWeight: '700', color: '#111827' }}>
              {week.label}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>
            {formatDate(week.start_date)} – {formatDate(week.end_date)}
          </p>
        </div>
        <span style={{
          display: 'inline-block',
          padding: '3px 10px',
          borderRadius: '999px',
          fontSize: '12px', fontWeight: '600',
          background: isOpen ? '#DCFCE7' : '#F3F4F6',
          color: isOpen ? '#15803D' : '#4B5563',
          flexShrink: 0,
        }}>
          {week.status}
        </span>
      </div>

      {/* Availability link section — open weeks only */}
      {isOpen && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
          <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
            Availability link
          </p>

          {/* URL pill */}
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

          {/* Copy + Share */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCopy}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px 12px',
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
                padding: '10px 12px',
                borderRadius: '8px',
                border: 'none',
                background: '#6B21A8',
                color: '#FFFFFF',
                fontSize: '14px', fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              <Share2 size={15} />
              Share
            </button>
          </div>

          <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#9CA3AF', lineHeight: '1.4' }}>
            Share sends a pre-filled message with the link and week label.
          </p>
        </div>
      )}

      {/* Teams pill row */}
      <div style={{
        padding: '12px 16px',
        display: 'flex', gap: '6px', flexWrap: 'wrap',
      }}>
        {week.week_teams.map(team => (
          <span
            key={team.id}
            style={{
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '12px', fontWeight: '500',
              background: '#F3E8FF',
              color: '#6B21A8',
            }}
          >
            {team.team_name}
          </span>
        ))}
        {week.week_teams.length === 0 && (
          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>No teams</span>
        )}
      </div>
    </div>
  )
}

// ─── Week Dropdown Switcher ──────────────────────────────────────────────────

interface WeekSwitcherProps {
  weeks: WeekWithTeams[]
  selected: WeekWithTeams | null
  onChange: (week: WeekWithTeams) => void
}

function WeekSwitcher({ weeks, selected, onChange }: WeekSwitcherProps) {
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <select
        value={selected?.id ?? ''}
        onChange={e => {
          const week = weeks.find(w => w.id === e.target.value)
          if (week) onChange(week)
        }}
        style={{
          width: '100%',
          appearance: 'none',
          padding: '10px 36px 10px 12px',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          background: '#FFFFFF',
          fontSize: '14px', fontWeight: '600', color: '#111827',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {weeks.map(w => (
          <option key={w.id} value={w.id}>
            {w.label} — {w.status}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        color="#6B7280"
        style={{
          position: 'absolute', right: '10px', top: '50%',
          transform: 'translateY(-50%)', pointerEvents: 'none',
        }}
      />
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Weeks() {
  const { weeks, loading, error, refetch, createWeek } = useWeeks()
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  // Auto-select most recent open week on first load
  useEffect(() => {
    if (weeks.length > 0 && selectedWeekId === null) {
      const openWeek = weeks.find(w => w.status === 'Open')
      setSelectedWeekId(openWeek?.id ?? weeks[0].id)
    }
  }, [weeks, selectedWeekId])

  const selectedWeek = weeks.find(w => w.id === selectedWeekId) ?? null

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
            borderTopColor: '#6B21A8',
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
              padding: '4px 10px', borderRadius: '6px',
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
      <div style={{ padding: '16px', maxWidth: '680px', margin: '0 auto' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
          {weeks.length > 0 && (
            <WeekSwitcher
              weeks={weeks}
              selected={selectedWeek}
              onChange={w => setSelectedWeekId(w.id)}
            />
          )}
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: '#6B21A8',
              color: '#FFFFFF',
              fontSize: '14px', fontWeight: '600',
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={16} />
            New Week
          </button>
        </div>

        {/* Empty state */}
        {weeks.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 24px',
            textAlign: 'center', gap: '12px',
          }}>
            <Calendar size={48} color="#E5E7EB" />
            <p style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
              No weeks yet
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: '#6B7280', maxWidth: '280px' }}>
              Create your first week to start collecting availability from players.
            </p>
          </div>
        )}

        {/* Selected week detail */}
        {selectedWeek && <WeekDetail week={selectedWeek} />}

        {/* All weeks list — shown when 2+ weeks exist */}
        {weeks.length > 1 && (
          <div style={{ marginTop: '24px' }}>
            <p style={{
              margin: '0 0 10px',
              fontSize: '12px', fontWeight: '600', color: '#6B7280',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              All weeks
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {weeks.map(week => (
                <button
                  key={week.id}
                  onClick={() => setSelectedWeekId(week.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: `1px solid ${selectedWeekId === week.id ? '#6B21A8' : '#E5E7EB'}`,
                    background: selectedWeekId === week.id ? '#F3E8FF' : '#FFFFFF',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                      {week.label}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B7280' }}>
                      {formatDate(week.start_date)} – {formatDate(week.end_date)}
                    </p>
                  </div>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '12px', fontWeight: '600',
                    background: week.status === 'Open' ? '#DCFCE7' : '#F3F4F6',
                    color: week.status === 'Open' ? '#15803D' : '#4B5563',
                    flexShrink: 0,
                  }}>
                    {week.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Week overlay */}
      {showCreate && (
        <CreateWeekForm
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            // After creating, auto-select the new week (most recent)
            setSelectedWeekId(null)
          }}
          createWeek={createWeek}
        />
      )}

    </>
  )
}
