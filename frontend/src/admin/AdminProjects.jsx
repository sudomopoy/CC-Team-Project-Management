import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../ui/Toast'
import { useAuth } from '../auth/AuthContext'

export default function AdminProjects(){
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [name, setName] = useState('')
  const { notify } = useToast()
  const [selectedId, setSelectedId] = useState('')
  const [memberships, setMemberships] = useState([])
  const [employees, setEmployees] = useState([])
  const [newMemberId, setNewMemberId] = useState('')

  const load = async () => {
    const { data } = await api.get('/api/projects/')
    setProjects(data)
  }
  useEffect(() => { load() }, [])

  const createProject = async () => {
    try {
      await api.post('/api/projects/', { name })
      setName('')
      await load()
      notify('Project created', { type: 'success' })
    } catch (err) {
      notify('Create failed', { type: 'error' })
    }
  }

  const deleteProject = async (id) => {
    try {
      await api.delete(`/api/projects/${id}/`)
      await load()
      notify('Project archived', { type: 'success' })
    } catch (err) {
      notify('Delete failed', { type: 'error' })
    }
  }

  const loadMembers = async (projectId) => {
    const [mRes, eRes] = await Promise.all([
      api.get(`/api/project-memberships/?project=${projectId}`),
      api.get('/api/employees/'),
    ])
    setMemberships(mRes.data)
    setEmployees(eRes.data)
    setNewMemberId('')
  }

  const addMember = async () => {
    if (!selectedId || !newMemberId) return
    try {
      await api.post('/api/project-memberships/', { project: Number(selectedId), user: Number(newMemberId) })
      await loadMembers(selectedId)
      notify('Member added', { type: 'success' })
    } catch (e) {
      notify('Add failed', { type: 'error' })
    }
  }

  const removeMember = async (membershipId) => {
    try {
      await api.delete(`/api/project-memberships/${membershipId}/`)
      await loadMembers(selectedId)
      notify('Member removed', { type: 'success' })
    } catch (e) {
      notify('Remove failed', { type: 'error' })
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold"><span className="text-brand-gradient">CC Team</span> · Projects</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/admin" className="text-blue-700 text-sm">Back</Link>
          <button type="button" className="btn btn-secondary px-3 py-1 text-xs" onClick={() => { logout(); navigate('/login', { replace: true }) }}>Logout</button>
        </div>
      </header>

      <div className="card flex items-center gap-2">
        <input className="flex-1 rounded-xl border p-2" placeholder="Project name" value={name} onChange={e=>setName(e.target.value)} />
        <button className="btn btn-primary" onClick={createProject} disabled={!name.trim()}>Create</button>
      </div>

      <div className="space-y-2">
        {projects.map(p => (
          <div key={p.id} className="card flex items-center justify-between">
            <div>
              <div className="text-sm">{p.name} {p.is_deleted && <span className="text-xs text-gray-500">(deleted)</span>}</div>
              <div className="text-xs text-gray-500">ID: {p.id}</div>
            </div>
            {!p.is_deleted && (
              <div className="flex items-center gap-2">
                <button className="btn btn-secondary" onClick={()=>{ setSelectedId(String(p.id)); loadMembers(p.id) }}>Manage</button>
                <button className="btn btn-secondary" onClick={()=>deleteProject(p.id)}>Archive</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedId && (
        <div className="card space-y-3">
          <h2 className="font-semibold">Members for Project #{selectedId}</h2>
          <div className="flex items-center gap-2">
            <select className="rounded-xl border p-2" value={newMemberId} onChange={e=>setNewMemberId(e.target.value)}>
              <option value="">Select employee</option>
              {employees.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
            <button className="btn btn-primary" onClick={addMember} disabled={!newMemberId}>Add</button>
            <button className="btn btn-secondary" onClick={()=>setSelectedId('')}>Close</button>
          </div>
          <div className="space-y-2">
            {memberships.map(m => (
              <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-2">
                <div className="text-sm">User #{m.user}</div>
                <button className="btn btn-danger px-3 py-1 text-xs" onClick={()=>removeMember(m.id)}>Remove</button>
              </div>
            ))}
            {!memberships.length && <div className="text-sm text-gray-500">No members</div>}
          </div>
        </div>
      )}
    </div>
  )
}


