import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

function WarningIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-full h-full"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    </svg>
  )
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Surface render failures in the console so they're debuggable.
    // A real app would forward this to Sentry / LogRocket / etc.
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
          <div className="w-16 h-16 mb-4 text-yellow-500">
            <WarningIcon />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops, something went wrong</h1>
          <p className="text-gray-600 mb-6 text-center">The app encountered an unexpected error.</p>
          <button
            onClick={this.handleReload}
            className="px-6 py-3 bg-brand-primary text-white font-medium rounded-lg hover:bg-brand-accent transition"
          >
            Reload App
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
