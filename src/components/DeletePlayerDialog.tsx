import { useState } from 'react'
import { supabase, Player } from '../lib/supabase'

interface Props {
  player: Player
  onCancel: () => void
  onDeleted: () => void
}

export default function DeletePlayerDialog({ player, onCancel, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const { error } = await supabase.from('players').delete().eq('id', player.id)
    setDeleting(false)
    if (error) {
      setError(error.message)
    } else {
      onDeleted()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 60,
        }}
      />

      {/* Dialog */}
      <div style={{
        position: 'fixed',
        zIndex: 61,
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px',
        width: 'calc(100% - 48px)',
        maxWidth: '360px',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '700', color: '#111827' }}>
          Delete Player
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#6B7280', lineHeight: '1.5' }}>
          Remove <strong style={{ color: '#111827' }}>{player.name}</strong> from the roster?
          This cannot be undone.
        </p>

        {error && (
          <div style={{
            background: '#FEE2E2', color: '#B91C1C',
            borderRadius: '8px', padding: '10px 12px',
            fontSize: '13px', marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{
              flex: 1, minHeight: '44px',
              border: '1px solid #E5E7EB', borderRadius: '10px',
              background: '#FFFFFF', color: '#6B7280',
              fontSize: '15px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              flex: 1, minHeight: '44px',
              background: deleting ? '#F87171' : '#DC2626',
              color: '#FFFFFF', border: 'none', borderRadius: '10px',
              fontSize: '15px', fontWeight: '600',
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.75 : 1,
            }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </>
  )
}
