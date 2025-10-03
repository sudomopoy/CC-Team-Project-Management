import { useProject } from '../context/ProjectContext'
import { Skeleton } from './Skeleton'

export default function ProjectSelector(){
  const { projects, current, setCurrent, loading } = useProject()
  const hasProjects = Array.isArray(projects) && projects.length > 0
  return (
    <div className="w-full sm:w-auto flex items-center gap-3">
      <span className="text-brand-gradient font-semibold flex items-center gap-1 text-base md:text-lg" aria-hidden>
        <span>📁</span>
        <span>Project</span>
      </span>
      {loading ? (
        <Skeleton className="w-56 h-10 rounded-2xl" />
      ) : (
        <select
          aria-label="Select project"
          className="w-full sm:w-auto rounded-2xl border-2 px-4 py-2 text-base md:text-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          value={current}
          onChange={e=>setCurrent(e.target.value)}
          disabled={!hasProjects}
        >
          {!hasProjects && <option value="">No active projects</option>}
          {hasProjects && projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}
    </div>
  )
}


