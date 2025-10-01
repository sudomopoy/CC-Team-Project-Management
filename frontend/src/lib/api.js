import axios from 'axios'

// Prefer runtime-injected base (public/env.js) → build-time env → localhost
const runtimeBase = typeof window !== 'undefined' && window.__API_BASE
const buildBase = import.meta.env.VITE_API_BASE
export const api = axios.create({
  baseURL: runtimeBase || buildBase || 'http://localhost:8000',
})

export function setTokenOnApi(token) {
  if (!token) {
    delete api.defaults.headers.common['Authorization']
  } else {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }
}

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      // could route to login
    }
    return Promise.reject(error)
  }
)



