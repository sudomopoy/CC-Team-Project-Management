import axios from 'axios'

// Prefer runtime-injected base (public/env.js) → build-time env → localhost
const runtimeBase = typeof window !== 'undefined' && window.__API_BASE
const buildBase = import.meta.env.VITE_API_BASE
export const api = axios.create({
  baseURL: 'https://project-management.api.mytokan.ir',
})

// Synchronously set Authorization from localStorage to avoid early 401s
try {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (saved) {
    api.defaults.headers.common['Authorization'] = `Bearer ${saved}`
  }
} catch {}

export function setTokenOnApi(token) {
  if (!token) {
    delete api.defaults.headers.common['Authorization']
  } else {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }
}

// ---- JWT refresh handling ----
let isRefreshing = false
let refreshQueue = []
const refreshApi = axios.create({ baseURL: runtimeBase || buildBase || 'http://localhost:8000' })

function enqueueTokenRefresh(callback) {
  refreshQueue.push(callback)
}

function resolveQueue(newToken) {
  refreshQueue.forEach(cb => cb(newToken))
  refreshQueue = []
}

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error?.response?.status
    const originalRequest = error?.config

    if (status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error)
    }

    // Don't try to refresh on auth endpoints
    const url = String(originalRequest.url || '')
    if (url.includes('/api/auth/token')) {
      return Promise.reject(error)
    }

    const refresh = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null
    if (!refresh) {
      try {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
      } catch {}
      delete api.defaults.headers.common['Authorization']
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        setTimeout(() => { window.location.assign('/login') }, 0)
      }
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (!isRefreshing) {
      isRefreshing = true
      return refreshApi.post('/api/auth/token/refresh/', { refresh })
        .then(res => {
          const newAccess = res?.data?.access
          if (!newAccess) throw new Error('No access token from refresh')
          try { localStorage.setItem('token', newAccess) } catch {}
          setTokenOnApi(newAccess)
          resolveQueue(newAccess)
          return api(originalRequest)
        })
        .catch(err => {
          try {
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
          } catch {}
          delete api.defaults.headers.common['Authorization']
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            setTimeout(() => { window.location.assign('/login') }, 0)
          }
          return Promise.reject(err)
        })
        .finally(() => { isRefreshing = false })
    }

    // If a refresh is already in progress, queue the request
    return new Promise((resolve, reject) => {
      enqueueTokenRefresh((newToken) => {
        try {
          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`
          resolve(api(originalRequest))
        } catch (e) {
          reject(e)
        }
      })
    })
  }
)



