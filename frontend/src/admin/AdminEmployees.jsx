import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../ui/Toast'
import { useAuth } from '../auth/AuthContext'

export default function AdminEmployees(){
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [role, setRole] = useState('developer')
  const [rate, setRate] = useState('')
  const [balances, setBalances] = useState({}) // { [userId]: { income_toman, paid_toman, outstanding_toman } }
  const { notify } = useToast()

  const load = async () => {
    const { data } = await api.get('/api/employees/')
    setEmployees(data)
    // fetch balances per employee in parallel
    try {
      const results = await Promise.all(
        data.map(u => api.get(`/api/reports/employee/${u.id}/income`))
      )
      const map = {}
      results.forEach((r, idx) => {
        const u = data[idx]
        map[u.id] = r.data
      })
      setBalances(map)
    } catch (e) {
      // ignore
    }
  }
  useEffect(() => { load() }, [])

  const createEmployee = async () => {
    try {
      const payload = { username, password, email, first_name: firstName, last_name: lastName, phone, employee_code: employeeCode, role, hourly_rate_toman: Number(rate)||0 }
      await api.post('/api/employees/create_user/', payload)
      notify('Employee created', { type: 'success' })
      setUsername(''); setPassword(''); setEmail(''); setFirstName(''); setLastName(''); setPhone(''); setEmployeeCode(''); setRole('developer'); setRate('')
      await load()
    } catch (e) {
      notify('Create failed', { type: 'error' })
    }
  }

  const updateRate = async (id, newRate) => {
    try {
      await api.patch(`/api/employees/${id}/rate/`, { hourly_rate_toman: Number(newRate)||0 })
      notify('Hourly rate updated', { type: 'success' })
    } catch (e) {
      notify('Update failed', { type: 'error' })
    }
  }

  const settle = async (id) => {
    try {
      await api.post(`/api/employees/${id}/settle/`)
      notify('Settled for current month', { type: 'success' })
      await load()
    } catch (e) {
      notify('Settlement failed', { type: 'error' })
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold"><span className="text-brand-gradient">CC Team</span> · Employees</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/admin" className="text-blue-700 text-sm">Back</Link>
          <button type="button" className="btn btn-secondary px-3 py-1 text-xs" onClick={() => { logout(); navigate('/login', { replace: true }) }}>Logout</button>
        </div>
      </header>

      <div className="card space-y-3">
        <h2 className="font-semibold">Create Employee</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="rounded-xl border p-2" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
          <input className="rounded-xl border p-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <input className="rounded-xl border p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="rounded-xl border p-2" placeholder="First name" value={firstName} onChange={e=>setFirstName(e.target.value)} />
          <input className="rounded-xl border p-2" placeholder="Last name" value={lastName} onChange={e=>setLastName(e.target.value)} />
          <input className="rounded-xl border p-2" placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} />
          <input className="rounded-xl border p-2" placeholder="Employee code" value={employeeCode} onChange={e=>setEmployeeCode(e.target.value)} />
          <select className="rounded-xl border p-2" value={role} onChange={e=>setRole(e.target.value)}>
            <option value="page_admin">Page Admin</option>
            <option value="content">Content Creator</option>
            <option value="animator">Animator</option>
            <option value="developer">Developer</option>
            <option value="team_lead">Team Lead</option>
          </select>
          <input className="rounded-xl border p-2" placeholder="Hourly rate (toman)" type="number" value={rate} onChange={e=>setRate(e.target.value)} />
        </div>
        <div>
          <button className="btn btn-primary" onClick={createEmployee} disabled={!username}>Create</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Phone</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Hourly rate (toman)</th>
              <th className="py-2 pr-4">Outstanding (toman)</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(e => (
              <tr key={e.id} className="border-t">
                <td className="py-2 pr-4">{e.username}</td>
                <td className="py-2 pr-4">{e.email || '—'}</td>
                <td className="py-2 pr-4">{e.employee_code || '—'}</td>
                <td className="py-2 pr-4">{e.phone || '—'}</td>
                <td className="py-2 pr-4">{e.role || '—'}</td>
                <td className="py-2 pr-4">
                  <input type="number" className="rounded-xl border p-2 w-40" placeholder="0" defaultValue={e.hourly_rate_toman || 0} onChange={(ev)=>setRate(ev.target.value)} />
                </td>
                <td className="py-2 pr-4">
                  {balances[e.id]?.outstanding_toman != null ? (
                    <span>{Number(balances[e.id].outstanding_toman||0).toLocaleString('en-US')}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-2 pr-4 flex items-center gap-2">
                  <button className="btn btn-primary" onClick={()=>updateRate(e.id, rate || 0)}>Save</button>
                  <button className="btn btn-secondary" onClick={()=>settle(e.id)}>Settle</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


