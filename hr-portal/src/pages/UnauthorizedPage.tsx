import { useNavigate } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export function UnauthorizedPage() {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="login-page" id="unauthorized-page">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <ShieldX size={48} color="#EF4444" />
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Access Denied</h1>
          <p className="text-secondary" style={{ fontSize: '14px' }}>
            Your account is inactive or you do not have permission to access this page.
            Please contact your administrator.
          </p>
          <button className="btn btn-primary" onClick={handleSignOut} id="btn-signout-unauthorized">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
