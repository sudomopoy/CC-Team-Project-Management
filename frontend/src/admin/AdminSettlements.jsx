import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function AdminSettlements(){
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [employee, setEmployee] = useState('')
  const [employees, setEmployees] = useState([])
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')

  const load = async () => {
    const params = {}
    if (employee) params.employee = employee
    if (year) params.year = year
    if (month) params.month = month
    const [sRes, eRes] = await Promise.all([
      api.get('/api/settlements/', { params }),
      api.get('/api/employees/'),
    ])
    setRows(sRes.data)
    setEmployees(eRes.data)
  }

  useEffect(() => { load() }, [employee, year, month])

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold"><span className="text-brand-gradient">CC Team</span> · Settlements</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/admin" className="text-blue-700 text-sm">Back</Link>
          <button type="button" className="btn btn-secondary px-3 py-1 text-xs" onClick={() => { logout(); navigate('/login', { replace: true }) }}>Logout</button>
        </div>
      </header>

      <div className="card grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">Employee</label>
          <select className="w-full rounded-xl border p-2" value={employee} onChange={e=>setEmployee(e.target.value)}>
            <option value="">All</option>
            {employees.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Year</label>
          <input className="w-full rounded-xl border p-2" value={year} onChange={e=>setYear(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Month</label>
          <input type="number" min={1} max={12} className="w-full rounded-xl border p-2" value={month} onChange={e=>setMonth(e.target.value)} />
        </div>
        <div>
          <button className="btn btn-secondary" onClick={load}>Refresh</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-4">Employee</th>
              <th className="py-2 pr-4">Year</th>
              <th className="py-2 pr-4">Month</th>
              <th className="py-2 pr-4">Amount (toman)</th>
              <th className="py-2 pr-4">Settled at</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="py-2 pr-4">{r.employee_username} (#{r.employee})</td>
                <td className="py-2 pr-4">{r.year}</td>
                <td className="py-2 pr-4">{r.month}</td>
                <td className="py-2 pr-4">{Number(r.amount_toman||0).toLocaleString('en-US')}</td>
                <td className="py-2 pr-4">{new Date(r.settled_at).toLocaleString()}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="py-6 text-center text-gray-500" colSpan={5}>No settlements</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


