import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import { Link } from 'react-router-dom'
import ProjectSelector from '../components/ProjectSelector'
import { useProject } from '../context/ProjectContext'

function Minutes({ value }) {
  const h = Math.floor(value/60); const m = value%60; return <span>{h}h {m}m</span>
}

export default function AdminEntries(){
  const { current: projectId } = useProject()
  const [employees, setEmployees] = useState([])
  const [selected, setSelected] = useState('')
  const [mode, setMode] = useState('day') // day | week | month
  const [start, setStart] = useState(dayjs().format('YYYY-MM-DD'))
  const [entries, setEntries] = useState([])

  useEffect(() => { (async () => {
    const { data } = await api.get('/api/employees/')
    setEmployees(data)
    if (data.length) setSelected(String(data[0].id))
  })() }, [])

  const load = async () => {
    if (!selected) return
    let params = {}
    if (mode === 'day') {
      params = { date_from: start, date_to: start }
    } else if (mode === 'week') {
      const s = dayjs(start).startOf('week')
      const e = dayjs(start).endOf('week')
      params = { date_from: s.format('YYYY-MM-DD'), date_to: e.format('YYYY-MM-DD') }
    } else {
      const s = dayjs(start).startOf('month')
      const e = dayjs(start).endOf('month')
      params = { date_from: s.format('YYYY-MM-DD'), date_to: e.format('YYYY-MM-DD') }
    }
    const { data } = await api.get(`/api/time-entries/?employee=${selected}${projectId ? `&project=${projectId}`:''}`, { params })
    setEntries(data)
  }

  useEffect(() => { load() }, [selected, mode, start])

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold"><span className="text-brand-gradient">CC Team</span> · Entries</h1>
        <div className="flex items-center gap-3 text-sm">
          <ProjectSelector />
          <Link to="/admin" className="text-blue-700">Dashboard</Link>
        </div>
      </header>

      <div className="card grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">Employee</label>
          <select className="w-full rounded-xl border p-2" value={selected} onChange={e=>setSelected(e.target.value)}>
            {employees.map(e => <option key={e.id} value={e.id}>{e.username}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Mode</label>
          <select className="w-full rounded-xl border p-2" value={mode} onChange={e=>setMode(e.target.value)}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Start</label>
          <input type="date" className="w-full rounded-xl border p-2" value={start} onChange={e=>setStart(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Task</th>
                <th className="py-2 pr-4">Start</th>
                <th className="py-2 pr-4">End</th>
                <th className="py-2 pr-4">Duration</th>
                <th className="py-2 pr-4">Description</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-t">
                  <td className="py-2 pr-4 whitespace-nowrap">{e.date}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{e.task_title_snapshot}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{e.start_time}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{e.end_time}</td>
                  <td className="py-2 pr-4 whitespace-nowrap"><Minutes value={e.duration_minutes} /></td>
                  <td className="py-2 pr-4">{e.short_description}</td>
                </tr>
              ))}
              {!entries.length && (
                <tr>
                  <td className="py-6 text-center text-gray-500" colSpan={6}>No entries</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


