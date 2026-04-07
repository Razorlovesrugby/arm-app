// src/components/Layout.tsx
// Phase 12.1 — Sidebar Navigation Refactor
// Replaces bottom-tab navigation with responsive sidebar

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useClubSettings } from '../hooks/useClubSettings'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { clubSettings } = useClubSettings()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} className="text-gray-700" />
          </button>
          <div className="text-lg font-semibold text-gray-900">
            {clubSettings?.club_name || 'ARM'}
          </div>
          <div className="w-10" /> {/* Spacer for balance */}
        </header>
        
        {/* Page content */}
        <main 
          className="flex-1 overflow-auto p-4 md:p-6" 
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}