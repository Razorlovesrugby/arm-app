import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Copy, Share2, Plus, Check, Link } from 'lucide-react'
import { useWeeks, WeekWithTeams, CloseWeekWarning } from '../hooks/useWeeks'
import { useClubSettings } from '../hooks/useClubSettings'

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
function shareMessage(week: WeekWithTeams, clubName?: string): string {
  const url = availabilityUrl(week.availability_link_token)
  const club = clubName || 'ARM' // Fallback to default
  return `${club} — ${week.label}. Please submit your availability for this week: ${url}. Takes 30 seconds, no login needed.`
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

// ─── Close Week Dialog ───────────────────────────────────────────────────────

interface CloseWeekDialogProps {
  weekLabel: string
  warnings: CloseWeekWarning[]   // empty active teams — shown before confirm
  closing: boolean
  closeError: string | null
  onConfirm: () => void
  onCancel: () => void
}

function CloseWeekDialog({
  weekLabel, warnings, closing, closeError, onConfirm, onCancel,
}: CloseWeekDialogProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {/* Backdrop */}
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />

      {/* Modal */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#FFFFFF', borderRadius: '16px',
        width: '100%', maxWidth: '380px',
        padding: '28px 24px 24px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            width: 52, height: 52,
            background: '#FEF2F2', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto', fontSize: 22,
          }}>🔒</div>
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#111827', textAlign: 'center' }}>
          Close this week?
        </h2>

        <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#6B7280', textAlign: 'center', lineHeight: '1.5' }}>
          This will finalise all selections for{' '}
          <strong style={{ color: '#111827' }}>{weekLabel}</strong>{' '}
          and update player histories. This cannot be undone.
        </p>

        {/* Warnings — empty active teams */}
        {warnings.length > 0 && (
          <div style={{
            background: '#FFFBEB', border: '1px solid #FCD34D',
            borderRadius: '10px', padding: '12px 14px', marginBottom: '16px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#92400E', marginBottom: '6px' }}>
              ⚠ Teams with no players:
            </div>
            {warnings.map(w => (
              <div key={w.teamName} style={{ fontSize: '13px', color: '#B45309', paddingLeft: '4px' }}>
                • {w.teamName}
              </div>
            ))}
            <div style={{ fontSize: '12px', color: '#92400E', marginTop: '8px' }}>
              Close anyway? Their archive entries will be empty.
            </div>
          </div>
        )}

        {/* Error */}
        {closeError && (
          <div style={{
            background: '#FEE2E2', borderRadius: '10px', padding: '10px 14px',
            fontSize: '13px', color: '#B91C1C', marginBottom: '16px',
          }}>
            {closeError}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={onConfirm}
            disabled={closing}
            style={{
              height: 48, width: '100%', borderRadius: '10px', border: 'none',
              background: closing ? '#9CA3AF' : '#DC2626',
              color: '#FFFFFF', fontSize: '15px', fontWeight: '700',
              cursor: closing ? 'not-allowed' : 'pointer',
            }}
          >
            {closing ? 'Closing…' : warnings.length > 0 ? 'Close anyway' : 'Close Week'}
          </button>
          <button
            onClick={onCancel}
            disabled={closing}
            style={{
              height: 44, width: '100%', borderRadius: '10px',
              border: '1px solid #E5E7EB', background: '#FFFFFF',
              color: '#374151', fontSize: '15px', fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Week Detail Card ────────────────────────────────────────────────────────

interface WeekDetailProps {
  week: WeekWithTeams
  onOpenBoard?: () => void    // only passed for open weeks
  onCloseWeek?: () => void    // only passed for open weeks
}

function WeekDetail({ week, onOpenBoard, onCloseWeek }: WeekDetailProps) {
  const [copied, setCopied] = useState(false)
  const { clubSettings } = useClubSettings()
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
    const message = shareMessage(week, clubSettings?.club_name)
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
        borderBottom: onOpenBoard ? '1px solid #F3F4F6' : undefined,
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

      {/* Open Board + Close Week buttons — open weeks only */}
      {(onOpenBoard || onCloseWeek) && (
        <div style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
          {onOpenBoard && (
            <button
              onClick={onOpenBoard}
              style={{
                flex: 1,
                height: '48px',
                background: '#6B21A8',
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
          )}
          {onCloseWeek && (
            <button
              onClick={onCloseWeek}
              style={{
                height: '48px',
                padding: '0 16px',
                background: '#FFFFFF',
                color: '#DC2626',
                border: '1px solid #FECACA',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Close Week
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Weeks() {
  const { openWeeks, closedWeeks, loading, error, refetch, createWeek, closeWeek } = useWeeks()
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  // Close Week dialog state
  const [closeTarget, setCloseTarget]       = useState<WeekWithTeams | null>(null)
  const [closeWarnings, setCloseWarnings]   = useState<CloseWeekWarning[]>([])
  const [closing, setClosing]               = useState(false)
  const [closeError, setCloseError]         = useState<string | null>(null)

  async function handleCloseWeekClick(week: WeekWithTeams) {
    setCloseTarget(week)
    setCloseWarnings([])
    setCloseError(null)

    // First pass: check for warnings (force=false)
    const { warnings, error: err } = await closeWeek(week.id, false)
    if (err) { setCloseError(err); return }
    setCloseWarnings(warnings)
    // Dialog is now open (closeTarget is set)
  }

  async function handleCloseWeekConfirm() {
    if (!closeTarget) return
    setClosing(true)
    setCloseError(null)
    const { error: err } = await closeWeek(closeTarget.id, true)
    setClosing(false)
    if (err) { setCloseError(err); return }
    setCloseTarget(null)
  }

  function handleCloseWeekCancel() {
    setCloseTarget(null)
    setCloseWarnings([])
    setCloseError(null)
  }

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
      <div style={{ padding: '16px', maxWidth: '680px', margin: '0 auto', paddingBottom: '80px' }}>

        {/* Toolbar — New Week button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
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
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={16} />
            New Week
          </button>
        </div>

        {/* Empty state — no weeks at all */}
        {openWeeks.length === 0 && closedWeeks.length === 0 && (
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

        {/* Open weeks — each shown as a full detail card with "Open Board" button */}
        {openWeeks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {openWeeks.map(week => (
              <WeekDetail
                key={week.id}
                week={week}
                onOpenBoard={() => navigate(`/board?week=${week.id}`)}
                onCloseWeek={() => handleCloseWeekClick(week)}
              />
            ))}
          </div>
        )}

        {/* Archive section — closed weeks, read-only, no tap action */}
        {closedWeeks.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <p style={{
              margin: '0 0 12px',
              fontSize: '12px', fontWeight: '600', color: '#6B7280',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Archive
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {closedWeeks.map(week => (
                <WeekDetail key={week.id} week={week} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Week overlay */}
      {showCreate && (
        <CreateWeekForm
          onClose={() => setShowCreate(false)}
          onCreated={() => {}}
          createWeek={createWeek}
        />
      )}

      {/* Close Week dialog */}
      {closeTarget && (
        <CloseWeekDialog
          weekLabel={closeTarget.label}
          warnings={closeWarnings}
          closing={closing}
          closeError={closeError}
          onConfirm={handleCloseWeekConfirm}
          onCancel={handleCloseWeekCancel}
        />
      )}

    </>
  )
}
