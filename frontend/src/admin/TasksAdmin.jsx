import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Link } from 'react-router-dom'

export default function TasksAdmin(){
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')

  const load = async () => {
    const { data } = await api.get('/api/tasks/')
    setTasks(data)
  }
  useEffect(() => { load() }, [])

  const createTask = async () => {
    await api.post('/api/tasks/', { title })
    setTitle('')
    await load()
  }

  const deleteTask = async (id) => {
    await api.delete(`/api/tasks/${id}/`)
    await load()
  }

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold"><span className="text-brand-gradient">CC Team</span> · Tasks</h1>
        <Link to="/admin" className="text-blue-700 text-sm">Back</Link>
      </header>
      <div className="card flex items-center gap-2">
        <input className="flex-1 rounded-xl border p-2" placeholder="Task title" value={title} onChange={e=>setTitle(e.target.value)} />
        <button className="btn btn-primary" onClick={createTask} disabled={!title.trim()}>Create</button>
      </div>
      <div className="space-y-2">
        {tasks.map(t => (
          <div key={t.id} className="card flex items-center justify-between">
            <div>
              <div className="text-sm">{t.title} {t.is_deleted && <span className="text-xs text-gray-500">(deleted)</span>}</div>
              <div className="text-xs text-gray-500">ID: {t.id}</div>
            </div>
            {!t.is_deleted && (
              <button className="btn btn-secondary" onClick={()=>deleteTask(t.id)}>Soft Delete</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}



