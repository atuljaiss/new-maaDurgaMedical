import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useProfileContext } from '../../context/ProfileContext'
import { supabase } from '../../lib/supabaseClient'
import { getInitials } from '../../lib/utils'
interface TopbarProps {
  title: string
  action?: ReactNode
}

export function Topbar({ title, action }: TopbarProps) {
  const profile = useProfileContext()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <header className="topbar" id="topbar">
      <h1 className="topbar-title">{title}</h1>
      <div className="flex items-center gap-3">
        {action && <div>{action}</div>}
        
        <div className="mobile-profile-actions">
          <div className="sidebar-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }} title={profile.full_name}>
            {getInitials(profile.full_name)}
          </div>
          <button 
            className="btn btn-icon btn-ghost text-danger" 
            onClick={handleSignOut} 
            title="Sign Out"
            style={{ border: 'none' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
