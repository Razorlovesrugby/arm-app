// src/pages/RfcPlayerPool.tsx
// Phase 17.5 — RFC Player Pool: master grid of all players across managed clubs

import { useState, useMemo } from 'react'
import { X, Users } from 'lucide-react'
import { useRFCPlayerPool } from '../hooks/useRFCPlayerPool'
import type { PlayerPoolRow, PlayerPoolFilters } from '../lib/supabase'

// ── Availability badge ─────────────────────────────────────────────────────────

function AvailabilityBadge({ value }: { value: string }) {
  const styles: Record<string, React.CSSProperties> = {
    Available:   { background: '#DCFCE7', color: '#15803D' },
    Unavailable: { background: '#FEE2E2', color: '#B91C1C' },
    Pending:     { background: '#FEF9C3', color: '#92400E' },
    'No Response': { background: '#F3F4F6', color: '#6B7280' },
  }
  const style = styles[value] ?? styles['No Response']
  return (
    <span style={{
      ...style,
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: '600',
      whiteSpace: 'nowrap',
    }}>
      {value}
    </span>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ value }: { value: string }) {
  const styles: Record<string, React.CSSProperties> = {
    Active:      { background: '#DCFCE7', color: '#15803D' },
    Injured:     { background: '#FEE2E2', color: '#B91C1C' },
    Unavailable: { background: '#FEF3C7', color: '#92400E' },
    Retired:     { background: '#F3F4F6', color: '#6B7280' },
    Archived:    { background: '#F3F4F6', color: '#9CA3AF' },
  }
  const style = styles[value] ?? { background: '#F3F4F6', color: '#6B7280' }
  return (
    <span style={{
      ...style,
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: '600',
      whiteSpace: 'nowrap',
    }}>
      {value}
    </span>
  )
}

// ── Filter bar ─────────────────────────────────────────────────────────────────

interface FilterBarProps {
  data: PlayerPoolRow[]
  filters: PlayerPoolFilters
  onChange: (f: PlayerPoolFilters) => void
  playerTypeOptions: string[]
}

