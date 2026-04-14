import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function RDODashboard() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">RDO Command Center</h1>
          <p className="text-gray-600 mt-2">
            Welcome, {user?.email}. You have multi-club administrative access.
          </p>
        </header>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">ARM15 MAX - Enterprise Tier</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              This is the Rugby Development Officer dashboard. Phase 17.2 will add
              club switching, analytics, and cross-club reporting features.
            </p>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Next Phase:</strong> Use the club selector (coming in 17.2) to impersonate
                any club you manage and access their full coaching interface.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
