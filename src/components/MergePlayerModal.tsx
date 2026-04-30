import { useState, useEffect, useMemo } from 'react'
import { X, AlertTriangle, Search } from 'lucide-react'
import { supabase, Player } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  duplicatePlayer: Player
  onClose: () => void
  onSuccess: () => void
}

interface TransferCounts {
  availability: number
  training: number
  matchEvents: number
}

/**
 * Phase 19.0 — Merge a "duplicate" player (usually a public-form failed match)
 * into an existing real player. Wraps the merge_players RPC.
 */
export default function MergePlayerModal({ duplicatePlayer, onClose, onSuccess }: Props) {
  const { activeClubId } = useAuth()

  const [candidates, setCandidates] = useState<Player[]>([])
  const [loadingCandidates, setLoadingCandidates] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [counts, setCounts] = useState<TransferCounts | null>(null)
  const [countsLoading, setCountsLoading] = useState(false)

  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Load same-club players (excluding the duplicate itself)
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!activeClubId) {
        setLoadError('No active club')
        setLoadingCandidates(false)
        return
      }
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('club_id', activeClubId)
        .neq('id', duplicatePlayer.id)
        .order('name', { ascending: true })

      if (cancelled) return
      if (error) {
        setLoadError(error.message)
      } else {
        setCandidates((data ?? []) as Player[])
      }
      setLoadingCandidates(false)
    }
    load()
    return () => { cancelled = true }
  }, [activeClubId, duplicatePlayer.id])

  // Fetch counts of what will move once a target is selected
  useEffect(() => {
    if (!selectedId) {
      setCounts(null)
      return
    }
    let cancelled = false
    setCountsLoading(true)
    async function loadCounts() {
      try {
        const [avail, training, events] = await Promise.all([
          supabase.from('availability_responses').select('id', { count: 'exact', head: true }).eq('player_id', duplicatePlayer.id),
          supabase.from('training_attendance').select('id',   { count: 'exact', head: true }).eq('player_id', duplicatePlayer.id),
          supabase.from('match_events').select('id',          { count: 'exact', head: true }).eq('player_id', duplicatePlayer.id),
        ])
        if (cancelled) return
        setCounts({
          availability: avail.count ?? 0,
          training:     training.count ?? 0,
          matchEvents:  events.count ?? 0,
        })
      } catch {
        if (!cancelled) setCounts(null)
      } finally {
        if (!cancelled) setCountsLoading(false)
      }
    }
    loadCounts()
    return () => { cancelled = true }
  }, [selectedId, duplicatePlayer.id])

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter(p => p.name.toLowerCase().includes(q))
  }, [candidates, search])

  const selectedPlayer = useMemo(
    () => candidates.find(p => p.id === selectedId) ?? null,
    [candidates, selectedId],
  )

  async function handleMerge() {
    if (!selectedPlayer) return
    setMerging(true)
    setMergeError(null)

    const { error } = await supabase.rpc('merge_players', {
      primary_id:   selectedPlayer.id,
      duplicate_id: duplicatePlayer.id,
    })

    setMerging(false)

    if (error) {
      // Map known server-side exception strings to friendlier text; fall back to raw message.
      const msg = error.message || 'Merge failed'
      if (msg.includes('same club'))               setMergeError('Players must belong to the same club.')
      else if (msg.includes('themselves'))         setMergeError('A player cannot be merged into themselves.')
      else if (msg.includes('not found'))          setMergeError('One of the players no longer exists. Refresh and try again.')
      else                                          setMergeError(msg)
      return
    }

    onSuccess()
  }

  const createdDate = duplicatePlayer.created_at
    ? new Date(duplicatePlayer.created_at).toLocaleDateString()
    : '—'

  return (
    <>
      {/* Backdrop — sits above PlayerFormSheet (z 50/51) */}
      <div
        onClick={merging ? undefined : onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }}
      />

      <div
        style={{
          position: 'fixed',
          zIndex: 61,
          background: '#FFFFFF',
          bottom: 0, left: 0, right: 0,
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          maxHeight: '92dvh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
        }}
        className="merge-modal"
      >
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 1,
        }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#111827' }}>
            Merge Player
          </h2>
          <button
            onClick={onClose}
            disabled={merging}
            style={{
              background: '#F3F4F6', border: 'none', borderRadius: '50%',
              width: 32, height: 32, cursor: merging ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} color="#6B7280" />
          </button>
        </div>

        <div style={{ padding: '20px' }}>

          {/* Warning banner */}
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            background: '#FEF3C7', border: '1px solid #FCD34D',
            borderRadius: 10, padding: '12px 14px', marginBottom: 18,
          }}>
            <AlertTriangle size={18} color="#B45309" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.45 }}>
              <strong>This cannot be undone.</strong> The duplicate player will be
              deleted and their availability, training and match data will transfer
              to the player you choose. On conflicts, the existing player&rsquo;s data wins.
            </div>
          </div>

          {/* Duplicate player summary */}
          <p style={labelCapStyle}>Duplicate (will be deleted)</p>
          <div style={{
            background: '#FEE2E2', border: '1px solid #FCA5A5',
            borderRadius: 10, padding: '12px 14px', marginBottom: 18,
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#991B1B' }}>
              {duplicatePlayer.name}
            </div>
            <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
              Created {createdDate} · {duplicatePlayer.status}
            </div>
          </div>

          {/* Target picker */}
          <p style={labelCapStyle}>Merge into</p>

          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input
              type="search"
              placeholder="Search players…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              disabled={merging}
              style={{
                width: '100%',
                padding: '10px 12px 10px 32px',
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {loadingCandidates && (
            <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', padding: '16px 0' }}>
              Loading players…
            </p>
          )}

          {!loadingCandidates && loadError && (
            <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: 10, borderRadius: 8, fontSize: 13 }}>
              {loadError}
            </div>
          )}

          {!loadingCandidates && !loadError && (
            <div style={{
              maxHeight: 220, overflowY: 'auto',
              border: '1px solid #E5E7EB', borderRadius: 10,
              marginBottom: 18,
            }}>
              {filteredCandidates.length === 0 && (
                <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '18px 0', margin: 0 }}>
                  No matching players
                </p>
              )}
              {filteredCandidates.map(p => {
                const active = p.id === selectedId
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    disabled={merging}
                    style={{
                      display: 'flex', width: '100%',
                      alignItems: 'center', gap: 10,
                      padding: '10px 12px',
                      background: active ? '#E8F0FE' : '#FFFFFF',
                      borderLeft: active ? '3px solid #0062F4' : '3px solid transparent',
                      border: 'none',
                      borderBottom: '1px solid #F3F4F6',
                      cursor: merging ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: active ? 600 : 500, color: '#111827' }}>
                      {p.name}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6B7280' }}>
                      {p.primary_position ?? '—'} · {p.status}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Transfer preview */}
          {selectedPlayer && (
            <div style={{
              background: '#F9FAFB', border: '1px solid #E5E7EB',
              borderRadius: 10, padding: '12px 14px', marginBottom: 18,
            }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Will transfer to {selectedPlayer.name}
              </p>
              {countsLoading && (
                <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>Calculating…</p>
              )}
              {!countsLoading && counts && (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                  <li>{counts.availability} availability response{counts.availability === 1 ? '' : 's'}</li>
                  <li>{counts.training} training record{counts.training === 1 ? '' : 's'}</li>
                  <li>{counts.matchEvents} match event{counts.matchEvents === 1 ? '' : 's'}</li>
                </ul>
              )}
            </div>
          )}

          {mergeError && (
            <div style={{
              background: '#FEE2E2', color: '#B91C1C',
              padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12,
            }}>
              {mergeError}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={merging}
              style={{
                flex: 1, minHeight: 48,
                border: '1px solid #E5E7EB', borderRadius: 10,
                background: '#FFFFFF', color: '#6B7280',
                fontSize: 15, fontWeight: 600,
                cursor: merging ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleMerge}
              disabled={!selectedPlayer || merging}
              style={{
                flex: 2, minHeight: 48,
                background: (!selectedPlayer || merging) ? '#FCD34D' : '#D97706',
                color: '#FFFFFF', border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 600,
                cursor: (!selectedPlayer || merging) ? 'not-allowed' : 'pointer',
                opacity: (!selectedPlayer || merging) ? 0.8 : 1,
              }}
            >
              {merging ? 'Merging…' : 'Merge Permanently'}
            </button>
          </div>
        </div>

        <style>{`
          @media (min-width: 768px) {
            .merge-modal {
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

const labelCapStyle: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: 11,
  fontWeight: 700,
  color: '#374151',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
}