function FilterBar({ data, filters, onChange, playerTypeOptions }: FilterBarProps) {
  const teams              = useMemo(() => [...new Set(data.map(r => r.team_name))].sort(), [data])
  const derivedPlayerTypes = useMemo(() => [...new Set(data.map(r => r.player_type))].sort(), [data])
  const playerTypes        = playerTypeOptions.length > 0 ? playerTypeOptions : derivedPlayerTypes
  const statuses           = useMemo(() => [...new Set(data.map(r => r.status))].sort(), [data])
  const positions     = useMemo(() => [...new Set(data.map(r => r.position_primary).filter(Boolean))].sort(), [data])
  const availabilities = ['Available', 'Unavailable', 'Pending', 'No Response']

  const hasFilters = Object.values(filters).some(v => v && v !== '')

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex flex-wrap gap-3 items-end">

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Team</label>
          <select
            value={filters.team ?? ''}
            onChange={e => onChange({ ...filters, team: e.target.value || undefined })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="">All Teams</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Player Type</label>
          <select
            value={filters.playerType ?? ''}
            onChange={e => onChange({ ...filters, playerType: e.target.value || undefined })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="">All Types</option>
            {playerTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</label>
          <select
            value={filters.status ?? ''}
            onChange={e => onChange({ ...filters, status: e.target.value || undefined })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Position</label>
          <select
            value={filters.position ?? ''}
            onChange={e => onChange({ ...filters, position: e.target.value || undefined })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="">All Positions</option>
            {positions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Availability</label>
          <select
            value={filters.availability ?? ''}
            onChange={e => onChange({ ...filters, availability: e.target.value || undefined })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="">All</option>
            {availabilities.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {hasFilters && (
          <button
            onClick={() => onChange({})}
            className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors self-end"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  )
}

// ── Read-only player panel ─────────────────────────────────────────────────────

function PlayerPanel({ player, onClose }: { player: PlayerPoolRow; onClose: () => void }) {
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
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: '360px',
          background: '#FFFFFF',
          zIndex: 51,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        }}
        role="dialog"
        aria-label={`${player.first_name} ${player.last_name} player details`}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>
              {player.first_name} {player.last_name}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6B7280' }}>
              {player.team_name}
            </p>
            <span style={{
              display: 'inline-block',
              marginTop: '6px',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: '600',
              background: '#F3E8FF',
              color: '#6B21A8',
            }}>
              Read-Only View
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            style={{
              background: '#F3F4F6', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={16} color="#6B7280" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div>
              <dt style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Team
              </dt>
              <dd style={{ margin: 0, fontSize: '15px', color: '#111827' }}>
                {player.team_name}
              </dd>
            </div>

            <div>
              <dt style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Position
              </dt>
              <dd style={{ margin: 0, fontSize: '15px', color: '#111827' }}>
                {player.position_primary || '—'}
              </dd>
            </div>

            <div>
              <dt style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Player Type
              </dt>
              <dd style={{ margin: 0, fontSize: '15px', color: '#111827' }}>
                {player.player_type}
              </dd>
            </div>

            <div>
              <dt style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Player Status
              </dt>
              <dd style={{ margin: 0 }}>
                <StatusBadge value={player.status} />
              </dd>
            </div>

            <div style={{ paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
              <dt style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Current Week Availability
              </dt>
              <dd style={{ margin: 0 }}>
                <AvailabilityBadge value={player.current_availability} />
              </dd>
            </div>

          </dl>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #E5E7EB' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%', minHeight: '44px',
              border: '1px solid #E5E7EB', borderRadius: '10px',
              background: '#FFFFFF', color: '#6B7280',
              fontSize: '15px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}

// ── Skeleton rows ──────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 6 }).map((_, j) => (
            <td key={j} style={{ padding: '14px 16px' }}>
              <div style={{
                height: '14px',
                borderRadius: '6px',
                background: '#F3F4F6',
                width: j === 0 ? '120px' : j === 1 ? '90px' : '70px',
                animation: 'pulse 1.4s ease-in-out infinite',
              }} />
            </td>
          ))}
        </tr>
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </>
  )
}

// ── Apply filters ──────────────────────────────────────────────────────────────

function applyFilters(data: PlayerPoolRow[], filters: PlayerPoolFilters): PlayerPoolRow[] {
  return data.filter(row => {
    if (filters.team        && row.team_name         !== filters.team)        return false
    if (filters.playerType  && row.player_type        !== filters.playerType)  return false
    if (filters.status      && row.status             !== filters.status)      return false
    if (filters.position    && row.position_primary   !== filters.position)    return false
    if (filters.availability && row.current_availability !== filters.availability) return false
    return true
  })
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function RfcPlayerPool() {
  const { data, loading, error, playerTypeOptions } = useRFCPlayerPool()
  const [filters, setFilters] = useState<PlayerPoolFilters>({})
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerPoolRow | null>(null)

  const filteredData = useMemo(() => applyFilters(data, filters), [data, filters])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Users size={22} className="text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">RFC Player Pool</h1>
        </div>
        <p className="text-gray-500 text-sm ml-9">
          Master view of all players across your managed teams
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Filter bar */}
      <FilterBar data={data} filters={filters} onChange={setFilters} playerTypeOptions={playerTypeOptions} />

      {/* Count line */}
      {!loading && (
        <p className="text-sm text-gray-500 mb-3">
          {filteredData.length === data.length
            ? `${data.length} players`
            : `${filteredData.length} of ${data.length} players`}
        </p>
      )}

      {/* Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {['Name', 'Team', 'Position', 'Type', 'Status', 'This Week'].map(col => (
                  <th key={col} style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#9CA3AF' }}>
                      {data.length === 0 ? 'No players found across managed clubs.' : 'No players match the selected filters.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr
                    key={row.player_id}
                    onClick={() => setSelectedPlayer(row)}
                    style={{
                      borderBottom: idx < filteredData.length - 1 ? '1px solid #F3F4F6' : undefined,
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>
                        {row.first_name} {row.last_name}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>
                      {row.team_name}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>
                      {row.position_primary || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>
                      {row.player_type}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge value={row.status} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <AvailabilityBadge value={row.current_availability} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Read-only slide-out */}
      {selectedPlayer && (
        <PlayerPanel
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  )
}
