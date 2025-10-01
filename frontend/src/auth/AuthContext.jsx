import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { api, setTokenOnApi } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)

  useEffect(() => {
    setTokenOnApi(token)
  }, [token])

  const login = async (username, password) => {
    const { data } = await api.post('/api/auth/token/', { username, password })
    const access = data.access
    setToken(access)
    localStorage.setItem('token', access)
    setUser({ username })
  }

  const logout = () => {
    setToken('')
    localStorage.removeItem('token')
    setUser(null)
  }

  const value = useMemo(() => ({ token, user, login, logout }), [token, user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}



