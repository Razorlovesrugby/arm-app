// src/pages/RDODashboard.tsx
// Phase 17.2 — RDO Command Center: Launchpad with club cards and tenant switching

import { useEffect, useState, useCallback } from 'react'
import { Building2, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react'
import { supabase, type ClubWithLogo } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ── Club Card ─────────────────────────────────────────────────────────────────

interface ClubCardProps {
  name: string
  logoUrl: string | null
  onManage: () => void
}

function ClubCard({ name, logoUrl, onManage }: ClubCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${name} logo`}
            className="w-14 h-14 rounded-full object-cover border border-gray-100 flex-shrink-0"
            loading="lazy"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            <Building2 size={24} className="text-purple-400" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 text-base leading-snug truncate">{name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">Rugby Club</p>
        </div>
      </div>

      <button
        onClick={onManage}
        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Manage Club
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ClubCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
      <div className="h-10 bg-gray-100 rounded-lg" />
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function RDODashboard() {
  const { user, switchTenant } = useAuth()
  const [clubs, setClubs] = useState<ClubWithLogo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClubs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('rdo_club_access')
      .select(`
        club_id,
        clubs (
          id,
          name,
          club_settings (
            logo_url
          )
        )
      `)
      .eq('user_id', user.id)

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setClubs((data as unknown as ClubWithLogo[]) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchClubs()
  }, [fetchClubs])

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Launchpad</h1>
        <p className="text-gray-500 mt-1">Select a club to enter the coaching interface</p>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ClubCardSkeleton />
          <ClubCardSkeleton />
          <ClubCardSkeleton />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle size={40} className="text-red-400 mb-4" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Failed to load clubs</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">{error}</p>
          <button
            onClick={fetchClubs}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            <RefreshCw size={15} aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && clubs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"
            aria-hidden="true"
          >
            <Building2 size={28} className="text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">No clubs assigned</h2>
          <p className="text-sm text-gray-500 max-w-sm">
            You don't have access to any clubs yet. Contact your administrator to get clubs assigned to your account.
          </p>
        </div>
      )}

      {/* Club grid */}
      {!loading && !error && clubs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map((entry) => {
            const club = entry.clubs
            if (!club) return null
            const logoUrl = club.club_settings?.[0]?.logo_url ?? null
            return (
              <ClubCard
                key={entry.club_id}
                name={club.name}
                logoUrl={logoUrl}
                onManage={() => switchTenant(entry.club_id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
