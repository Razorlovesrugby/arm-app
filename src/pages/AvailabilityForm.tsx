import { useEffect, useState, FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import {
  supabase, Week, Position, Availability, ClubSettings,
  POSITIONS, normalisePhone,
} from '../lib/supabase'
import { useClubSettings } from '../hooks/useClubSettings'
import { getContrastColor } from '../lib/colorUtils'

// ── Types ────────────────────────────────────────────────────

interface FormState {
  name: string
  phone: string
  availability: Availability | ''
  primaryPosition: Position | ''
  secondaryPositions: Position[]
  availabilityNote: string
}

const EMPTY_FORM: FormState = {
  name: '',
  phone: '',
  availability: '',
  primaryPosition: '',
  secondaryPositions: [],
  availabilityNote: '',
}

// ── Availability option config ───────────────────────────────

const AVAILABILITY_OPTIONS: {
  value: Availability
  label: string
  description: string
  bg: string
  border: string
  color: string
  selectedBg: string
}[] = [
  {
    value: 'Available',
    label: 'Available',
    description: 'I can play',
    bg: '#F0FDF4',
    border: '#16A34A',
    color: '#15803D',
    selectedBg: '#DCFCE7',
  },
  {
    value: 'TBC',
    label: 'To Be Confirmed',
    description: "I'm not sure yet",
    bg: '#FFFBEB',
    border: '#D97706',
    color: '#B45309',
    selectedBg: '#FEF3C7',
  },
  {
    value: 'Unavailable',
    label: 'Unavailable',
    description: "I can't play",
    bg: '#FFF5F5',
    border: '#DC2626',
    color: '#B91C1C',
    selectedBg: '#FEE2E2',
  },
]

// ── Main component ───────────────────────────────────────────

export default function AvailabilityForm() {
  const { token } = useParams<{ token: string }>()
  const { clubSettings } = useClubSettings()

  // Token / week resolution state
  const [week, setWeek] = useState<Week | null>(null)
  const [tokenState, setTokenState] = useState<'loading' | 'invalid' | 'closed' | 'open'>('loading')

  // Form state
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ── Step 1: Resolve token → week ──────────────────────────
  useEffect(() => {
    if (!token) { setTokenState('invalid'); return }

    async function resolveToken() {
      const { data, error } = await supabase
        .from('weeks')
        .select('*')
        .eq('availability_link_token', token)
        .single()

      if (error || !data) {
        setTokenState('invalid')
        return
      }

      setWeek(data as Week)
      setTokenState(data.status === 'Closed' ? 'closed' : 'open')
    }

    resolveToken()
  }, [token])

  // ── Form helpers ─────────────────────────────────────────

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  function toggleSecondary(pos: Position) {
    setForm(f => {
      const has = f.secondaryPositions.includes(pos)
      return {
        ...f,
        secondaryPositions: has
          ? f.secondaryPositions.filter(p => p !== pos)
          : [...f.secondaryPositions, pos],
      }
    })
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim())      errs.name = 'Please enter your name'
    if (!form.availability)     errs.availability = 'Please select your availability'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Step 2: Submit handler (matching + insert) ────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate() || !week) return
    setSubmitting(true)
    setSubmitError(null)

    const normPhone = normalisePhone(form.phone)
    const isAvailable = form.availability === 'Available'

    try {
      // 2a. Match player by name + phone (case-insensitive name)
      let playerId: string | null = null

      if (normPhone) {
        const { data: byPhone } = await supabase
          .from('players')
          .select('id, name, phone')
          .eq('phone', normPhone)
          .limit(1)
          .single()

        if (byPhone) playerId = byPhone.id
      }

      if (!playerId) {
        // Try name match (case-insensitive)
        const { data: byName } = await supabase
          .from('players')
          .select('id, name')
          .ilike('name', form.name.trim())
          .limit(1)
          .single()

        if (byName) playerId = byName.id
      }

      // 2b. Auto-create player if unmatched
      if (!playerId) {
        const { data: newPlayer, error: insertErr } = await supabase
          .from('players')
          .insert({
            name: form.name.trim(),
            phone: normPhone || '',
            email: '',                    // placeholder — coaches can update
            date_of_birth: '2000-01-01', // placeholder — coaches can update
            primary_position: 'Unspecified', // PRD: auto-create always starts Unspecified
            secondary_positions: [],
            player_type: 'Open',
            status: 'Active',
            subscription_paid: false,
          })
          .select('id')
          .single()

        if (insertErr || !newPlayer) throw new Error('Could not create player record')
        playerId = newPlayer.id
      }

      // 2c. Position sync — only on Available submissions
      if (isAvailable && (form.primaryPosition || form.secondaryPositions.length > 0)) {
        const updatePayload: Record<string, unknown> = {}
        if (form.primaryPosition) updatePayload.primary_position = form.primaryPosition
        if (form.secondaryPositions.length > 0) updatePayload.secondary_positions = form.secondaryPositions
        await supabase.from('players').update(updatePayload).eq('id', playerId)
      }

      // 2d. Insert availability response
      const { error: respErr } = await supabase
        .from('availability_responses')
        .insert({
          week_id: week.id,
          player_id: playerId,
          availability: form.availability,
          submitted_primary_position: form.primaryPosition || null,
          submitted_secondary_positions: form.secondaryPositions,
          availability_note: form.availabilityNote.trim() || null,
        })

      if (respErr) throw new Error(respErr.message)

      setSubmitted(true)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const brandColor = clubSettings?.primary_color || '#6B21A8'
  const contrastClass = getContrastColor(brandColor)
  const btnTextColor = contrastClass === 'text-white' ? '#FFFFFF' : '#111827'

  // ── Render: loading ───────────────────────────────────────
  if (tokenState === 'loading') {
    return (
      <Shell>
        <Logo clubSettings={clubSettings} />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <div style={spinnerStyle} />
          <style>{spinnerCSS}</style>
        </div>
      </Shell>
    )
  }

  // ── Render: invalid token ─────────────────────────────────
  if (tokenState === 'invalid') {
    return (
      <Shell>
        <Logo clubSettings={clubSettings} />
        <div style={cardStyle}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔗</div>
          <h2 style={headingStyle}>Link not found</h2>
          <p style={subStyle}>
            This availability link is invalid or has expired. Ask your coach for a new link.
          </p>
        </div>
      </Shell>
    )
  }

  // ── Render: closed week ───────────────────────────────────
  if (tokenState === 'closed') {
    return (
      <Shell>
        <Logo clubSettings={clubSettings} />
        <div style={cardStyle}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
          <h2 style={headingStyle}>Submissions closed</h2>
          <p style={subStyle}>
            {week?.label} has been closed. No further availability submissions are being accepted.
          </p>
        </div>
      </Shell>
    )
  }

  // ── Render: success ───────────────────────────────────────
  if (submitted) {
    const availabilityLabel = AVAILABILITY_OPTIONS.find(o => o.value === form.availability)
    return (
      <Shell>
        <Logo clubSettings={clubSettings} />
        <div style={cardStyle}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
          <h2 style={headingStyle}>Thanks, {form.name.split(' ')[0]}!</h2>
          <p style={subStyle}>
            Your availability for{' '}
            <strong style={{ color: '#111827' }}>{week?.label}</strong>{' '}
            has been recorded as{' '}
            <strong style={{ color: availabilityLabel?.color }}>
              {availabilityLabel?.label}
            </strong>.
          </p>
          <p style={{ ...subStyle, marginTop: '8px', fontSize: '13px' }}>
            You can close this page.
          </p>
        </div>
      </Shell>
    )
  }

  // ── Render: form ──────────────────────────────────────────
  const showPositions = form.availability !== 'Unavailable'

  return (
    <Shell>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Logo clubSettings={clubSettings} />
        <h1 style={{
          fontSize: '20px', fontWeight: '700', color: '#111827',
          margin: '0 0 4px', letterSpacing: '-0.3px',
        }}>
          Availability
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
          {week?.label}
        </p>
      </div>

      {/* Game Notes info box */}
      {week?.notes && (
        <div style={{
          background: '#F0F9FF',
          border: '1px solid #BAE6FD',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '20px',
        }}>
          <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '600', color: '#0369A1' }}>
            Game Info
          </p>
          <p style={{ margin: 0, fontSize: '14px', color: '#0369A1', lineHeight: '1.5' }}>
            {week.notes}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Name ── */}
        <FormField label="Your name *" error={errors.name}>
          <input
            type="text"
            placeholder="First and last name"
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            autoComplete="name"
            style={inputStyle(!!errors.name)}
          />
        </FormField>

        {/* ── Phone ── */}
        <FormField label="Mobile number" hint="Helps us match your record">
          <input
            type="tel"
            placeholder="+44 7700 000000"
            value={form.phone}
            onChange={e => setField('phone', e.target.value)}
            autoComplete="tel"
            style={inputStyle(false)}
          />
        </FormField>

        {/* ── Availability ── */}
        <FormField label="Are you available? *" error={errors.availability}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {AVAILABILITY_OPTIONS.map(opt => {
              const selected = form.availability === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setField('availability', opt.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    border: `2px solid`,
                    borderColor: selected ? opt.border : '#E5E7EB',
                    borderRadius: '12px',
                    background: selected ? opt.selectedBg : '#FFFFFF',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    minHeight: '56px',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  {/* Radio dot */}
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${selected ? opt.border : '#D1D5DB'}`,
                    background: selected ? opt.border : '#FFFFFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selected && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFFFFF' }} />
                    )}
                  </div>
                  {/* Label */}
                  <div>
                    <div style={{
                      fontSize: '15px', fontWeight: '600',
                      color: selected ? opt.color : '#111827',
                    }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '1px' }}>
                      {opt.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </FormField>

        {/* ── Positions (hidden when Unavailable) ── */}
        {showPositions && (
          <>
            <FormField label="Primary position">
              <select
                value={form.primaryPosition}
                onChange={e => setField('primaryPosition', e.target.value as Position | '')}
                style={inputStyle(false)}
              >
                <option value="">— Select position —</option>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </FormField>

            <FormField label="Secondary positions" hint="Select all that apply">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {POSITIONS.filter(p => p !== 'Unspecified').map(pos => {
                  const active = form.secondaryPositions.includes(pos)
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => toggleSecondary(pos)}
                      style={{
                        padding: '7px 13px',
                        borderRadius: '999px',
                        border: '1px solid',
                        borderColor: active ? '#6B21A8' : '#E5E7EB',
                        background: active ? '#F3E8FF' : '#FFFFFF',
                        color: active ? '#6B21A8' : '#6B7280',
                        fontSize: '13px',
                        fontWeight: active ? '600' : '400',
                        cursor: 'pointer',
                        minHeight: '36px',
                      }}
                    >
                      {pos}
                    </button>
                  )
                })}
              </div>
            </FormField>
          </>
        )}

        {/* ── Availability note ── */}
        <FormField label="Note" hint='Optional — e.g. "May be 10 minutes late"'>
          <textarea
            value={form.availabilityNote}
            onChange={e => setField('availabilityNote', e.target.value)}
            placeholder="Anything the coach should know…"
            rows={3}
            style={{ ...inputStyle(false), resize: 'vertical' }}
          />
        </FormField>

        {/* ── Submit error ── */}
        {submitError && (
          <div style={{
            background: '#FEE2E2', color: '#B91C1C',
            borderRadius: '10px', padding: '12px 14px', fontSize: '14px',
          }}>
            {submitError}
          </div>
        )}

        {/* ── Submit button ── */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            minHeight: '52px',
            backgroundColor: brandColor,
            color: btnTextColor,
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.8 : 1,
            marginTop: '4px',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {submitting ? 'Submitting…' : 'Submit Availability'}
        </button>

      </form>
    </Shell>
  )
}

// ── Layout shell ─────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F8F8F8',
      padding: '32px 20px calc(32px + env(safe-area-inset-bottom))',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}>
        {children}
      </div>
    </div>
  )
}

function Logo({ clubSettings }: { clubSettings: ClubSettings | null }) {
  const [logoError, setLogoError] = useState(false)
  const showClubLogo = clubSettings?.logo_url && !logoError

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', flexDirection: 'column', alignItems: 'center' }}>
      {showClubLogo ? (
        <img
          src={clubSettings!.logo_url!}
          alt={clubSettings?.club_name || 'Club Logo'}
          style={{ maxHeight: '52px', width: 'auto', objectFit: 'contain', marginBottom: '8px' }}
          onError={() => setLogoError(true)}
        />
      ) : (
        <img
          src="/icons/Logo.png"
          alt="ARM Logo"
          style={{ maxHeight: '52px', width: 'auto', objectFit: 'contain', marginBottom: '8px' }}
        />
      )}
      {clubSettings?.club_name && (
        <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>
          {clubSettings.club_name}
        </div>
      )}
    </div>
  )
}

// ── Form field wrapper ────────────────────────────────────────

function FormField({
  label, hint, error, children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: '14px', fontWeight: '600',
        color: '#374151', marginBottom: hint ? '2px' : '6px',
      }}>
        {label}
      </label>
      {hint && (
        <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 6px' }}>
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#DC2626' }}>
          {error}
        </p>
      )}
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '16px',
  padding: '32px 24px',
  textAlign: 'center',
  border: '1px solid #E5E7EB',
}

const headingStyle: React.CSSProperties = {
  fontSize: '20px', fontWeight: '700', color: '#111827',
  margin: '0 0 8px', letterSpacing: '-0.3px',
}

const subStyle: React.CSSProperties = {
  fontSize: '15px', color: '#6B7280', margin: 0, lineHeight: '1.5',
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${hasError ? '#DC2626' : '#E5E7EB'}`,
    borderRadius: '10px',
    fontSize: '16px',      // 16px prevents iOS auto-zoom
    color: '#111827',
    background: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box',
  }
}

const spinnerStyle: React.CSSProperties = {
  width: '36px', height: '36px',
  border: '3px solid #E5E7EB',
  borderTopColor: '#6B21A8',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
}

const spinnerCSS = `@keyframes spin { to { transform: rotate(360deg); } }`
