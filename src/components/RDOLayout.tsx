// src/components/RDOLayout.tsx
// Phase 17.2 — RDO-specific layout with sidebar navigation rail
// Phase 17.5 — Navigation items are now routing-aware

import { type ReactNode } from 'react'
import { Home, Calendar, Users, LogOut, type LucideIcon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface NavItem {
  label: string
  icon: LucideIcon
  path: string
  disabled?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Command Center', icon: Home,     path: '/rdo-dashboard' },
  { label: 'Player Pool',    icon: Users,    path: '/rdo-dashboard/player-pool' },
  { label: 'Calendar',       icon: Calendar, path: '/rdo-dashboard/calendar', disabled: true },
]

interface RDOLayoutProps {
  children: ReactNode
  activePath: string
  onNavigate: (path: string) => void
}

export default function RDOLayout({ children, activePath, onNavigate }: RDOLayoutProps) {
  const { user, signOut } = useAuth()

  return (
    <div className="flex h-[100dvh] bg-gray-50">
      {/* Desktop sidebar rail */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 flex-shrink-0">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-gray-100">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest mb-0.5">
            ARM Enterprise
          </p>
          <p className="text-lg font-bold text-gray-900">Command Center</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="RDO navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = activePath === item.path
            return (
              <button
                key={item.label}
                disabled={item.disabled}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => !item.disabled && onNavigate(item.path)}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-purple-50 text-purple-700'
                    : item.disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-50 cursor-pointer',
                ].join(' ')}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.disabled && (
                  <span className="ml-auto text-xs text-gray-300">Soon</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-gray-100">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            <p className="text-xs font-medium text-purple-600 mt-0.5">Rugby Development Officer</p>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header
          className="md:hidden flex items-center justify-between px-4 bg-white border-b border-gray-200 flex-shrink-0"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            minHeight: 'calc(env(safe-area-inset-top) + 56px)',
          }}
        >
          <div>
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest">
              ARM Enterprise
            </p>
            <p className="text-sm font-bold text-gray-900">
              {NAV_ITEMS.find(n => n.path === activePath)?.label ?? 'Command Center'}
            </p>
          </div>

          {/* Mobile nav buttons */}
          <div className="flex items-center gap-1">
            {NAV_ITEMS.filter(n => !n.disabled).map(item => (
              <button
                key={item.label}
                onClick={() => onNavigate(item.path)}
                aria-current={activePath === item.path ? 'page' : undefined}
                aria-label={item.label}
                className={[
                  'p-2 rounded-lg transition-colors',
                  activePath === item.path
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-gray-500 hover:bg-gray-100',
                ].join(' ')}
              >
                <item.icon size={20} />
              </button>
            ))}
            <button
              onClick={signOut}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              aria-label="Sign out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  )
}
