import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(1)

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter(t => t.id !== id))
  }, [])

  const notify = useCallback((message, options={}) => {
    const id = idRef.current++
    const toast = {
      id,
      message: typeof message === 'string' ? message : String(message),
      type: options.type || 'error',
      duration: options.duration ?? 4000,
    }
    setToasts((list) => [...list, toast])
    if (toast.duration > 0) {
      setTimeout(() => dismiss(id), toast.duration)
    }
    return id
  }, [dismiss])

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-3 right-3 z-50 space-y-2 w-[90%] max-w-sm">
        {toasts.map(t => (
          <div key={t.id} className={`rounded-2xl shadow-lg p-3 text-sm text-white ${t.type === 'success' ? 'bg-green-600' : t.type === 'info' ? 'bg-blue-600' : 'bg-rose-600'}`}>
            <div className="flex items-start gap-3">
              <div className="flex-1">{t.message}</div>
              <button className="opacity-80 hover:opacity-100" onClick={() => dismiss(t.id)}>×</button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}


