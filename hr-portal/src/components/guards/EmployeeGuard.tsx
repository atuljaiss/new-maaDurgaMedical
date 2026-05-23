import { Navigate, Outlet } from 'react-router-dom'
import { useProfileContext } from '../../context/ProfileContext'

export function EmployeeGuard() {
  const profile = useProfileContext()

  if (profile.role !== 'employee') {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
