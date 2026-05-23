import { Navigate, Outlet } from 'react-router-dom'
import { useProfileContext } from '../../context/ProfileContext'

export function AdminGuard() {
  const profile = useProfileContext()

  if (profile.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
