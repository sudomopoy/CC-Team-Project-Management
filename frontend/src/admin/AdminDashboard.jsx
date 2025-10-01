import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Link } from 'react-router-dom'
import ProjectSelector from '../components/ProjectSelector'
import { useProject } from '../context/ProjectContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts'

function minutesToHours(minutes){ return Math.round((minutes/60)*100)/100 }

export default function AdminDashboard(){
  const { current: projectId } = useProject()
  const [employees, setEmployees] = useState([])
  const [selected, setSelected] = useState('')
  const [daily, setDaily] = useState([])
  const [weekly, setWeekly] = useState([])
  const [monthly, setMonthly] = useState([])
  const [pie, setPie] = useState([])
  const [range, setRange] = useState({ start: new Date(new Date().setDate(new Date().getDate()-6)).toISOString().slice(0,10), end: new Date().toISOString().slice(0,10) })
  const [ym, setYm] = useState({ year: new Date().getFullYear(), month: new Date().getMonth()+1 })

  useEffect(() => { (async () => {
    const { data } = await api.get('/api/employees/')
    setEmployees(data)
    if (data.length) setSelected(String(data[0].id))
  })() }, [])

  useEffect(() => { if(!selected) return; (async () => {
    const base = projectId ? { project: projectId } : {}
    const [d,w,m,p] = await Promise.all([
      api.get(`/api/reports/employee/${selected}/daily`, { params: { ...range, ...base } }),
      api.get(`/api/reports/employee/${selected}/weekly`, { params: { ...range, ...base } }),
      api.get(`/api/reports/employee/${selected}/monthly`, { params: { ...range, ...base } }),
      api.get(`/api/reports/employee/${selected}/pie`, { params: { ...ym, ...base } }),
    ])
    setDaily(d.data.series)
    setWeekly(w.data.series)
    setMonthly(m.data.series)
    setPie(p.data.series)
  })() }, [selected, JSON.stringify(range), JSON.stringify(ym), projectId])

  const colors = ['#60a5fa','#34d399','#f472b6','#f59e0b','#a78bfa','#f87171']

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold"><span className="text-brand-gradient">CC Team</span> · Admin Dashboard</h1>
        <div className="flex items-center gap-3 text-sm">
          <ProjectSelector />
          <Link to="/" className="text-blue-700">Employee</Link>
          <Link to="/admin/projects" className="text-blue-700">Projects</Link>
          <Link to="/admin/entries" className="text-blue-700">Entries</Link>
          <Link to="/admin/settlements" className="text-blue-700">Settlements</Link>
          <Link to="/admin/employees" className="text-blue-700">Employees</Link>
          <Link to="/admin/tasks" className="text-blue-700">Tasks</Link>
        </div>
      </header>

      <div className="card space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">Employee</label>
            <select className="w-full rounded-xl border p-2" value={selected} onChange={e=>setSelected(e.target.value)}>
              {employees.map(e => <option key={e.id} value={e.id}>{e.username}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Start</label>
            <input type="date" className="w-full rounded-xl border p-2" value={range.start} onChange={e=>setRange(r=>({...r,start:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm mb-1">End</label>
            <input type="date" className="w-full rounded-xl border p-2" value={range.end} onChange={e=>setRange(r=>({...r,end:e.target.value}))} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-2">Daily Hours</h3>
          <LineChart width={500} height={250} data={daily.map(d=>({ ...d, hours: minutesToHours(d.minutes) }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="hours" stroke="#2563eb" />
          </LineChart>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">Weekly Hours</h3>
          <BarChart width={500} height={250} data={weekly.map(d=>({ name:`${d.year}-W${d.week}`, hours: minutesToHours(d.minutes) }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="hours" fill="#10b981" />
          </BarChart>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">Monthly Hours</h3>
          <LineChart width={500} height={250} data={monthly.map(d=>({ name:`${d.year}-${String(d.month).padStart(2,'0')}`, hours: minutesToHours(d.minutes) }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="hours" stroke="#f59e0b" />
          </LineChart>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">Monthly Pie</h3>
          <div className="flex items-center gap-3 mb-2">
            <input type="number" className="rounded-xl border p-2 w-24" value={ym.year} onChange={e=>setYm(y=>({...y,year: Number(e.target.value)}))} />
            <input type="number" className="rounded-xl border p-2 w-20" min={1} max={12} value={ym.month} onChange={e=>setYm(y=>({...y,month: Number(e.target.value)}))} />
          </div>
          <PieChart width={500} height={250}>
            <Pie data={pie} dataKey="minutes" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>{pie.map((entry, idx) => <Cell key={idx} fill={colors[idx%colors.length]} />)}</Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
      </div>
    </div>
  )
}



