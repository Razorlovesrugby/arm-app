// src/App.tsx
// Phase 12.2 — Results, Match Events, ClubSettings added on top of Phase 12.1 sidebar

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Roster from './pages/Roster'
import DepthChart from './pages/DepthChart'
import Board from './pages/Board'
import Weeks from './pages/Weeks'
import Results from './pages/Results'
import ResultDetail from './pages/ResultDetail'
import ClubSettings from './pages/ClubSettings'
import AvailabilityForm from './pages/AvailabilityForm'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Public — no layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/availability/:token" element={<AvailabilityForm />} />

          {/* Protected — inside Layout */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
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

            <Route path="club-settings" element={<ClubSettings />} />

            {/* Legacy redirects */}
            <Route path="players" element={<Navigate to="/roster" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/roster" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
