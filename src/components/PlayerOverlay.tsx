import { useState, useEffect } from 'react'
import { X, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PlayerWithAvailability } from '../hooks/useSelectionBoard'

interface PlayerOverlayProps {
  player: PlayerWithAvailability
  weekLabel: string
  onClose: () => void
}

export default function PlayerOverlay({ player, weekLabel, onClose }: PlayerOverlayProps) {
  const [coachNotes, setCoachNotes] = useState(player.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Reset when player changes
  useEffect(() => {
    setCoachNotes(player.notes ?? '')
    setSaved(false)
  }, [player.id, player.notes])

  async function handleSaveNotes() {
    setSaving(true)
    const { error } = await supabase
      .from('players')
      .update({ notes: coachNotes.trim() || null })
      .eq('id', player.id)
    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const isMobile = window.innerWidth < 768

  const overlayStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 60,
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
        zIndex: 60,
        background: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '480px',
        maxHeight: '85vh',
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
          zIndex: 59,
        }}
      />

      <div style={overlayStyle}>
        {/* Handle (mobile only) */}
        {isMobile && (
          <div style={{
            width: '36px', height: '4px',
            background: '#E5E7EB',
            borderRadius: '2px',
            margin: '12px auto 0',
          }} />
        )}

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #E5E7EB',
          position: 'sticky',
          top: 0,
          background: '#FFFFFF',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>
              {player.name}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6B7280' }}>
              {player.primary_position ?? 'No position'} · {player.player_type}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px', borderRadius: '8px', color: '#6B7280',
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Availability Note (week-specific, read-only) */}
          {player.availabilityNote && (
            <div>
              <p style={{
                margin: '0 0 6px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                Availability Note — {weekLabel}
              </p>
              <div style={{
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}>
                <MessageSquare size={14} color="#B45309" style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ margin: 0, fontSize: '14px', color: '#92400E', lineHeight: '1.4' }}>
                  {player.availabilityNote}
                </p>
              </div>
            </div>
          )}

          {/* Coach Notes (editable) */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Coach Notes
            </label>
            <textarea
              value={coachNotes}
              onChange={e => setCoachNotes(e.target.value)}
              placeholder="Add notes about this player…"
              rows={4}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                fontSize: '14px',
                color: '#111827',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: '1.5',
              }}
            />
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              style={{
                marginTop: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                background: saved ? '#16A34A' : saving ? '#9CA3AF' : '#6B21A8',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Notes'}
            </button>
          </div>

          {/* Player info row */}
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}>
            {[
              { label: 'Status', value: player.status },
              { label: 'Type', value: player.player_type },
              ...(player.secondary_positions?.length > 0
                ? [{ label: 'Also plays', value: player.secondary_positions.join(', ') }]
                : []),
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  background: '#F8F8F8',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
              >
                <p style={{ margin: 0, fontSize: '11px', color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' }}>
                  {label}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#111827', fontWeight: '600' }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  )
}
