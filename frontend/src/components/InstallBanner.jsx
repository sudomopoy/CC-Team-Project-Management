import { useEffect, useMemo, useState } from 'react'

const DISMISS_KEY = 'pwa_install_dismissed_at'

export default function InstallBanner(){
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)

  const isStandalone = useMemo(() => (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
  ), [])

  const isIOS = useMemo(() => /iphone|ipad|ipod/i.test(window.navigator.userAgent), [])

  useEffect(() => {
    if (isStandalone) return
    const lastDismiss = Number(localStorage.getItem(DISMISS_KEY) || 0)
    const tooSoon = Date.now() - lastDismiss < 24 * 60 * 60 * 1000
    if (tooSoon) return

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Fallback: on iOS (no beforeinstallprompt), show guidance banner
    if (isIOS) setVisible(true)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [isStandalone, isIOS])

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  }

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  }

  if (!visible) return null
  return (
    <div className="sticky top-0 z-40">
      <div className="bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white" style={{backgroundImage:'linear-gradient(45deg,#405DE6,#5851DB,#833AB4,#C13584,#E1306C,#FD1D1D)'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 3v12m0 0l4-4m-4 4l-4-4M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="text-sm md:text-base">
              {deferredPrompt ? 'Install CC Team Tracker on your device?' : 'Add to Home Screen from your browser menu to install.'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {deferredPrompt && <button className="btn btn-primary btn-lg" onClick={install}>Install</button>}
            <button className="btn btn-secondary btn-lg" onClick={dismiss}>Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  )
}


