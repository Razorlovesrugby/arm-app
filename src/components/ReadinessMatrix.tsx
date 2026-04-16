// src/components/ReadinessMatrix.tsx
// Phase 17.4 — Weekly Readiness Matrix table for RDO dashboard

import { AlertCircle, Building2 } from 'lucide-react'
import type { ClubReadiness, SelectionStatus } from '../lib/supabase'

// ── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SelectionStatus, { label: string; className: string }> = {
  missing: {
    label: 'Missing',
    className: 'bg-amber-100 text-amber-800 border border-amber-200',
  },
  draft: {
    label: 'Draft',
    className: 'bg-blue-100 text-blue-800 border border-blue-200',
  },
  locked: {
    label: 'Locked',
    className: 'bg-green-100 text-green-800 border border-green-200',
  },
}

function StatusBadge({ status }: { status: SelectionStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}
      aria-label={`Selection status: ${cfg.label}`}
    >
      {cfg.label}
    </span>
  )
}

// ── Availability Bar ───────────────────────────────────────────────────────────

function AvailabilityBar({ percent }: { percent: number }) {
  const isLow = percent < 50
  const isMid = percent >= 50 && percent < 75

  const barColor = isLow
    ? 'bg-red-400'
    : isMid
    ? 'bg-amber-400'
    : 'bg-green-500'

  const textColor = isLow
    ? 'text-red-700 font-semibold'
    : isMid
    ? 'text-amber-700 font-semibold'
    : 'text-gray-700'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden" aria-hidden="true">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span
        className={`text-sm tabular-nums w-10 text-right ${textColor}`}
        aria-label={`${percent}% availability`}
      >
        {percent}%
      </span>
    </div>
  )
}

// ── Skeleton Row ───────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
      </td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-10" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-full" /></td>
      <td className="px-6 py-4"><div className="h-5 bg-gray-200 rounded-full w-16" /></td>
    </tr>
  )
}

// ── Data Row ───────────────────────────────────────────────────────────────────

function ReadinessRow({ club }: { club: ClubReadiness }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Club */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {club.logoUrl ? (
            <img
              src={club.logoUrl}
              alt={`${club.clubName} logo`}
              className="w-8 h-8 rounded-full object-cover border border-gray-100 flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <Building2 size={14} className="text-purple-400" />
            </div>
          )}
          <span className="text-sm font-medium text-gray-900">{club.clubName}</span>
        </div>
      </td>

      {/* Active Roster */}
      <td className="px-6 py-4">
        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-md tabular-nums">
          {club.rosterSize}
        </span>
      </td>

      {/* Availability % */}
      <td className="px-6 py-4 min-w-[140px]">
        {club.rosterSize > 0 ? (
          <AvailabilityBar percent={club.availabilityPercent} />
        ) : (
          <span className="text-xs text-gray-400 italic">No roster</span>
        )}
      </td>

      {/* Selection Status */}
      <td className="px-6 py-4">
        <StatusBadge status={club.selectionStatus} />
      </td>
    </tr>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface ReadinessMatrixProps {
  data: ClubReadiness[]
  loading: boolean
  error: string | null
  onRetry?: () => void
}

export default function ReadinessMatrix({ data, loading, error, onRetry }: ReadinessMatrixProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Weekly Readiness Matrix</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Overview of all managed clubs' weekend preparation
        </p>
      </div>

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
          <AlertCircle size={32} className="text-red-400 mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-gray-800 mb-1">Failed to load readiness data</p>
          <p className="text-xs text-gray-500 mb-4">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs text-purple-600 hover:text-purple-800 underline underline-offset-2"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Club
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Roster
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Availability
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Selection
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {loading && (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              )}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">
                    No clubs to display
                  </td>
                </tr>
              )}
              {!loading && data.map((club) => (
                <ReadinessRow key={club.clubId} club={club} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
