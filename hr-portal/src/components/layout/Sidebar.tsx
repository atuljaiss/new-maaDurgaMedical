import { NavLink, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Users,
  Wallet,
  Settings,
  LogOut,
  ShieldPlus,
  FileText,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useProfileContext } from '../../context/ProfileContext'
import { getInitials } from '../../lib/utils'

const adminLinks = [
  { to: '/admin/leaves', icon: CalendarDays, label: 'Leave Requests' },
  { to: '/admin/employees', icon: Users, label: 'Employees' },
  { to: '/admin/payroll', icon: Wallet, label: 'Payroll' },
  { to: '/admin/policy', icon: Settings, label: 'Policy' },
]

const employeeLinks = [
  { to: '/employee/leaves', icon: FileText, label: 'My Leaves' },
  { to: '/employee/salary', icon: Wallet, label: 'My Salary' },
]

export function Sidebar() {
  const profile = useProfileContext()
  const navigate = useNavigate()
  const links = profile.role === 'admin' ? adminLinks : employeeLinks

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <ShieldPlus size={20} color="white" />
        </div>
        <span className="sidebar-logo-text">NEW MAA DURGA MEDICAL</span>
      </div>

      <nav className="sidebar-nav">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' active' : ''}`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {getInitials(profile.full_name)}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{profile.full_name}</div>
            <div className="sidebar-user-role">{profile.role}</div>
          </div>
        </div>
        <button className="sidebar-signout" onClick={handleSignOut} id="btn-signout">
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
