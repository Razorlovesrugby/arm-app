// src/App.tsx
// Phase 17.1 — RDO conditional routing added

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Roster from './pages/Roster'
import DepthChart from './pages/DepthChart'
import Board from './pages/Board'
import Weeks from './pages/Weeks'
import Archive from './pages/Archive'
import AvailabilityForm from './pages/AvailabilityForm'
import RDODashboard from './pages/RDODashboard'

// Wrapper component for conditional routing based on role and activeClubId
function AppRoutes() {
  const { role, activeClubId } = useAuth()

  // RDO with no active club → RDO Command Center
  if (role === 'rdo' && activeClubId === null) {
    return (
      <Routes>
        <Route path="/rdo" element={<RDODashboard />} />
        <Route path="*" element={<Navigate to="/rdo" replace />} />
      </Routes>
    )
  }

  // Everyone else (coaches or RDOs impersonating a club) → Standard Layout
  return (
    <Routes>

      {/* Public — no layout */}
      <Route path="/login" element={<Login />} />
      <Route path="/availability/:token" element={<AvailabilityForm />} />

      {/* Protected — inside Layout (bottom nav) */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Default redirect */}
        <Route index element={<Navigate to="/roster" replace />} />

        {/* Tab 1 — Roster */}
        <Route path="roster" element={<Roster />} />

        {/* Depth Chart — sub-route of roster */}
        <Route path="depth-chart" element={<DepthChart />} />

        {/* Tab 2 — Board */}
        <Route path="board" element={<Board />} />

        {/* Tab 3 — Weeks */}
        <Route path="weeks" element={<Weeks />} />

        {/* Archive */}
        <Route path="archive" element={<Archive />} />

        {/* Legacy redirects */}
        <Route path="players" element={<Navigate to="/roster" replace />} />
        <Route path="*" element={<Navigate to="/roster" replace />} />
      </Route>

    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
