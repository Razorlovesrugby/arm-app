// src/components/Sidebar.tsx
// Phase 12.1/12.2 — Branded sidebar with /results and /club-settings nav items

import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useClubSettings } from '../hooks/useClubSettings'
import { X } from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navigation = [
  { path: '/roster',        label: 'Roster' },
  { path: '/depth',         label: 'Depth Chart' },
  { path: '/weeks',         label: 'Weeks' },
  { path: '/grid',          label: 'Availability' },
  { path: '/attendance',    label: 'Attendance' },
  { path: '/results',       label: 'Results' },
  { path: '/club-settings', label: 'Club Settings' },
]

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { clubSettings } = useClubSettings()
  const location = useLocation()
  const { user, signOut } = useAuth()

  function isActive(path: string): boolean {
    // /board is accessed from Weeks, so highlight Weeks when on board
    if (path === '/weeks' && location.pathname.startsWith('/board')) return true
    return location.pathname.startsWith(path)
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside className={`
        fixed top-0 left-0 h-full z-50
        bg-purple-900 text-white
        w-4/5 max-w-xs
        transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:w-64 md:flex-shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-6 border-b border-purple-800" style={{ paddingTop: 'max(env(safe-area-inset-top), 24px)' }}>
          <div className="flex items-center justify-between">
            <img
              src="/icons/Logo.png"
              alt="ARM Logo"
              className="h-10 w-auto object-contain"
            />
            <button
              onClick={onClose}
              className="md:hidden text-white p-1 rounded hover:bg-purple-800 transition-colors"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>
          <div className="mt-2">
            <div className="text-xs uppercase tracking-wider text-purple-300">
              ATHLETE RELATIONSHIP MANAGEMENT
            </div>
            <div className="text-lg font-bold mt-1">
              {clubSettings?.club_name || 'ARM'}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 flex flex-col gap-1 mt-2 flex-1">
          {navigation.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 768) onClose()
              }}
              className={`
                px-4 py-3 rounded-lg transition-colors text-sm font-medium
                ${isActive(item.path)
                  ? 'bg-purple-800 border-l-4 border-white font-bold'
                  : 'text-purple-200 hover:bg-purple-800'
                }
              `}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-purple-800/50">
          <div className="text-sm text-purple-300 mb-2 truncate">
            {user?.email}
          </div>
          <button
            onClick={() => signOut()}
            className="w-full py-2 px-4 bg-purple-800 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
