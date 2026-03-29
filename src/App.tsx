// src/App.tsx
// CP7A.1 — Updated routing: /roster, /board, /weeks + legacy routes preserved
// Board is now a standalone route hosting SelectionBoard

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Roster from './pages/Roster'
import DepthChart from './pages/DepthChart'
import Board from './pages/Board'
import Weeks from './pages/Weeks'
import Archive from './pages/Archive'
import AvailabilityForm from './pages/AvailabilityForm'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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

            {/* Tab 1 — Roster (existing screen, untouched) */}
            <Route path="roster" element={<Roster />} />

            {/* Depth Chart — sub-route of roster (accessible via sub-tabs in Roster) */}
            <Route path="depth-chart" element={<DepthChart />} />

            {/* Tab 2 — Board (new standalone Selection Board) */}
            <Route path="board" element={<Board />} />

            {/* Tab 3 — Weeks (existing screen, Selection Board stripped out) */}
            <Route path="weeks" element={<Weeks />} />

            {/* Archive — preserved route, not in bottom nav until Phase 11 */}
            <Route path="archive" element={<Archive />} />

            {/* Legacy redirects — in case any internal links use old paths */}
            <Route path="players" element={<Navigate to="/roster" replace />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/roster" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
