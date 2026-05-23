import { useState } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, Check } from 'lucide-react'
import { usePayrollPreview, useCommitPayroll } from '../../hooks/usePayroll'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay'
import { SkeletonTable } from '../../components/shared/SkeletonTable'
import type { PayrollPreview } from '../../types/database.types'

export function AdminPayrollPage() {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [preview, setPreview] = useState<PayrollPreview[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [commitSuccess, setCommitSuccess] = useState('')
  const [error, setError] = useState('')

  const payrollPreview = usePayrollPreview()
  const commitPayroll = useCommitPayroll()

  const monthDate = `${selectedMonth}-01`

  const handlePreview = async () => {
    setError('')
    setCommitSuccess('')
    setShowPreview(false)

    try {
      const data = await payrollPreview.mutateAsync(monthDate)
      setPreview(data)
      setShowPreview(true)
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to generate preview.')
    }
  }

  const handleCommit = async () => {
    setError('')
    setCommitSuccess('')

    try {
      await commitPayroll.mutateAsync(monthDate)
      setCommitSuccess(`✓ Payroll generated for ${format(new Date(monthDate), 'MMMM yyyy')}.`)
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to generate payroll.')
    }
  }

  const hasNoSalaryRecord = preview.some((p) => !p.has_salary_record)

  return (
    <div>
      <div className="card mb-6">
        <h2 className="section-heading mb-4">Generate Payroll</h2>

        <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="payroll-month">Month</label>
            <input
              id="payroll-month"
              type="month"
              className="form-input"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ maxWidth: '200px' }}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handlePreview}
            disabled={payrollPreview.isPending}
            id="btn-preview-payroll"
            style={{ marginTop: '20px' }}
          >
            {payrollPreview.isPending ? 'Loading…' : 'Preview'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {payrollPreview.isPending && (
        <div className="card">
          <SkeletonTable rows={5} cols={7} />
        </div>
      )}

      {showPreview && !payrollPreview.isPending && (
        <div className="card">
          {hasNoSalaryRecord && (
            <div className="alert alert-warning mb-4">
              <AlertTriangle size={16} />
              <span>
                {preview.filter((p) => !p.has_salary_record).length} employee(s) have no salary record — they will show ₹0.
              </span>
            </div>
          )}

          {preview.length === 0 ? (
            <div className="text-secondary" style={{ padding: '24px', textAlign: 'center' }}>
              No active employees found for this month.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" id="payroll-preview-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Base Salary</th>
                      <th>Leave Days</th>
                      <th>Excess</th>
                      <th>Deduction</th>
                      <th>Net Salary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row) => (
                      <tr key={row.user_id}>
                        <td>{row.full_name}</td>
                        <td><MoneyDisplay amount={row.base_salary} /></td>
                        <td className="money">{row.leave_days_in_month}</td>
                        <td>
                          <span className={`money${row.excess_days > 0 ? ' money-danger' : ''}`}>
                            {row.excess_days}
                          </span>
                        </td>
                        <td>
                          <MoneyDisplay
                            amount={row.deduction_amount}
                            danger={row.deduction_amount > 0}
                          />
                        </td>
                        <td><MoneyDisplay amount={row.net_salary} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '12px', alignItems: 'center' }}>
                {commitSuccess && (
                  <div className="alert alert-success" style={{ flex: 1 }}>
                    <Check size={16} />
                    {commitSuccess}
                  </div>
                )}
                <button
                  className="btn btn-primary"
                  onClick={handleCommit}
                  disabled={commitPayroll.isPending}
                  id="btn-commit-payroll"
                >
                  {commitPayroll.isPending ? 'Generating…' : 'Generate Payroll'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
