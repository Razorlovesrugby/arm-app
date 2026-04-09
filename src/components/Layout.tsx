// src/components/Layout.tsx
// Phase 12.1/12.2 — Sidebar navigation with dynamic club branding + safe-area fixes

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useClubSettings } from '../hooks/useClubSettings'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { clubSettings } = useClubSettings()

  return (
    <div className="flex h-[100dvh] bg-gray-50">
      {/* Sidebar (handles its own overlay on mobile) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header
          className="md:hidden flex items-center justify-between px-4 bg-white border-b border-gray-200 flex-shrink-0"
          style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(env(safe-area-inset-top) + 56px)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="relative z-40 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} className="text-gray-700" />
          </button>
          <div className="text-lg font-semibold text-gray-900">
            {clubSettings?.club_name || 'ARM'}
          </div>
          <div className="w-10" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
