import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8000',
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



