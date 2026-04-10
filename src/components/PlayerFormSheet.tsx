import { useState, useEffect, FormEvent } from 'react'
import { X } from 'lucide-react'
import {
  supabase, Player, Position, PlayerType, PlayerStatus,
  POSITIONS, PLAYER_TYPES, PLAYER_STATUSES, normalisePhone,
} from '../lib/supabase'
import { usePlayerDetails, PlayerStats } from '../hooks/usePlayerDetails'

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
  historical_caps: number
  court_fines: string
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
  historical_caps: 0,
  court_fines: '',
}

export default function PlayerFormSheet({ player, onClose, onSaved }: Props) {
  const isEdit = player !== null
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const { fetchPlayerStats } = usePlayerDetails()
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [kickingPercentage, setKickingPercentage] = useState<number | null>(null)
  const [kickingLoading, setKickingLoading] = useState(false)

  // Lock body scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

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
        historical_caps: player.historical_caps ?? 0,
        court_fines: player.court_fines ?? '',
      })
      // Load career stats lazily
      setStats(null)
      setStatsLoading(true)
      setStatsError(null)
      fetchPlayerStats(player.id)
        .then(s => setStats(s))
        .catch((e: unknown) => setStatsError(e instanceof Error ? e.message : 'Failed to load stats'))
        .finally(() => setStatsLoading(false))

      // Load career kicking stats
      setKickingPercentage(null)
      setKickingLoading(true)
      const playerId = player.id
      async function fetchKickingStats() {
        try {
          const { data } = await supabase
            .from('match_events')
            .select('event_type')
            .eq('player_id', playerId)
            .in('event_type', ['Conversion', 'Penalty', 'Conversion Miss', 'Penalty Miss'])

          if (data) {
            let makes = 0
            let total = 0
            data.forEach(event => {
              if (event.event_type === 'Conversion' || event.event_type === 'Penalty') {
                makes++
                total++
              } else if (event.event_type === 'Conversion Miss' || event.event_type === 'Penalty Miss') {
                total++
              }
            })
            setKickingPercentage(total > 0 ? Math.round((makes / total) * 100) : null)
          }
        } catch (error) {
          console.error('Failed to fetch kicking stats:', error)
          setKickingPercentage(null)
        } finally {
          setKickingLoading(false)
        }
      }
      fetchKickingStats()
    } else {
      setForm(EMPTY)
      setStats(null)
      setKickingPercentage(null)
    }
  }, [player, fetchPlayerStats])

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
      historical_caps:     form.historical_caps,
      court_fines:         form.court_fines.trim() || null,
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
        overscrollBehavior: 'contain',
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

          {/* ── CRM section (edit mode only) ── */}
          {isEdit && (
            <>
              <div style={{ height: '1px', background: '#E5E7EB', margin: '8px 0 20px' }} />

              {/* Career Stats */}
              <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Career Stats
              </p>

              {statsLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                  <div style={{
                    width: 24, height: 24,
                    border: '3px solid #E5E7EB',
                    borderTopColor: '#6B21A8',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {!statsLoading && statsError && (
                <p style={{ fontSize: '13px', color: '#92400E', background: '#FEF3C7', borderRadius: '8px', padding: '8px 12px', margin: '0 0 16px' }}>
                  Could not load stats: {statsError}
                </p>
              )}

              {!statsLoading && !statsError && stats && Object.values(stats).every(v => v === 0) && (
                <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#9CA3AF', textAlign: 'center', padding: '12px 0 20px', margin: 0 }}>
                  No match events recorded
                </p>
              )}

              {!statsLoading && !statsError && stats && !Object.values(stats).every(v => v === 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '8px' }}>
                  {stats.tries > 0       && <StatCard value={stats.tries}       label="Tries" />}
                  {stats.conversions > 0 && <StatCard value={stats.conversions} label="Conversions" />}
                  {stats.penalties > 0   && <StatCard value={stats.penalties}   label="Penalties" />}
                  {stats.dropGoals > 0   && <StatCard value={stats.dropGoals}   label="Drop Goals" />}
                  {stats.yellowCards > 0 && <StatCard value={stats.yellowCards} label="Yellow Cards" />}
                  {stats.redCards > 0    && <StatCard value={stats.redCards}    label="Red Cards" />}
                  {stats.dotd > 0        && <StatCard value={stats.dotd}        label="DOTD" />}
                  {stats.mvpPoints > 0   && <StatCard value={stats.mvpPoints}   label="MVP Points" />}
                </div>
              )}

              {/* Kicking % */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '20px' }}>
                {kickingLoading ? (
                  <StatCard value="Loading…" label="Kicking %" />
                ) : kickingPercentage !== null ? (
                  <StatCard value={`${kickingPercentage}%`} label="Kicking %" />
                ) : (
                  <StatCard value="—" label="Kicking %" />
                )}
              </div>

              {/* Total Caps */}
              <Field label="Total Caps">
                <input
                  type="number"
                  min={0}
                  value={form.historical_caps}
                  onChange={e => set('historical_caps', parseInt(e.target.value) || 0)}
                  style={inputStyle(false)}
                />
                <span style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '3px', display: 'block' }}>
                  Manual override of auto-calculated caps
                </span>
              </Field>

              {/* Court Fines */}
              <Field label="Court Fines">
                <textarea
                  value={form.court_fines}
                  onChange={e => set('court_fines', e.target.value)}
                  maxLength={1000}
                  placeholder="Record any court fines or notes…"
                  rows={3}
                  style={{ ...inputStyle(false), resize: 'vertical' }}
                />
                <div style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'right', marginTop: '2px' }}>
                  {form.court_fines.length}/1000
                </div>
              </Field>
            </>
          )}

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

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div style={{
      background: '#F9FAFB',
      borderRadius: '10px',
      padding: '12px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>{value}</div>
      <div style={{ fontSize: '11px', fontWeight: '500', color: '#6B7280', marginTop: '2px' }}>{label}</div>
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
