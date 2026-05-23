import { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { useProfileContext } from '../../context/ProfileContext'
import {
  useAdminLeaveRequests,
  useAdminLeaveRealtime,
  useUpdateLeaveStatus,
} from '../../hooks/useLeaveRequests'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { SkeletonTable } from '../../components/shared/SkeletonTable'
import { EmptyState } from '../../components/shared/EmptyState'
import { getInitials } from '../../lib/utils'

type LeaveRow = {
  id: number
  user_id: string
  leave_date: string | null
  start_date: string | null
  end_date: string | null
  is_half_day: boolean
  half_day_part: string | null
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_comment: string | null
  created_at: string
  profiles: { full_name: string; employee_code: string | null } | null
}

export function AdminLeavesPage() {
  const profile = useProfileContext()
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const { data: leaves, isLoading } = useAdminLeaveRequests(statusFilter)
  const updateStatus = useUpdateLeaveStatus()

  // Realtime
  useAdminLeaveRealtime()

  // Expand state for inline approve/reject
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [actionType, setActionType] = useState<'approved' | 'rejected'>('approved')
  const [comment, setComment] = useState('')

  const handleAction = (id: number, type: 'approved' | 'rejected') => {
    if (expandedId === id && actionType === type) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      setActionType(type)
      setComment('')
    }
  }

  const confirmAction = async () => {
    if (!expandedId) return
    await updateStatus.mutateAsync({
      id: expandedId,
      status: actionType,
      admin_comment: comment,
      decided_by: profile.user_id,
    })
    setExpandedId(null)
    setComment('')
  }

  // Filter by search term
  const filteredLeaves = (leaves as LeaveRow[] | undefined)?.filter((leave) => {
    if (!searchTerm) return true
    const name = leave.profiles?.full_name?.toLowerCase() ?? ''
    return name.includes(searchTerm.toLowerCase())
  })

  return (
    <div>
      {/* Filter Bar */}
      <div className="flex gap-3 mb-6" style={{ flexWrap: 'wrap' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search employee..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '240px' }}
          id="search-employee"
        />
        <select
          className="form-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          id="filter-status"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Requests Table */}
      <div className="card">
        {isLoading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : !filteredLeaves || filteredLeaves.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No leave requests found"
            description="Leave requests from employees will appear here."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" id="admin-leave-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date / Range</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((leave) => (
                  <>
                    <tr key={leave.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'var(--accent-light)',
                              color: 'var(--accent)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(leave.profiles?.full_name ?? '?')}
                          </div>
                          <span>{leave.profiles?.full_name ?? 'Unknown'}</span>
                        </div>
                      </td>
                      <td>
                        {leave.leave_date
                          ? format(new Date(leave.leave_date), 'MMM d, yyyy')
                          : `${format(new Date(leave.start_date!), 'MMM d')} – ${format(new Date(leave.end_date!), 'MMM d, yyyy')}`}
                      </td>
                      <td>
                        {leave.is_half_day
                          ? `Half ${leave.half_day_part}`
                          : leave.start_date
                          ? 'Range'
                          : 'Full Day'}
                      </td>
                      <td>
                        <span className="truncate" style={{ maxWidth: '150px', display: 'inline-block' }}>
                          {leave.reason || '—'}
                        </span>
                      </td>
                      <td className="text-secondary" style={{ fontSize: '13px' }}>
                        {formatDistanceToNow(new Date(leave.created_at), { addSuffix: true })}
                      </td>
                      <td>
                        <StatusBadge status={leave.status} />
                      </td>
                      <td>
                        {leave.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleAction(leave.id, 'approved')}
                              id={`btn-approve-${leave.id}`}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleAction(leave.id, 'rejected')}
                              id={`btn-reject-${leave.id}`}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-secondary" style={{ fontSize: '13px' }}>
                            {leave.admin_comment ? (
                              <span className="italic">{leave.admin_comment}</span>
                            ) : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                    {expandedId === leave.id && (
                      <tr className="expand-row" key={`expand-${leave.id}`}>
                        <td colSpan={7}>
                          <div className="flex gap-3 items-center" style={{ maxWidth: '600px' }}>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Comment (optional)"
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              style={{ flex: 1 }}
                              id="action-comment"
                            />
                            <button
                              className={`btn btn-sm ${actionType === 'approved' ? 'btn-success' : 'btn-danger'}`}
                              onClick={confirmAction}
                              disabled={updateStatus.isPending}
                              id="btn-confirm-action"
                            >
                              {updateStatus.isPending
                                ? 'Saving…'
                                : actionType === 'approved'
                                ? '✓ Confirm Approval'
                                : '✗ Confirm Rejection'}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setExpandedId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
