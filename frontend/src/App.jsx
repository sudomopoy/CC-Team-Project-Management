import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import LoginPage from './auth/LoginPage'
import EmployeePage from './employee/EmployeePage'
import AdminDashboard from './admin/AdminDashboard'
import AdminEntries from './admin/AdminEntries'
import TasksAdmin from './admin/TasksAdmin'
import AdminProjects from './admin/AdminProjects'
import AdminEmployees from './admin/AdminEmployees'
import AdminSettlements from './admin/AdminSettlements'

function PrivateRoute({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
      <div className="min-h-screen">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><EmployeePage /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
        <Route path="/admin/entries" element={<PrivateRoute><AdminEntries /></PrivateRoute>} />
        <Route path="/admin/tasks" element={<PrivateRoute><TasksAdmin /></PrivateRoute>} />
        <Route path="/admin/projects" element={<PrivateRoute><AdminProjects /></PrivateRoute>} />
          <Route path="/admin/settlements" element={<PrivateRoute><AdminSettlements /></PrivateRoute>} />
          <Route path="/admin/employees" element={<PrivateRoute><AdminEmployees /></PrivateRoute>} />
      </Routes>
    </div>
  )
}



