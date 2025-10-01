import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { api, setTokenOnApi } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)

  useEffect(() => {
    setTokenOnApi(token)
  }, [token])

  // Fetch profile on token availability (support page reloads)
  useEffect(() => {
    if (!token) return
    (async () => {
      try {
        const me = await api.get('/api/me/profile/')
        setUser(me.data)
      } catch {
        // ignore
      }
    })()
  }, [token])

  const login = async (username, password) => {
    const { data } = await api.post('/api/auth/token/', { username, password })
    const access = data.access
    const refresh = data.refresh
    setToken(access)
    localStorage.setItem('token', access)
    if (refresh) {
      try { localStorage.setItem('refreshToken', refresh) } catch {}
    }
    try {
      const me = await api.get('/api/me/profile/')
      setUser(me.data)
    } catch {
      setUser({ username })
    }
  }

  const logout = () => {
    setToken('')
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }

  const value = useMemo(() => ({ token, user, login, logout }), [token, user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}



