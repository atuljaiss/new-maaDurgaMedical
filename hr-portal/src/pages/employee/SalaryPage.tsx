import { format } from 'date-fns'
import { Wallet } from 'lucide-react'
import { useProfileContext } from '../../context/ProfileContext'
import { useCurrentSalary } from '../../hooks/useSalaryHistory'
import { useSalaryPayouts } from '../../hooks/usePayroll'
import { MoneyDisplay } from '../../components/shared/MoneyDisplay'
import { SkeletonTable } from '../../components/shared/SkeletonTable'
import { EmptyState } from '../../components/shared/EmptyState'

export function EmployeeSalaryPage() {
  const profile = useProfileContext()
  const { data: currentSalary, isLoading: salaryLoading } = useCurrentSalary(profile.user_id)
  const { data: payouts, isLoading: payoutsLoading } = useSalaryPayouts(profile.user_id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Current Base Salary Card */}
      <div className="card" id="current-salary-card">
        <div className="stat-card-label">Current Base Salary</div>
        {salaryLoading ? (
          <div className="skeleton" style={{ width: '200px', height: '36px', marginTop: '8px' }} />
        ) : currentSalary ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
              <span className="money" style={{ fontSize: '32px' }}>
                <MoneyDisplay amount={currentSalary.amount} />
              </span>
              <span className="text-secondary" style={{ fontSize: '14px' }}>/ month</span>
            </div>
            <div className="text-secondary" style={{ fontSize: '13px', marginTop: '4px' }}>
              Effective from: {format(new Date(currentSalary.effective_from), 'MMM d, yyyy')}
            </div>
          </>
        ) : (
          <div className="text-secondary" style={{ marginTop: '8px' }}>
            No salary record found. Please contact your administrator.
          </div>
        )}
      </div>

      {/* Payout History */}
      <div className="card" id="payout-history-card">
        <h2 className="section-heading mb-4">Payout History</h2>
        {payoutsLoading ? (
          <SkeletonTable rows={5} cols={6} />
        ) : !payouts || payouts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payouts yet"
            description="Your admin will generate your first payout at month end."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" id="payout-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Base Salary</th>
                  <th>Leave Days</th>
                  <th>Excess Days</th>
                  <th>Deduction</th>
                  <th>Net Salary</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td>{format(new Date(payout.month), 'MMM yyyy')}</td>
                    <td><MoneyDisplay amount={payout.base_salary} /></td>
                    <td className="money">{payout.leave_days_in_month}</td>
                    <td>
                      <span className={`money${payout.excess_days_in_month > 0 ? ' money-danger' : ''}`}>
                        {payout.excess_days_in_month}
                      </span>
                    </td>
                    <td>
                      <MoneyDisplay
                        amount={payout.deduction_amount}
                        danger={payout.deduction_amount > 0}
                      />
                    </td>
                    <td><MoneyDisplay amount={payout.net_salary} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
