import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthGuard, AdminGuard, EmployeeGuard } from './components/guards'
import { AppShell } from './components/layout/AppShell'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/auth/LoginPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { EmployeeLeavesPage } from './pages/employee/LeavesPage'
import { EmployeeSalaryPage } from './pages/employee/SalaryPage'
import { AdminLeavesPage } from './pages/admin/LeavesPage'
import { AdminPolicyPage } from './pages/admin/PolicyPage'
import { AdminPayrollPage } from './pages/admin/PayrollPage'
import { AdminEmployeesPage } from './pages/admin/EmployeesPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            element: <AdminGuard />,
            children: [
              { path: '/admin/leaves', element: <AdminLeavesPage /> },
              { path: '/admin/payroll', element: <AdminPayrollPage /> },
              { path: '/admin/policy', element: <AdminPolicyPage /> },
              { path: '/admin/employees', element: <AdminEmployeesPage /> },
            ],
          },
          {
            element: <EmployeeGuard />,
            children: [
              { path: '/employee/leaves', element: <EmployeeLeavesPage /> },
              { path: '/employee/salary', element: <EmployeeSalaryPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
