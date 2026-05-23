import { useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { FileText, Trash2 } from 'lucide-react'
import { useProfileContext } from '../../context/ProfileContext'
import {
  useLeaveRequests,
  useSubmitLeave,
  useLeaveRealtimeSync,
  useDeleteLeave,
} from '../../hooks/useLeaveRequests'
import { useLeavePolicy } from '../../hooks/useLeavePolicy'
import { supabase } from '../../lib/supabaseClient'
import { useQuery } from '@tanstack/react-query'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { SkeletonTable } from '../../components/shared/SkeletonTable'
import { EmptyState } from '../../components/shared/EmptyState'

export function EmployeeLeavesPage() {
  const profile = useProfileContext()
  const { data: leaves, isLoading: leavesLoading } = useLeaveRequests(profile.user_id)
  const { data: policy } = useLeavePolicy()
  const submitLeave = useSubmitLeave()
  const deleteLeave = useDeleteLeave()

  // Realtime sync
  useLeaveRealtimeSync(profile.user_id)

  // Fetch approved leave days this month via RPC
  const currentMonth = format(new Date(), 'yyyy-MM-01')
  const { data: usedDays } = useQuery({
    queryKey: ['leave_days_in_month', profile.user_id, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('approved_leave_days_in_month' as never, {
        p_user_id: profile.user_id,
        p_month: currentMonth,
      } as never)
      if (error) throw error
      return Number(data) || 0
    },
    staleTime: 30_000,
  })

  // Form state
  const [mode, setMode] = useState<'single' | 'range'>('single')
  const [leaveDate, setLeaveDate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [halfDayPart, setHalfDayPart] = useState<'AM' | 'PM'>('AM')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    try {
      if (mode === 'single') {
        if (!leaveDate) {
          setFormError('Please select a date.')
          return
        }
        await submitLeave.mutateAsync({
          user_id: profile.user_id,
          leave_date: leaveDate,
          is_half_day: isHalfDay,
          half_day_part: isHalfDay ? halfDayPart : undefined,
          reason: reason || undefined,
        })
      } else {
        if (!startDate || !endDate) {
          setFormError('Please select start and end dates.')
          return
        }
        await submitLeave.mutateAsync({
          user_id: profile.user_id,
          start_date: startDate,
          end_date: endDate,
          reason: reason || undefined,
        })
      }

      setFormSuccess('Leave request submitted!')
      setLeaveDate('')
      setStartDate('')
      setEndDate('')
      setIsHalfDay(false)
      setReason('')
      setTimeout(() => setFormSuccess(''), 3000)
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      setFormError(errObj.message || 'Failed to submit leave request.')
    }
  }

  const allowedMonthly = policy?.allowed_monthly_days ?? 0
  const used = usedDays ?? 0
  const remaining = Math.max(0, allowedMonthly - used)

  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      {/* Main Content */}
      <div style={{ flex: 1, minWidth: '300px' }}>
        {/* Stat Cards */}
        <div className="grid-3 mb-6">
          <div className="stat-card" id="stat-used">
            <div className="stat-card-label">Used This Month</div>
            <div className="stat-card-value">{used}</div>
            <div className="text-secondary" style={{ fontSize: '12px', marginTop: '2px' }}>days</div>
          </div>
          <div className="stat-card" id="stat-allowed">
            <div className="stat-card-label">Allowed Monthly</div>
            <div className="stat-card-value">{allowedMonthly}</div>
            <div className="text-secondary" style={{ fontSize: '12px', marginTop: '2px' }}>days</div>
          </div>
          <div className="stat-card" id="stat-remaining">
            <div className="stat-card-label">Remaining</div>
            <div className="stat-card-value" style={{ color: remaining > 0 ? 'var(--success)' : 'var(--danger)' }}>
              {remaining}
            </div>
            <div className="text-secondary" style={{ fontSize: '12px', marginTop: '2px' }}>days</div>
          </div>
        </div>

        {/* Leave History */}
        <div className="card">
          <h2 className="section-heading mb-4">Leave History</h2>
          {leavesLoading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : !leaves || leaves.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No leave requests yet"
              description="Submit your first leave request using the form."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" id="leave-history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Admin Note</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>
                        {leave.leave_date
                          ? format(new Date(leave.leave_date), 'MMM d, yyyy')
                          : `${format(new Date(leave.start_date!), 'MMM d')} – ${format(new Date(leave.end_date!), 'MMM d, yyyy')}`}
                      </td>
                      <td>
                        {leave.is_half_day
                          ? `Half Day (${leave.half_day_part})`
                          : leave.start_date
                          ? 'Date Range'
                          : 'Full Day'}
                      </td>
                      <td>
                        <span className="truncate" style={{ maxWidth: '200px', display: 'inline-block' }}>
                          {leave.reason || '—'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={leave.status} />
                      </td>
                      <td>
                        {leave.admin_comment ? (
                          <span className="italic text-secondary" style={{ fontSize: '13px' }}>
                            {leave.admin_comment}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {leave.status === 'pending' && (
                          <button
                            className="btn btn-icon btn-ghost text-danger"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to cancel this leave request?')) {
                                deleteLeave.mutate(leave.id)
                              }
                            }}
                            title="Cancel Request"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Apply Leave Panel */}
      <div style={{ width: '340px', flexShrink: 0 }}>
        <div className="card" style={{ position: 'sticky', top: '24px' }}>
          <h2 className="section-heading mb-4">Apply Leave</h2>

          <div className="tabs mb-4">
            <button
              className={`tab${mode === 'single' ? ' active' : ''}`}
              onClick={() => { setMode('single'); setIsHalfDay(false) }}
              type="button"
            >
              Single Day
            </button>
            <button
              className={`tab${mode === 'range' ? ' active' : ''}`}
              onClick={() => { setMode('range'); setIsHalfDay(false) }}
              type="button"
            >
              Date Range
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mode === 'single' ? (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="leave-date">Date</label>
                  <input
                    id="leave-date"
                    type="date"
                    className="form-input"
                    value={leaveDate}
                    onChange={(e) => setLeaveDate(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={isHalfDay}
                      onChange={(e) => setIsHalfDay(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                  <span style={{ fontSize: '14px' }}>Half Day?</span>
                </div>

                {isHalfDay && (
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="halfDayPart"
                        value="AM"
                        checked={halfDayPart === 'AM'}
                        onChange={() => setHalfDayPart('AM')}
                      />
                      AM (Morning)
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="halfDayPart"
                        value="PM"
                        checked={halfDayPart === 'PM'}
                        onChange={() => setHalfDayPart('PM')}
                      />
                      PM (Afternoon)
                    </label>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="start-date">Start Date</label>
                  <input
                    id="start-date"
                    type="date"
                    className="form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="end-date">End Date</label>
                  <input
                    id="end-date"
                    type="date"
                    className="form-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    required
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="leave-reason">Reason (optional)</label>
              <textarea
                id="leave-reason"
                className="form-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Personal appointment, family event, etc."
                style={{ resize: 'vertical' }}
              />
            </div>

            {formError && <div className="alert alert-error">{formError}</div>}
            {formSuccess && <div className="alert alert-success">{formSuccess}</div>}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={submitLeave.isPending}
              id="btn-submit-leave"
            >
              {submitLeave.isPending ? 'Submitting…' : 'Submit Leave Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
