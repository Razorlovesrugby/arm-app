// src/App.tsx
// Phase 12.6 — Branding, Defaults & Game Notes
// Phase 17.2 — RDO routing with ProtectedShell pattern

import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import Layout from './components/Layout'
import RDOLayout from './components/RDOLayout'
import RDODashboard from './pages/RDODashboard'
import RfcPlayerPool from './pages/RfcPlayerPool'
import Login from './pages/Login'
import Roster from './pages/Roster'
import DepthChart from './pages/DepthChart'
import Board from './pages/Board'
import Weeks from './pages/Weeks'
import Results from './pages/Results'
import ResultDetail from './pages/ResultDetail'
import ClubSettings from './pages/ClubSettings'
import Grid from './pages/Grid'
import Attendance from './pages/Attendance'
import AvailabilityForm from './pages/AvailabilityForm'
import { useClubSettings } from './hooks/useClubSettings'

function BrandInjector() {
  const { clubSettings } = useClubSettings()

  useEffect(() => {
    const color = clubSettings?.primary_color
    if (!color) return

    document.documentElement.style.setProperty('--primary', color)

    let metaTheme = document.querySelector('meta[name="theme-color"]')
    if (!metaTheme) {
      metaTheme = document.createElement('meta')
      metaTheme.setAttribute('name', 'theme-color')
      document.head.appendChild(metaTheme)
    }
    metaTheme.setAttribute('content', color)
  }, [clubSettings?.primary_color])

  return null
}

// Decides which layout shell to render based on role and activeClubId.
//
// RDO with no active club  → RDOLayout with the correct RDO page.
//   Allowed RDO paths: /rdo-dashboard, /rdo-dashboard/player-pool.
//   Anything else redirects to /rdo-dashboard.
//
// Coach or RDO impersonating a club → standard Layout with Outlet.
//   key={activeClubId} forces React to fully remount the coach tree when
//   the tenant changes, ensuring stale hook state is cleared.

const RDO_PATHS = ['/rdo-dashboard', '/rdo-dashboard/player-pool']

function ProtectedShell() {
  const { role, activeClubId } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isRdoCommandCenter = role === 'rdo' && activeClubId === null

  // Redirect unknown RDO paths to the Command Center
  useEffect(() => {
    if (isRdoCommandCenter && !RDO_PATHS.includes(location.pathname)) {
      navigate('/rdo-dashboard', { replace: true })
    }
  }, [isRdoCommandCenter, location.pathname, navigate])

  if (isRdoCommandCenter) {
    const page = location.pathname === '/rdo-dashboard/player-pool'
      ? <RfcPlayerPool />
      : <RDODashboard />

    return (
      <RDOLayout
        activePath={location.pathname}
        onNavigate={(path) => navigate(path)}
      >
        {page}
      </RDOLayout>
    )
  }

  // Coach or RDO with an active club — render the coach layout
  return <Layout key={activeClubId ?? 'no-club'} />
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <BrandInjector />
          <Routes>

            {/* Public — no layout */}
            <Route path="/login" element={<Login />} />
            <Route path="/availability/:token" element={<AvailabilityForm />} />

            {/* Protected — ProtectedShell selects layout based on role */}
            <Route
              element={
                <ProtectedRoute>
                  <ProtectedShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/roster" replace />} />

              <Route path="roster" element={<Roster />} />

              <Route path="depth" element={<DepthChart />} />
              <Route path="depth-chart" element={<DepthChart />} />

              <Route path="board" element={<Board />} />

              <Route path="weeks" element={<Weeks />} />

              <Route path="results" element={<Results />} />
              <Route path="results/:weekId" element={<ResultDetail />} />

              <Route path="grid" element={<Grid />} />
              <Route path="attendance" element={<Attendance />} />

              <Route path="club-settings" element={<ClubSettings />} />

              {/* Redirect coaches/impersonating-RDOs away from the RDO route.
                  RDOs in Command Center mode never reach this element because
                  ProtectedShell renders without an Outlet in that state. */}
              <Route path="rdo-dashboard" element={<Navigate to="/roster" replace />} />

              {/* Legacy redirects */}
              <Route path="players" element={<Navigate to="/roster" replace />} />

              <Route path="*" element={<Navigate to="/roster" replace />} />
            </Route>

          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
