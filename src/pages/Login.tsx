import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useClubSettings } from '../hooks/useClubSettings'

export default function Login() {
  const { signIn, session } = useAuth()
  const { clubSettings, loading: clubLoading } = useClubSettings()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Already logged in
  if (session) {
    navigate('/', { replace: true })
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError('Incorrect email or password.')
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8F8F8',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '32px 24px',
          border: '1px solid #E5E7EB',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src="/icons/short-form-logo.png"
            alt="ARM Logo" 
            style={{ 
              maxHeight: '56px', 
              width: 'auto', 
              objectFit: 'contain',
              marginBottom: '16px',
            }} 
          />
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: '0 0 4px' }}>
            {clubLoading ? 'Loading...' : (clubSettings?.club_name || 'ARM')}
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
            Coach login
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div
            style={{
              background: '#FEE2E2',
              color: '#B91C1C',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              marginBottom: '20px',
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="email"
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '6px' }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '16px',
                color: '#111827',
                outline: 'none',
                background: '#FFFFFF',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#0062F4')}
              onBlur={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="password"
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '6px' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '16px',
                color: '#111827',
                outline: 'none',
                background: '#FFFFFF',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#0062F4')}
              onBlur={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              minHeight: '48px',
              background: loading ? '#3B82F6' : '#0062F4',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
