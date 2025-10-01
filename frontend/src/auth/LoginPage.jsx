import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useToast } from '../ui/Toast'
import { extractErrorMessage } from '../lib/errors'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { notify } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (!username.trim()) throw new Error('Username is required')
      if (!password.trim()) throw new Error('Password is required')
      await login(username, password)
      notify('Signed in successfully', { type: 'success' })
      navigate('/')
    } catch (err) {
      const msg = extractErrorMessage(err, 'Login failed')
      setError(msg)
      notify(msg, { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">
          <span className="text-brand-gradient">CC Team</span>
        </h1>
        <div className="text-center text-sm text-gray-600">Sign in</div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div>
          <label className="block text-sm mb-1">Username</label>
          <input className="w-full rounded-xl border p-2" value={username} onChange={(e)=>setUsername(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input type="password" className="w-full rounded-xl border p-2" value={password} onChange={(e)=>setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary w-full" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </div>
  )
}



