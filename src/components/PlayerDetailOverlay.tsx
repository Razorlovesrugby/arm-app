import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Player, PlayerStatus } from '../lib/supabase'
import { usePlayerDetails, PlayerStats } from '../hooks/usePlayerDetails'

interface Props {
  player: Player
  onClose: () => void
  onSaved: () => void
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div style={{
      background: '#F9FAFB',
      borderRadius: '12px',
      padding: '16px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>{value}</div>
      <div style={{ fontSize: '12px', fontWeight: '500', color: '#6B7280', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

export default function PlayerDetailOverlay({ player, onClose, onSaved }: Props) {
  const { fetchPlayerStats, updatePlayerCRM } = usePlayerDetails()

  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)

  const [caps, setCaps] = useState(player.historical_caps ?? 0)
  const [fines, setFines] = useState(player.court_fines ?? '')
  const [isRetired, setIsRetired] = useState(player.status === 'Retired')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Load stats lazily when overlay opens
  useEffect(() => {
    setStatsLoading(true)
    setStatsError(null)
    fetchPlayerStats(player.id)
      .then(s => setStats(s))
      .catch((e: unknown) => setStatsError(e instanceof Error ? e.message : 'Failed to load stats'))
      .finally(() => setStatsLoading(false))
  }, [player.id, fetchPlayerStats])

  const positions = [player.primary_position, ...(player.secondary_positions ?? [])]
    .filter(Boolean).join(', ')

  const allZero = stats ? Object.values(stats).every(v => v === 0) : false

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      // Determine new status: toggle between Retired and previous active-ish status
      let newStatus: PlayerStatus = player.status
      if (isRetired && player.status !== 'Retired') {
        newStatus = 'Retired'
      } else if (!isRetired && player.status === 'Retired') {
        newStatus = 'Active'
      }

      await updatePlayerCRM(player.id, {
        historical_caps: caps,
        court_fines: fines.trim() || null,
        status: newStatus,
      })
      onSaved()
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
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
      <div
        className="player-detail-overlay"
        style={{
          position: 'fixed',
          zIndex: 51,
          background: '#FFFFFF',
          bottom: 0, left: 0, right: 0,
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          maxHeight: '88dvh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0,
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          zIndex: 1,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#111827' }}>
              {player.name}
            </h2>
            {positions && (
              <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>
                {positions}
              </p>
            )}
            {/* Active/Retired toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
              <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>Retired</span>
              <button
                type="button"
                onClick={() => setIsRetired(v => !v)}
                role="switch"
                aria-checked={isRetired}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '999px',
                  border: 'none',
                  background: isRetired ? '#6B21A8' : '#D1D5DB',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                  minHeight: '24px',
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  left: isRetired ? '22px' : '2px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F3F4F6', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, minHeight: '44px', minWidth: '44px',
            }}
          >
            <X size={16} color="#6B7280" />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Career Stats */}
          <h3 style={{
            margin: '0 0 12px',
            fontSize: '11px',
            fontWeight: '700',
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
          }}>
            Career Stats
          </h3>

          {statsLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <div style={{
                width: 28, height: 28,
                border: '3px solid #E5E7EB',
                borderTopColor: '#6B21A8',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {!statsLoading && statsError && (
            <div style={{
              background: '#FEF3C7', color: '#92400E',
              borderRadius: '8px', padding: '10px 14px',
              fontSize: '13px', marginBottom: '16px',
            }}>
              Could not load stats: {statsError}
            </div>
          )}

          {!statsLoading && !statsError && stats && allZero && (
            <p style={{
              textAlign: 'center',
              fontStyle: 'italic',
              color: '#6B7280',
              fontSize: '14px',
              padding: '32px 0',
              margin: 0,
            }}>
              No match events recorded
            </p>
          )}

          {!statsLoading && !statsError && stats && !allZero && (
            <div
              className="stats-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                paddingBottom: '8px',
              }}
            >
              {stats.tries > 0        && <StatCard value={stats.tries}        label="Tries" />}
              {stats.conversions > 0  && <StatCard value={stats.conversions}  label="Conversions" />}
              {stats.penalties > 0    && <StatCard value={stats.penalties}    label="Penalties" />}
              {stats.dropGoals > 0    && <StatCard value={stats.dropGoals}    label="Drop Goals" />}
              {stats.yellowCards > 0  && <StatCard value={stats.yellowCards}  label="Yellow Cards" />}
              {stats.redCards > 0     && <StatCard value={stats.redCards}     label="Red Cards" />}
              {stats.dotd > 0         && <StatCard value={stats.dotd}         label="DOTD" />}
              {stats.mvpPoints > 0    && <StatCard value={stats.mvpPoints}    label="MVP Points" />}
            </div>
          )}

          <div style={{ height: '1px', background: '#E5E7EB', margin: '20px 0' }} />

          {/* Caps management */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '5px',
            }}>
              Total Caps
            </label>
            <input
              type="number"
              min={0}
              value={caps}
              onChange={e => setCaps(parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '15px',
                color: '#111827',
                background: '#FFFFFF',
                outline: 'none',
                boxSizing: 'border-box',
                minHeight: '44px',
              }}
            />
            <span style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', display: 'block' }}>
              Manual override of auto-calculated caps
            </span>
          </div>

          {/* Court fines */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '5px',
            }}>
              Court Fines
            </label>
            <textarea
              value={fines}
              onChange={e => setFines(e.target.value)}
              maxLength={1000}
              placeholder="Record any court fines or notes…"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '15px',
                color: '#111827',
                background: '#FFFFFF',
                outline: 'none',
                minHeight: '100px',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: '12px', color: '#6B7280', textAlign: 'right', marginTop: '2px' }}>
              {fines.length}/1000
            </div>
          </div>

          {/* Save error */}
          {saveError && (
            <div style={{
              background: '#FEE2E2', color: '#B91C1C',
              borderRadius: '8px', padding: '10px 14px',
              fontSize: '13px', marginBottom: '12px',
            }}>
              {saveError}
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%',
              height: '48px',
              background: saving ? '#9333EA' : '#6B21A8',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
              letterSpacing: '0.02em',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.75 : 1,
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            {saving ? 'SAVING…' : 'SAVE CHANGES'}
          </button>
        </div>

        {/* Responsive: centred modal on tablet/desktop */}
        <style>{`
          @media (min-width: 768px) {
            .player-detail-overlay {
              top: 50% !important;
              left: 50% !important;
              right: auto !important;
              bottom: auto !important;
              transform: translate(-50%, -50%) !important;
              width: 520px !important;
              border-radius: 16px !important;
              max-height: 90vh !important;
            }
            .stats-grid {
              grid-template-columns: repeat(4, 1fr) !important;
            }
          }
        `}</style>
      </div>
    </>
  )
}
