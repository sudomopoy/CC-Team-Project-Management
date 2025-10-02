import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Link } from 'react-router-dom'
import { useToast } from '../ui/Toast'
import { extractErrorMessage } from '../lib/errors'
import ProjectSelector from '../components/ProjectSelector'
import { useProject } from '../context/ProjectContext'
import InstallBanner from '../components/InstallBanner'

function Minutes({ value }) {
  const h = Math.floor(value/60)
  const m = value%60
  return <span>{h}h {m}m</span>
}

export default function EmployeePage() {
  const [tasks, setTasks] = useState([])
  const [entries, setEntries] = useState([])
  const [income, setIncome] = useState(null)
  const monthLabel = useMemo(() => {
    if (!income) return ''
    const m = String(income.month || '')
    const d = dayjs(`${income.year}-${m.padStart(2,'0')}-01`)
    return d.isValid() ? d.format('MMMM') : ''
  }, [income])
  const [form, setForm] = useState({ task: '', date: dayjs().format('YYYY-MM-DD'), start_time: '09:00', end_time: '10:00', short_description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const { notify } = useToast()
  const { user } = useAuth()
  const { current: projectId } = useProject()
  const todayStr = dayjs().format('YYYY-MM-DD')
  const yesterdayStr = dayjs().subtract(1,'day').format('YYYY-MM-DD')
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
    const [tRes, eRes, incomeRes] = await Promise.all([
      api.get('/api/tasks/', { params: projectId ? { project: projectId } : {} }),
      api.get('/api/time-entries/', { params: { project: projectId, date_from: dayjs().subtract(1,'day').format('YYYY-MM-DD'), date_to: dayjs().format('YYYY-MM-DD') } }),
      api.get('/api/me/income/'),
    ])
    setTasks(tRes.data)
    setEntries(eRes.data)
    setIncome(incomeRes.data)
  }

  useEffect(() => { load() }, [projectId])

  

  
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
      if (!(form.date === todayStr || form.date === yesterdayStr)) {
        const msg = 'Date must be today or yesterday'
        setFieldErrors(prev => ({ ...prev, date: msg }))
        notify(msg, { type: 'error' })
        return
      }
      await api.post('/api/time-entries/', {
        task: form.task || null,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        short_description: form.short_description || null,
        source: 'manual',
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
          source: 'timer',
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
          source: 'timer',
        })
        await api.post('/api/time-entries/', {
          task: timer.task,
          date: now.format('YYYY-MM-DD'),
          start_time: startOfNow.format('HH:mm'),
          end_time: now.format('HH:mm'),
          short_description: timer.short_description || null,
          source: 'timer',
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

  const canDelete = (entry) => {
    const d = dayjs(entry.date)
    const today = dayjs().startOf('day')
    const yesterday = dayjs().subtract(1,'day').startOf('day')
    return d.isSame(today, 'day') || d.isSame(yesterday, 'day')
  }

  const deleteEntry = async (entryId) => {
    try {
      await api.delete(`/api/time-entries/${entryId}/`)
      notify('Entry deleted', { type: 'success' })
      await load()
    } catch (err) {
      const msg = extractErrorMessage(err, 'Delete failed')
      notify(msg, { type: 'error' })
    }
  }

  return (
    <div className="p-0 pb-4 space-y-4 max-w-2xl mx-auto">
      <InstallBanner />
      <div className="p-3 sm:p-4">
      <header className="flex flex-col gap-2 sm:grid sm:grid-cols-3 sm:items-center">
        <h1 className="text-lg sm:text-xl font-bold sm:justify-self-start text-center sm:text-left"><span className="text-brand-gradient">CC Team</span> · ⏱️</h1>
        <div className="sm:justify-self-center order-3 sm:order-none"><ProjectSelector /></div>
        {user?.is_staff || user?.is_superuser ? (
          <div className="sm:justify-self-end order-2 sm:order-none text-center sm:text-right">
            <Link to="/admin" className="text-sm text-blue-700">Admin</Link>
          </div>
        ) : (
          <div className="sm:justify-self-end order-2 sm:order-none" />
        )}
      </header>
      {/* Quick Timer on top */}
      <section className="card space-y-3">
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <h2 className="font-semibold">Quick Timer</h2>
        <div>
          <label className="block text-sm mb-1">Task</label>
          <select className={`w-full rounded-xl border p-2 ${fieldErrors.task ? 'border-red-500' : ''}`} name="task" value={form.task} onChange={onChange}>
            <option value="">Select task</option>
            {tasks.filter(t => !t.is_deleted).map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          {fieldErrors.task && <div className="text-xs text-red-600 mt-1">{fieldErrors.task}</div>}
        </div>
        <div>
          <label className="block text-sm mb-1">Description (optional)</label>
          <textarea name="short_description" rows={2} className="w-full rounded-xl border p-2" value={form.short_description} onChange={onChange} />
        </div>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {!timer && (
            <button type="button" className="btn btn-primary btn-lg" onClick={startTimer} disabled={loading}>Start</button>
          )}
          {timer && (
            <>
              <button type="button" className="btn btn-primary btn-lg" onClick={stopTimer} disabled={loading}>Stop</button>
              <button type="button" className="btn btn-secondary btn-lg" onClick={cancelTimer} disabled={loading}>Reset</button>
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
            {tasks.filter(t => !t.is_deleted).map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          {fieldErrors.task && <div className="text-xs text-red-600 mt-1">{fieldErrors.task}</div>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Date</label>
            <input type="date" name="date" className={`w-full rounded-xl border p-2 ${fieldErrors.date ? 'border-red-500' : ''}`} value={form.date} min={yesterdayStr} max={todayStr} onChange={onChange} />
            {fieldErrors.date && <div className="text-xs text-red-600 mt-1">{fieldErrors.date}</div>}
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
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button className="btn btn-primary btn-lg" disabled={loading}>{loading ? 'Saving...' : 'Submit'}</button>
        </div>
      </form>

      <section className="space-y-2">
        {income && (
          <div className="rounded-2xl p-[1px]" style={{backgroundImage:'linear-gradient(45deg,#405DE6,#5851DB,#833AB4,#C13584,#E1306C,#FD1D1D)'}}>
            <div className="bg-white rounded-2xl p-4 flex items-center gap-4 justify-between">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white" style={{backgroundImage:'linear-gradient(45deg,#405DE6,#5851DB,#833AB4,#C13584,#E1306C,#FD1D1D)'}} aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3 8V6a2 2 0 0 1 2-2h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="3" y="8" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 13h4a2 2 0 0 0 0-4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="16.5" cy="11" r="1" fill="currentColor"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600">This month ({monthLabel}) balance</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {Math.floor((Number(income.minutes||0))/60)}h {Number(income.minutes||0)%60}m · Hourly rate: {Number(income.hourly_rate_toman||0).toLocaleString('en-US')} Toman
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Total: {Number(income.income_toman||0).toLocaleString('en-US')} · Paid: {Number(income.paid_toman||0).toLocaleString('en-US')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{Number(income.outstanding_toman||0).toLocaleString('en-US')}</div>
                <div className="text-xs text-gray-500">Toman</div>
              </div>
            </div>
          </div>
        )}
        <h2 className="font-semibold">Recent Entries</h2>
        {entries.map(e => (
          <div key={e.id} className="card">
            <div className="flex items-center justify-between">
              <div className="text-sm">{e.task_title_snapshot}</div>
              <div className="text-sm"><Minutes value={e.duration_minutes} /></div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="text-xs text-gray-600">{e.date} • {e.start_time}–{e.end_time}</div>
              <button className="btn btn-danger px-3 py-1 text-xs" onClick={()=>deleteEntry(e.id)} disabled={!canDelete(e)}>Delete</button>
            </div>
            {e.short_description && <div className="text-sm mt-1">{e.short_description}</div>}
          </div>
        ))}
      </section>
      </div>
    </div>
  )
}



