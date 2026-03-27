import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Players from './pages/Players'
import Roster from './pages/Roster'
import DepthChart from './pages/DepthChart'
import Weeks from './pages/Weeks'
import Archive from './pages/Archive'
import AvailabilityForm from './pages/AvailabilityForm'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes — no auth, no nav */}
          <Route path="/login" element={<Login />} />
          <Route path="/availability/:token" element={<AvailabilityForm />} />

          {/* Protected coach routes — wrapped in Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Default redirect */}
            <Route index element={<Navigate to="/players" replace />} />

            {/* Players section with sub-tabs */}
            <Route path="players" element={<Players />}>
              <Route index element={<Navigate to="/players/roster" replace />} />
              <Route path="roster" element={<Roster />} />
              <Route path="depth-chart" element={<DepthChart />} />
            </Route>

            {/* Weeks */}
            <Route path="weeks" element={<Weeks />} />

            {/* Archive */}
            <Route path="archive" element={<Archive />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
