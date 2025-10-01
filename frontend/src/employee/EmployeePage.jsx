import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Link } from 'react-router-dom'
import { useToast } from '../ui/Toast'
import { extractErrorMessage } from '../lib/errors'

function Minutes({ value }) {
  const h = Math.floor(value/60)
  const m = value%60
  return <span>{h}h {m}m</span>
}

export default function EmployeePage() {
  const [tasks, setTasks] = useState([])
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState({ task: '', date: dayjs().format('YYYY-MM-DD'), start_time: '09:00', end_time: '10:00', short_description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const { notify } = useToast()
  // Timer mode state persisted in localStorage
  const TIMER_KEY = 'cc_timer_state'
  const [timer, setTimer] = useState(() => {
    try {
      const raw = localStorage.getItem(TIMER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const [elapsed, setElapsed] = useState(0)

  const load = async () => {
    const [tRes, eRes] = await Promise.all([
      api.get('/api/tasks/'),
      api.get('/api/time-entries/?date_from='+dayjs().subtract(1,'day').format('YYYY-MM-DD')+'&date_to='+dayjs().format('YYYY-MM-DD')),
    ])
    setTasks(tRes.data)
    setEntries(eRes.data)
  }

  useEffect(() => { load() }, [])

  

  
  // tick elapsed while timer active
  useEffect(() => {
    if (!timer?.started_at) return
    const tick = () => {
      const start = dayjs(timer.started_at)
      const now = dayjs()
      setElapsed(now.diff(start, 'second'))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [timer])

  const persistTimer = (next) => {
    if (next) localStorage.setItem(TIMER_KEY, JSON.stringify(next))
    else localStorage.removeItem(TIMER_KEY)
    setTimer(next)
  }

  const onChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (!form.task) {
        const msg = 'Task is required'
        setFieldErrors(prev => ({ ...prev, task: msg }))
        notify(msg, { type: 'error' })
        return
      }
      await api.post('/api/time-entries/', {
        task: form.task || null,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        short_description: form.short_description || null,
      })
      await load()
      notify('Entry logged', { type: 'success' })
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to log')
      setError(msg)
      notify(msg, { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Timer controls
  const startTimer = () => {
    setError('')
    if (!form.task) {
      const msg = 'Task is required'
      setFieldErrors(prev => ({ ...prev, task: msg }))
      notify(msg, { type: 'error' })
      return
    }
    const started_at = dayjs().toISOString()
    persistTimer({ task: form.task, short_description: form.short_description || '', started_at })
  }

  const cancelTimer = () => {
    persistTimer(null)
    setElapsed(0)
  }

  const stopTimer = async () => {
    if (!timer?.started_at) return
    setLoading(true)
    setError('')
    try {
      const start = dayjs(timer.started_at)
      const now = dayjs()
      const dayGap = now.startOf('day').diff(start.startOf('day'), 'day')
      if (dayGap > 1) {
        setError('Timer spanned more than yesterday→today. Please log manually.')
        return
      }
      if (start.isSame(now, 'day')) {
        await api.post('/api/time-entries/', {
          task: timer.task,
          date: start.format('YYYY-MM-DD'),
          start_time: start.format('HH:mm'),
          end_time: now.format('HH:mm'),
          short_description: timer.short_description || null,
        })
      } else {
        const endOfStart = start.endOf('day')
        const startOfNow = now.startOf('day')
        await api.post('/api/time-entries/', {
          task: timer.task,
          date: start.format('YYYY-MM-DD'),
          start_time: start.format('HH:mm'),
          end_time: endOfStart.format('HH:mm'),
          short_description: timer.short_description || null,
        })
        await api.post('/api/time-entries/', {
          task: timer.task,
          date: now.format('YYYY-MM-DD'),
          start_time: startOfNow.format('HH:mm'),
          end_time: now.format('HH:mm'),
          short_description: timer.short_description || null,
        })
      }
      persistTimer(null)
      setElapsed(0)
      await load()
      notify('Timer saved', { type: 'success' })
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to stop timer')
      setError(msg)
      notify(msg, { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold"><span className="text-brand-gradient">CC Team</span> · Log Work</h1>
        <Link to="/admin" className="text-sm text-blue-700">Admin</Link>
      </header>
      {/* Quick Timer on top */}
      <section className="card space-y-3">
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <h2 className="font-semibold">Quick Timer</h2>
        <div>
          <label className="block text-sm mb-1">Task</label>
          <select className={`w-full rounded-xl border p-2 ${fieldErrors.task ? 'border-red-500' : ''}`} name="task" value={form.task} onChange={onChange}>
            <option value="">Select task</option>
            {tasks.map(t => <option key={t.id} value={t.id} disabled={t.is_deleted}>{t.title}{t.is_deleted ? ' (deleted)': ''}</option>)}
          </select>
          {fieldErrors.task && <div className="text-xs text-red-600 mt-1">{fieldErrors.task}</div>}
        </div>
        <div>
          <label className="block text-sm mb-1">Description (optional)</label>
          <textarea name="short_description" rows={2} className="w-full rounded-xl border p-2" value={form.short_description} onChange={onChange} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!timer && (
            <button type="button" className="btn btn-primary" onClick={startTimer} disabled={loading}>Start</button>
          )}
          {timer && (
            <>
              <button type="button" className="btn btn-primary" onClick={stopTimer} disabled={loading}>Stop</button>
              <button type="button" className="btn btn-secondary" onClick={cancelTimer} disabled={loading}>Reset</button>
              <div className="text-sm text-gray-700">Elapsed: {Math.floor(elapsed/3600)}h {Math.floor((elapsed%3600)/60)}m {elapsed%60}s</div>
            </>
          )}
        </div>
      </section>

      {/* Manual entry below */}
      <form onSubmit={handleSubmit} className="card space-y-3">
        <h2 className="font-semibold">Manual Entry</h2>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div>
          <label className="block text-sm mb-1">Task</label>
          <select className={`w-full rounded-xl border p-2 ${fieldErrors.task ? 'border-red-500' : ''}`} name="task" value={form.task} onChange={onChange}>
            <option value="">Select task</option>
            {tasks.map(t => <option key={t.id} value={t.id} disabled={t.is_deleted}>{t.title}{t.is_deleted ? ' (deleted)': ''}</option>)}
          </select>
          {fieldErrors.task && <div className="text-xs text-red-600 mt-1">{fieldErrors.task}</div>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Date</label>
            <input type="date" name="date" className="w-full rounded-xl border p-2" value={form.date} onChange={onChange} />
          </div>
          <div>
            <label className="block text-sm mb-1">Start</label>
            <input type="time" name="start_time" className="w-full rounded-xl border p-2" value={form.start_time} onChange={onChange} />
          </div>
          <div>
            <label className="block text-sm mb-1">End</label>
            <input type="time" name="end_time" className="w-full rounded-xl border p-2" value={form.end_time} onChange={onChange} />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Description (optional)</label>
          <textarea name="short_description" rows={2} className="w-full rounded-xl border p-2" value={form.short_description} onChange={onChange} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Submit'}</button>
        </div>
      </form>

      <section className="space-y-2">
        <h2 className="font-semibold">Recent Entries</h2>
        {entries.map(e => (
          <div key={e.id} className="card">
            <div className="flex items-center justify-between">
              <div className="text-sm">{e.task_title_snapshot}</div>
              <div className="text-sm"><Minutes value={e.duration_minutes} /></div>
            </div>
            <div className="text-xs text-gray-600">{e.date} • {e.start_time}–{e.end_time}</div>
            {e.short_description && <div className="text-sm mt-1">{e.short_description}</div>}
          </div>
        ))}
      </section>
    </div>
  )
}



