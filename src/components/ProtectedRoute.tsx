import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  children: ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F8F8F8',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid #E5E7EB',
            borderTopColor: '#0062F4',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
