import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  )
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSBanner, setShowIOSBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Don't show if already installed
    if (isInStandaloneMode()) return

    // Don't show if previously dismissed this session
    if (sessionStorage.getItem('arm-install-dismissed')) return

    // Android/Chrome: capture beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS Safari: show manual instructions
    if (isIOS()) {
      setShowIOSBanner(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function handleDismiss() {
    setDismissed(true)
    setDeferredPrompt(null)
    setShowIOSBanner(false)
    sessionStorage.setItem('arm-install-dismissed', '1')
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setDeferredPrompt(null)
    }
  }

  if (dismissed) return null

  // Android/Chrome install banner
  if (deferredPrompt) {
    return (
      <div
        style={{
          background: '#0062F4',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          fontSize: '14px',
        }}
        role="banner"
      >
        <span style={{ flex: 1 }}>
          Add ARM to your home screen for the best experience.
        </span>
        <button
          onClick={handleAndroidInstall}
          style={{
            background: '#FFFFFF',
            color: '#0062F4',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 14px',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: '32px',
          }}
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#FFFFFF',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            minHeight: '32px',
            minWidth: '32px',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>
      </div>
    )
  }

  // iOS Safari manual instructions banner
  if (showIOSBanner) {
    return (
      <div
        style={{
          background: '#E8F0FE',
          color: '#0062F4',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '12px 16px',
          fontSize: '13px',
          lineHeight: '1.4',
        }}
        role="banner"
      >
        <span style={{ flex: 1 }}>
          <strong>Install ARM:</strong> tap the Share button in Safari, then choose{' '}
          <strong>Add to Home Screen</strong>.
        </span>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#0062F4',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            minHeight: '32px',
            minWidth: '32px',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <X size={18} />
        </button>
      </div>
    )
  }

  return null
}
