import { useState, useMemo } from 'react'
import { Search, Plus, Filter, X } from 'lucide-react'
import { usePlayers } from '../hooks/usePlayers'
import { Player, PlayerStatus, PlayerType, Position, POSITIONS, PLAYER_TYPES } from '../lib/supabase'
import PlayerCard from '../components/PlayerCard'
import PlayerFormSheet from '../components/PlayerFormSheet'
import DeletePlayerDialog from '../components/DeletePlayerDialog'

// Statuses shown in the Roster filter dropdown — Archived is handled by its own toggle
const ROSTER_FILTER_STATUSES: PlayerStatus[] = ['Active', 'Injured', 'Unavailable', 'Retired']

type SortKey = 'name' | 'position' | 'status'

export default function Roster() {
  const { players, loading, error, refetch } = usePlayers()

  // Search + filter state
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<PlayerStatus | ''>('')
  const [filterType, setFilterType] = useState<PlayerType | ''>('')
  const [filterPosition, setFilterPosition] = useState<Position | ''>('')
  const [showFilters, setShowFilters] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [sortKey] = useState<SortKey>('name')

  // Sheet / modal state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null)

  // Derived: filtered + sorted list
  const filtered = useMemo(() => {
    let list = [...players]

    // Archived hidden by default — only shown when toggle is on
    if (!showArchived) list = list.filter(p => p.status !== 'Archived')

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q))
    }
    if (filterStatus)   list = list.filter(p => p.status === filterStatus)
    if (filterType)     list = list.filter(p => p.player_type === filterType)
    if (filterPosition) {
      list = list.filter(p =>
        p.primary_position === filterPosition ||
        (p.secondary_positions ?? []).includes(filterPosition)
      )
    }

    list.sort((a, b) => {
      if (sortKey === 'name')     return a.name.localeCompare(b.name)
      if (sortKey === 'position') return (a.primary_position ?? '').localeCompare(b.primary_position ?? '')
      if (sortKey === 'status')   return a.status.localeCompare(b.status)
      return 0
    })

    return list
  }, [players, search, filterStatus, filterType, filterPosition, sortKey, showArchived])

  const activeFilters = [filterStatus, filterType, filterPosition].filter(Boolean).length + (showArchived ? 1 : 0)

  function openAdd() {
    setEditingPlayer(null)
    setSheetOpen(true)
  }

  function openEdit(player: Player) {
    setEditingPlayer(player)
    setSheetOpen(true)
  }

  function clearFilters() {
    setFilterStatus('')
    setFilterType('')
    setFilterPosition('')
    setShowArchived(false)
  }

  function exportCSV() {
    const headers = [
      'Name', 'Email', 'Phone', 'Date of Birth', 'Primary Position',
      'Secondary Positions', 'Type', 'Status', 'Subscription Paid', 'Notes',
      'Last Played Date', 'Last Played Team',
    ]
    const rows = filtered.map(p => [
      p.name,
      p.email ?? '',
      p.phone ?? '',
      p.date_of_birth ?? '',
      p.primary_position ?? '',
      (p.secondary_positions ?? []).join('; '),
      p.player_type,
      p.status,
      p.subscription_paid ? 'Yes' : 'No',
      p.notes ?? '',
      p.last_played_date ?? '',
      p.last_played_team ?? '',
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arm-roster-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F8F8F8' }}>

      {/* ── Top bar: search + filter toggle + add ── */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '12px 16px',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}
          />
          <input
            type="search"
            placeholder="Search players…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 32px',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#111827',
              background: '#F8F8F8',
              outline: 'none',
            }}
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '9px 12px',
            border: '1px solid',
            borderColor: activeFilters > 0 ? '#6B21A8' : '#E5E7EB',
            borderRadius: '8px',
            background: activeFilters > 0 ? '#F3E8FF' : '#FFFFFF',
            color: activeFilters > 0 ? '#6B21A8' : '#6B7280',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            minHeight: '44px',
            whiteSpace: 'nowrap',
          }}
        >
          <Filter size={15} />
          {activeFilters > 0 ? `Filters (${activeFilters})` : 'Filter'}
        </button>

        {/* Add player */}
        <button
          onClick={openAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '9px 14px',
            background: '#6B21A8',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            minHeight: '44px',
            whiteSpace: 'nowrap',
          }}
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
        }}>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as PlayerStatus | '')}
            style={selectStyle}
          >
            <option value="">All statuses</option>
            {ROSTER_FILTER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as PlayerType | '')}
            style={selectStyle}
          >
            <option value="">All types</option>
            {PLAYER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={filterPosition}
            onChange={e => setFilterPosition(e.target.value as Position | '')}
            style={selectStyle}
          >
            <option value="">All positions</option>
            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Show Archived toggle */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', color: '#374151', cursor: 'pointer',
            padding: '7px 10px',
            border: '1px solid',
            borderColor: showArchived ? '#6B21A8' : '#E5E7EB',
            borderRadius: '8px',
            background: showArchived ? '#F3E8FF' : '#FFFFFF',
            userSelect: 'none',
          }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
              style={{ accentColor: '#6B21A8', width: '14px', height: '14px', cursor: 'pointer' }}
            />
            <span style={{ color: showArchived ? '#6B21A8' : '#374151', fontWeight: showArchived ? '600' : '400' }}>
              Show Archived
            </span>
          </label>

          {activeFilters > 0 && (
            <button
              onClick={clearFilters}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '7px 10px', border: '1px solid #E5E7EB', borderRadius: '8px',
                background: 'transparent', color: '#6B7280', fontSize: '13px', cursor: 'pointer',
              }}
            >
              <X size={13} /> Clear
            </button>
          )}

          <button
            onClick={exportCSV}
            style={{
              marginLeft: 'auto',
              padding: '7px 12px', border: '1px solid #E5E7EB', borderRadius: '8px',
              background: 'transparent', color: '#6B7280', fontSize: '13px',
              fontWeight: '500', cursor: 'pointer',
            }}
          >
            Export CSV
          </button>
        </div>
      )}

      {/* ── Player count ── */}
      {!loading && !error && (
        <div style={{ padding: '10px 16px 4px', fontSize: '13px', color: '#6B7280' }}>
          {filtered.length === players.length
            ? `${players.length} player${players.length !== 1 ? 's' : ''}`
            : `${filtered.length} of ${players.length} players`}
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 16px' }}>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div style={{
              width: 36, height: 36,
              border: '3px solid #E5E7EB',
              borderTopColor: '#6B21A8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!loading && error && (
          <div style={{
            background: '#FEE2E2', color: '#B91C1C',
            borderRadius: '10px', padding: '16px', fontSize: '14px', marginTop: '8px',
          }}>
            Failed to load players: {error}
          </div>
        )}

        {!loading && !error && players.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '64px 24px', gap: '12px', textAlign: 'center',
          }}>
            <span style={{ fontSize: '48px' }}>🏉</span>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
              No players yet
            </p>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
              Tap Add to add your first player.
            </p>
            <button
              onClick={openAdd}
              style={{
                marginTop: '8px', padding: '12px 24px',
                background: '#6B21A8', color: '#FFFFFF',
                border: 'none', borderRadius: '10px',
                fontSize: '15px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              Add Player
            </button>
          </div>
        )}

        {!loading && !error && players.length > 0 && filtered.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '48px 24px', gap: '10px', textAlign: 'center',
          }}>
            <span style={{ fontSize: '40px' }}>🔍</span>
            <p style={{ fontSize: '15px', fontWeight: '500', color: '#111827', margin: 0 }}>
              No players match
            </p>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
              Try adjusting your search or filters.
            </p>
            <button
              onClick={() => { setSearch(''); clearFilters() }}
              style={{
                marginTop: '4px', padding: '9px 18px',
                background: 'transparent', color: '#6B21A8',
                border: '1px solid #6B21A8', borderRadius: '8px',
                fontSize: '14px', fontWeight: '500', cursor: 'pointer',
              }}
            >
              Clear all
            </button>
          </div>
        )}

        {!loading && !error && filtered.map(player => (
          <PlayerCard
            key={player.id}
            player={player}
            onEdit={() => openEdit(player)}
            onDelete={() => setDeletingPlayer(player)}
          />
        ))}
      </div>

      {sheetOpen && (
        <PlayerFormSheet
          player={editingPlayer}
          onClose={() => setSheetOpen(false)}
          onSaved={() => { setSheetOpen(false); refetch() }}
        />
      )}

      {deletingPlayer && (
        <DeletePlayerDialog
          player={deletingPlayer}
          onCancel={() => setDeletingPlayer(null)}
          onDeleted={() => { setDeletingPlayer(null); refetch() }}
        />
      )}
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  padding: '7px 10px',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  fontSize: '13px',
  color: '#111827',
  background: '#FFFFFF',
  cursor: 'pointer',
  minHeight: '36px',
}
