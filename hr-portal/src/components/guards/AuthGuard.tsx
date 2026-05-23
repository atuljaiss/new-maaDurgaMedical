import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { ProfileContext } from '../../context/ProfileContext'

export function AuthGuard() {
  const { session, loading: authLoading } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile(session?.user.id)

  if (authLoading || profileLoading) {
    return <div className="full-page-spinner" />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!profile || !profile.is_active) {
    return <Navigate to="/unauthorized" replace />
  }

  return (
    <ProfileContext.Provider value={profile}>
      <Outlet />
    </ProfileContext.Provider>
  )
}
