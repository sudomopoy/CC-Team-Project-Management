import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import LoginPage from './auth/LoginPage'
import EmployeePage from './employee/EmployeePage'
import AdminDashboard from './admin/AdminDashboard'
import TasksAdmin from './admin/TasksAdmin'

function PrivateRoute({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><EmployeePage /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/tasks" element={<PrivateRoute><TasksAdmin /></PrivateRoute>} />
        </Routes>
      </div>
    </AuthProvider>
  )
}



