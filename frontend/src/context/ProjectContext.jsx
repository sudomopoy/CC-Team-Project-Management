import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../auth/AuthContext'

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [current, setCurrent] = useState(() => localStorage.getItem('project_id') || '')
  const { token } = useAuth()

  useEffect(() => {
    if (!token) return
    (async () => {
      try {
        const { data } = await api.get('/api/projects/')
        const active = Array.isArray(data) ? data.filter(p => !p.is_deleted) : []
        setProjects(active)
        const hasCurrent = active.find(p => String(p.id) === String(current))
        if ((!current || !hasCurrent) && active.length) setCurrent(String(active[0].id))
      } catch (e) {
        setProjects([])
      }
    })()
  }, [token])

  useEffect(() => {
    if (current) localStorage.setItem('project_id', String(current))
  }, [current])

  const value = useMemo(() => ({ projects, current, setCurrent }), [projects, current])
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  return useContext(ProjectContext)
}


