import { useState, useEffect, FormEvent } from 'react'
import { X } from 'lucide-react'
import {
  supabase, Player, Position, PlayerType, PlayerStatus,
  POSITIONS, PLAYER_TYPES, PLAYER_STATUSES, normalisePhone,
} from '../lib/supabase'

interface Props {
  player: Player | null   // null = add mode
  onClose: () => void
  onSaved: () => void
}

interface FormState {
  name: string
  email: string
  phone: string
  date_of_birth: string
  primary_position: Position | ''
  secondary_positions: Position[]
  player_type: PlayerType
  status: PlayerStatus
  subscription_paid: boolean
  notes: string
}

const EMPTY: FormState = {
  name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  primary_position: '',
  secondary_positions: [],
  player_type: 'Open',
  status: 'Active',
  subscription_paid: false,
  notes: '',
}

export default function PlayerFormSheet({ player, onClose, onSaved }: Props) {
  const isEdit = player !== null
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  // Populate form when editing
  useEffect(() => {
    if (player) {
      setForm({
        name: player.name,
        email: player.email ?? '',
        phone: player.phone ?? '',
        date_of_birth: player.date_of_birth ?? '',
        primary_position: player.primary_position ?? '',
        secondary_positions: player.secondary_positions ?? [],
        player_type: player.player_type,
        status: player.status,
        subscription_paid: player.subscription_paid,
        notes: player.notes ?? '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [player])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  function toggleSecondary(pos: Position) {
    setForm(f => {
      const has = f.secondary_positions.includes(pos)
      return {
        ...f,
        secondary_positions: has
          ? f.secondary_positions.filter(p => p !== pos)
          : [...f.secondary_positions, pos],
      }
    })
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim())        errs.name = 'Name is required'
    if (!form.email.trim())       errs.email = 'Email is required'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                                  errs.email = 'Enter a valid email'
    if (!form.date_of_birth)      errs.date_of_birth = 'Date of birth is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)

    const payload = {
      name:                form.name.trim(),
      email:               form.email.trim().toLowerCase(),
      phone:               normalisePhone(form.phone),
      date_of_birth:       form.date_of_birth,
      primary_position:    form.primary_position || null,
      secondary_positions: form.secondary_positions,
      player_type:         form.player_type,
      status:              form.status,
      subscription_paid:   form.subscription_paid,
      notes:               form.notes.trim() || null,
    }

    let err
    if (isEdit && player) {
      const res = await supabase.from('players').update(payload).eq('id', player.id)
      err = res.error
    } else {
      const res = await supabase.from('players').insert(payload)
      err = res.error
    }

    setSaving(false)
    if (err) {
      setErrors({ name: err.message })
    } else {
      onSaved()
    }
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

      {/* Sheet / modal */}
      <div style={{
        position: 'fixed',
        zIndex: 51,
        background: '#FFFFFF',
        // Mobile: bottom sheet ~85% height
        bottom: 0, left: 0, right: 0,
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        maxHeight: '92dvh',
        overflowY: 'auto',
        // Tablet+: centred modal
        // (override via media query below)
      }}
        className="player-sheet"
      >
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0,
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1,
        }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#111827' }}>
            {isEdit ? 'Edit Player' : 'Add Player'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: '#F3F4F6', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} color="#6B7280" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>

          {/* Error summary */}
          {errors.name && errors.name.length > 40 && (
            <div style={{
              background: '#FEE2E2', color: '#B91C1C',
              borderRadius: '8px', padding: '12px 14px',
              fontSize: '13px', marginBottom: '16px',
            }}>
              {errors.name}
            </div>
          )}

          {/* Name */}
          <Field label="Name *" error={errors.name}>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Full name"
              style={inputStyle(!!errors.name)}
            />
          </Field>

          {/* Email */}
          <Field label="Email *" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="email@example.com"
              style={inputStyle(!!errors.email)}
            />
          </Field>

          {/* Phone */}
          <Field label="Phone" error={errors.phone}>
            <input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="+44 7700 000000"
              style={inputStyle(!!errors.phone)}
            />
          </Field>

          {/* Date of birth */}
          <Field label="Date of Birth *" error={errors.date_of_birth}>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={e => set('date_of_birth', e.target.value)}
              style={inputStyle(!!errors.date_of_birth)}
            />
          </Field>

          {/* Primary position */}
          <Field label="Primary Position">
            <select
              value={form.primary_position}
              onChange={e => set('primary_position', e.target.value as Position | '')}
              style={inputStyle(false)}
            >
              <option value="">— Select position —</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>

          {/* Secondary positions */}
          <Field label="Secondary Positions">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {POSITIONS.filter(p => p !== 'Unspecified').map(pos => {
                const active = form.secondary_positions.includes(pos)
                return (
                  <button
                    type="button"
                    key={pos}
                    onClick={() => toggleSecondary(pos)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '999px',
                      border: '1px solid',
                      borderColor: active ? '#6B21A8' : '#E5E7EB',
                      background: active ? '#F3E8FF' : '#FFFFFF',
                      color: active ? '#6B21A8' : '#6B7280',
                      fontSize: '12px',
                      fontWeight: active ? '600' : '400',
                      cursor: 'pointer',
                    }}
                  >
                    {pos}
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Two-col row: Type + Status */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <Field label="Type" style={{ flex: 1 }}>
              <select
                value={form.player_type}
                onChange={e => set('player_type', e.target.value as PlayerType)}
                style={inputStyle(false)}
              >
                {PLAYER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Status" style={{ flex: 1 }}>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value as PlayerStatus)}
                style={inputStyle(false)}
              >
                {PLAYER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          {/* Subscription paid */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <input
              type="checkbox"
              id="sub-paid"
              checked={form.subscription_paid}
              onChange={e => set('subscription_paid', e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#6B21A8', cursor: 'pointer' }}
            />
            <label htmlFor="sub-paid" style={{ fontSize: '14px', color: '#111827', cursor: 'pointer' }}>
              Subscription paid
            </label>
          </div>

          {/* Notes */}
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any additional notes…"
              rows={3}
              style={{ ...inputStyle(false), resize: 'vertical' }}
            />
          </Field>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, minHeight: '48px',
                border: '1px solid #E5E7EB', borderRadius: '10px',
                background: '#FFFFFF', color: '#6B7280',
                fontSize: '15px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 2, minHeight: '48px',
                background: saving ? '#9333EA' : '#6B21A8',
                color: '#FFFFFF', border: 'none', borderRadius: '10px',
                fontSize: '15px', fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.75 : 1,
              }}
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Player'}
            </button>
          </div>
        </form>

        {/* Responsive: centred modal on tablet/desktop */}
        <style>{`
          @media (min-width: 768px) {
            .player-sheet {
              top: 50% !important;
              left: 50% !important;
              right: auto !important;
              bottom: auto !important;
              transform: translate(-50%, -50%) !important;
              width: 520px !important;
              border-radius: 16px !important;
              max-height: 90vh !important;
            }
          }
        `}</style>
      </div>
    </>
  )
}

// ── Small helpers ──────────────────────────────────────────

function Field({
  label, error, children, style,
}: {
  label: string
  error?: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div style={{ marginBottom: '14px', ...style }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>
        {label}
      </label>
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#DC2626' }}>{error}</p>}
    </div>
  )
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${hasError ? '#DC2626' : '#E5E7EB'}`,
    borderRadius: '8px',
    fontSize: '15px',
    color: '#111827',
    background: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box',
  }
}
