import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Link } from 'react-router-dom'

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

  const load = async () => {
    const [tRes, eRes] = await Promise.all([
      api.get('/api/tasks/'),
      api.get('/api/time-entries/?date_from='+dayjs().subtract(1,'day').format('YYYY-MM-DD')+'&date_to='+dayjs().format('YYYY-MM-DD')),
    ])
    setTasks(tRes.data)
    setEntries(eRes.data)
  }

  useEffect(() => { load() }, [])

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/time-entries/', {
        task: form.task || null,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        short_description: form.short_description || null,
      })
      await load()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to log')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Log Work</h1>
        <Link to="/admin" className="text-sm text-blue-700">Admin</Link>
      </header>
      <form onSubmit={handleSubmit} className="card space-y-3">
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div>
          <label className="block text-sm mb-1">Task</label>
          <select className="w-full rounded-xl border p-2" name="task" value={form.task} onChange={onChange}>
            <option value="">Select task</option>
            {tasks.map(t => <option key={t.id} value={t.id} disabled={t.is_deleted}>{t.title}{t.is_deleted ? ' (deleted)': ''}</option>)}
          </select>
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
        <button className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Log Work'}</button>
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



