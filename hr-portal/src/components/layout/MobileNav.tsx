import { NavLink } from 'react-router-dom'
import {
  CalendarDays,
  Users,
  Wallet,
  Settings,
  FileText,
} from 'lucide-react'
import { useProfileContext } from '../../context/ProfileContext'

const adminLinks = [
  { to: '/admin/leaves', icon: CalendarDays, label: 'Leaves' },
  { to: '/admin/employees', icon: Users, label: 'Team' },
  { to: '/admin/payroll', icon: Wallet, label: 'Payroll' },
  { to: '/admin/policy', icon: Settings, label: 'Policy' },
]

const employeeLinks = [
  { to: '/employee/leaves', icon: FileText, label: 'Leaves' },
  { to: '/employee/salary', icon: Wallet, label: 'Salary' },
]

export function MobileNav() {
  const profile = useProfileContext()
  const links = profile.role === 'admin' ? adminLinks : employeeLinks

  return (
    <nav className="mobile-nav" id="mobile-nav">
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `mobile-nav-link${isActive ? ' active' : ''}`
          }
        >
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
