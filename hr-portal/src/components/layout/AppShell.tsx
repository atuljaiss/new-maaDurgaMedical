import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'

const titleMap: Record<string, string> = {
  '/admin/leaves': 'Leave Requests',
  '/admin/employees': 'Employees',
  '/admin/payroll': 'Payroll',
  '/admin/policy': 'Leave Policy',
  '/employee/leaves': 'My Leaves',
  '/employee/salary': 'My Salary',
}

export function AppShell() {
  const location = useLocation()
  const title = titleMap[location.pathname] || 'NEW MAA DURGA MEDICAL'

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-wrapper">
        <Topbar title={title} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
