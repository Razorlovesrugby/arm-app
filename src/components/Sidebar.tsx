import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useClubSettings } from '../hooks/useClubSettings'
import { X } from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { clubSettings } = useClubSettings()
  const location = useLocation()
  const { user, signOut } = useAuth()

  const navigation = [
    { path: '/roster', label: 'Roster' },
    { path: '/depth', label: 'Depth Chart' },
    { path: '/weeks', label: 'Weeks' },
    { path: '/board', label: 'Results' },
  ]

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

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-50
        bg-purple-900 text-white
        ${isOpen ? 'w-4/5' : 'w-64'}
        transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:w-64 md:flex-shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-6 border-b border-purple-800">
          <div className="flex items-center justify-between">
            <img 
              src="/icons/Logo.png" 
              alt="ARM Logo" 
              className="h-10 w-auto object-contain"
            />
            {/* Mobile close button */}
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
        <nav className="p-4 flex flex-col gap-2 mt-4 flex-1">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 768) onClose()
                }}
                className={`
                  px-4 py-3 rounded-lg transition-colors
                  ${isActive
                    ? 'bg-purple-800 border-l-4 border-white font-bold'
                    : 'text-purple-200 hover:bg-purple-800'
                  }
                `}
              >
                {item.label}
              </Link>
            )
          })}
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